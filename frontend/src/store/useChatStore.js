import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSendingMessage: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        const res = await axiosInstance.get("/messages/users");
        set({ users: res.data });
        break;
      } catch (error) {
        console.error("Error fetching users:", error);
        retries++;
        if (retries === MAX_RETRIES) {
          toast.error(error.response?.data?.message || "Failed to fetch users");
        } else {
          await sleep(RETRY_DELAY);
        }
      }
    }
    set({ isUsersLoading: false });
  },

  getMessages: async (userId) => {
    if (!userId) return;
    
    set({ isMessagesLoading: true });
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        const res = await axiosInstance.get(`/messages/chat/${userId}`);
        set({ messages: res.data });
        break;
      } catch (error) {
        console.error("Error fetching messages:", error);
        retries++;
        if (retries === MAX_RETRIES) {
          toast.error(error.response?.data?.message || "Failed to fetch messages");
        } else {
          await sleep(RETRY_DELAY);
        }
      }
    }
    set({ isMessagesLoading: false });
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    
    if (!selectedUser?._id) {
      toast.error("No user selected");
      return;
    }

    if (!messageData.text && !messageData.image) {
      toast.error("Message content is required");
      return;
    }

    set({ isSendingMessage: true });
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
        set({ 
          messages: [...messages, res.data],
          isSendingMessage: false 
        });
        break;
      } catch (error) {
        console.error("Error sending message:", error);
        retries++;
        if (retries === MAX_RETRIES) {
          toast.error(error.response?.data?.message || "Failed to send message");
          set({ isSendingMessage: false });
        } else {
          await sleep(RETRY_DELAY);
        }
      }
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket?.connected) {
      console.warn("Socket not connected");
      return;
    }

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket?.connected) {
      socket.off("newMessage");
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));