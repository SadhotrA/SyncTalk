import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useFriendStore = create((set, get) => ({
  friends: [],
  friendRequests: [],
  searchResults: [],
  blockedUsers: [],
  isLoading: false,
  isSearching: false,

  searchUsers: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true });
    try {
      const res = await axiosInstance.get(`/friends/search?query=${query}`);
      set({ searchResults: res.data });
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error(error.response?.data?.message || "Failed to search users");
    } finally {
      set({ isSearching: false });
    }
  },

  sendFriendRequest: async (userId) => {
    try {
      await axiosInstance.post(`/friends/request/${userId}`);
      toast.success("Friend request sent");
      const { searchResults } = get();
      set({
        searchResults: searchResults.map(u => 
          u._id === userId ? { ...u, requestStatus: 'pending', requestSent: true } : u
        )
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send friend request");
    }
  },

  cancelFriendRequest: async (userId) => {
    try {
      await axiosInstance.delete(`/friends/request/${userId}`);
      toast.success("Friend request cancelled");
      const { searchResults } = get();
      set({
        searchResults: searchResults.map(u => 
          u._id === userId ? { ...u, requestStatus: null, requestSent: false } : u
        )
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel friend request");
    }
  },

  acceptFriendRequest: async (requestId) => {
    try {
      await axiosInstance.post(`/friends/accept/${requestId}`);
      toast.success("Friend request accepted");
      get().fetchFriendRequests();
      get().fetchFriends();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept friend request");
    }
  },

  rejectFriendRequest: async (requestId) => {
    try {
      await axiosInstance.post(`/friends/reject/${requestId}`);
      toast.success("Friend request rejected");
      get().fetchFriendRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject friend request");
    }
  },

  fetchFriendRequests: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/friends/requests");
      set({ friendRequests: res.data });
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFriends: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/friends");
      set({ friends: res.data });
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  removeFriend: async (friendId) => {
    try {
      await axiosInstance.delete(`/friends/${friendId}`);
      toast.success("Friend removed");
      const { friends } = get();
      set({ friends: friends.filter(f => f._id !== friendId) });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove friend");
    }
  },

  blockUser: async (userId) => {
    try {
      await axiosInstance.post(`/friends/block/${userId}`);
      toast.success("User blocked");
      get().fetchFriends();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to block user");
    }
  },

  unblockUser: async (userId) => {
    try {
      await axiosInstance.delete(`/friends/block/${userId}`);
      toast.success("User unblocked");
      get().fetchBlockedUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to unblock user");
    }
  },

  fetchBlockedUsers: async () => {
    try {
      const res = await axiosInstance.get("/friends/blocked");
      set({ blockedUsers: res.data });
    } catch (error) {
      console.error("Error fetching blocked users:", error);
    }
  },

  clearSearch: () => set({ searchResults: [] }),

  checkBlockedStatus: async (userId) => {
    try {
      const res = await axiosInstance.get(`/friends/blocked/${userId}`);
      return res.data;
    } catch (error) {
      console.error("Error checking blocked status:", error);
      return { isBlocked: false, amIBlocked: false };
    }
  },
}));