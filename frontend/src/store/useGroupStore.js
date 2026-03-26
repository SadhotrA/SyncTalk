import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useGroupStore = create((set, get) => ({
  groups: [],
  currentGroup: null,
  isLoading: false,

  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/groups/create-group", groupData);
      toast.success("Group created successfully");
      const { groups } = get();
      set({ groups: [res.data, ...groups] });
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      return null;
    }
  },

  fetchGroups: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  getGroupInfo: async (conversationId) => {
    try {
      const res = await axiosInstance.get(`/groups/${conversationId}/info`);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to get group info");
      return null;
    }
  },

  addMembers: async (conversationId, memberIds) => {
    try {
      const res = await axiosInstance.put(`/groups/${conversationId}/add-members`, { memberIds });
      toast.success("Members added");
      set({ currentGroup: res.data.conversation });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
    }
  },

  removeMember: async (conversationId, memberId) => {
    try {
      await axiosInstance.delete(`/groups/${conversationId}/members/${memberId}`);
      toast.success("Member removed");
      get().fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  },

  leaveGroup: async (conversationId) => {
    try {
      await axiosInstance.delete(`/groups/${conversationId}/leave`);
      toast.success("Left the group");
      const { groups } = get();
      set({ groups: groups.filter(g => g._id !== conversationId) });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave group");
    }
  },

  updateGroup: async (conversationId, updateData) => {
    try {
      const res = await axiosInstance.put(`/groups/${conversationId}`, updateData);
      toast.success("Group updated");
      const { groups } = get();
      set({
        groups: groups.map(g => 
          g._id === conversationId ? res.data : g
        )
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
    }
  },

  makeAdmin: async (conversationId, memberId) => {
    try {
      await axiosInstance.put(`/groups/${conversationId}/make-admin/${memberId}`);
      toast.success("User promoted to admin");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to promote user");
    }
  },

  setCurrentGroup: (group) => set({ currentGroup: group }),
}));