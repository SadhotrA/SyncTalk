import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useConversationStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isLoadingMessages: false,
  isSending: false,
  typingUsers: [],

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/messages/conversations");
      set({ conversations: res.data });
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  getOrCreateConversation: async (userId) => {
    try {
      const res = await axiosInstance.post(`/messages/conversation/${userId}`);
      const { conversations } = get();
      const exists = conversations.find(c => c._id === res.data._id);
      if (!exists) {
        set({ conversations: [res.data, ...conversations] });
      }
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start conversation");
      return null;
    }
  },

  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),

  fetchMessages: async (conversationId) => {
    if (!conversationId) return;
    set({ isLoadingMessages: true });
    try {
      const res = await axiosInstance.get(`/messages/${conversationId}`);
      set({ messages: res.data });
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (messageData) => {
    const { currentConversation, messages } = get();
    if (!currentConversation?._id) {
      toast.error("No conversation selected");
      return;
    }

    set({ isSending: true });
    try {
      const res = await axiosInstance.post(`/messages/${currentConversation._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      set({ isSending: false });
    }
  },

  addReaction: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.put(`/messages/reaction/${messageId}`, { emoji });
      const { messages } = get();
      set({
        messages: messages.map(m => 
          m._id === messageId ? { ...m, reactions: res.data } : m
        )
      });
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { text });
      const { messages } = get();
      set({
        messages: messages.map(m => 
          m._id === messageId ? res.data : m
        )
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  deleteMessage: async (messageId, deleteForEveryone = false) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`, { 
        data: { deleteForEveryone } 
      });
      const { messages } = get();
      set({
        messages: messages.map(m => 
          m._id === messageId ? { ...m, isDeleted: true, text: "" } : m
        )
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  markAsSeen: async (conversationId) => {
    try {
      await axiosInstance.put(`/messages/seen/${conversationId}`);
    } catch (error) {
      console.error("Error marking as seen:", error);
    }
  },

  searchMessages: async (conversationId, query) => {
    try {
      const res = await axiosInstance.get(`/messages/search/${conversationId}?query=${query}`);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to search messages");
      return [];
    }
  },

  getMedia: async (conversationId) => {
    try {
      const res = await axiosInstance.get(`/messages/media/${conversationId}`);
      return res.data;
    } catch (error) {
      console.error("Error fetching media:", error);
      return [];
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", ({ message, conversationId }) => {
      const { currentConversation, messages } = get();
      if (currentConversation?._id === conversationId) {
        set({ messages: [...messages, message] });
      }
      get().fetchConversations();
    });

    socket.on("messageReaction", ({ messageId, reactions }) => {
      const { messages } = get();
      set({
        messages: messages.map(m => 
          m._id === messageId ? { ...m, reactions } : m
        )
      });
    });

    socket.on("messageEdited", (editedMessage) => {
      const { messages } = get();
      set({
        messages: messages.map(m => 
          m._id === editedMessage._id ? editedMessage : m
        )
      });
    });

    socket.on("messageDeleted", ({ messageId }) => {
      const { messages } = get();
      set({
        messages: messages.map(m => 
          m._id === messageId ? { ...m, isDeleted: true, text: "" } : m
        )
      });
    });

    socket.on("userTyping", ({ conversationId, userId }) => {
      const { currentConversation, typingUsers } = get();
      if (currentConversation?._id === conversationId && !typingUsers.includes(userId)) {
        set({ typingUsers: [...typingUsers, userId] });
      }
    });

    socket.on("userStoppedTyping", ({ conversationId, userId }) => {
      const { currentConversation, typingUsers } = get();
      if (currentConversation?._id === conversationId) {
        set({ typingUsers: typingUsers.filter(id => id !== userId) });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messageReaction");
      socket.off("messageEdited");
      socket.off("messageDeleted");
      socket.off("userTyping");
      socket.off("userStoppedTyping");
    }
  },

  clearMessages: () => set({ messages: [], currentConversation: null }),

  clearChat: async (conversationId) => {
    try {
      await axiosInstance.delete(`/messages/clear/${conversationId}`);
      set({ messages: [] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clear chat");
    }
  },

  toggleMuteConversation: async (conversationId, duration) => {
    try {
      const res = await axiosInstance.put(`/messages/mute/${conversationId}`, { duration });
      const { conversations } = get();
      const isMuted = res.data.muted;
      const currentUserId = useAuthStore.getState().user?._id;
      set({
        conversations: conversations.map(c => {
          if (c._id === conversationId) {
            let mutedBy = c.mutedBy || [];
            if (isMuted) {
              mutedBy = [...mutedBy, { user: currentUserId, until: res.data.until }];
            } else {
              mutedBy = mutedBy.filter(m => m.user !== currentUserId);
            }
            return { ...c, mutedBy };
          }
          return c;
        })
      });
      if (get().currentConversation?._id === conversationId) {
        const conv = get().currentConversation;
        let mutedBy = conv.mutedBy || [];
        if (isMuted) {
          mutedBy = [...mutedBy, { user: currentUserId, until: res.data.until }];
        } else {
          mutedBy = mutedBy.filter(m => m.user !== currentUserId);
        }
        set({ currentConversation: { ...conv, mutedBy } });
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  },

  forwardMessage: async (messageId, conversationIds) => {
    try {
      const res = await axiosInstance.post(`/messages/forward/${messageId}`, { conversationIds });
      get().fetchConversations();
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to forward message");
      return [];
    }
  },
}));