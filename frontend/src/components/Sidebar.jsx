import { useEffect, useState } from "react";
import { useConversationStore } from "../store/useConversationStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Plus, Group, Search, BellOff } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

const Sidebar = () => {
  const { 
    conversations, 
    fetchConversations, 
    setCurrentConversation, 
    currentConversation,
    isLoading 
  } = useConversationStore();
  
  const { onlineUsers } = useAuthStore();
  const { friends, fetchFriends } = useFriendStore();
  const { user } = useAuthStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchConversations();
    fetchFriends();
  }, []);

  const currentUserId = user?._id;

  const filteredConversations = conversations.filter(conv => {
    if (searchQuery) {
      const name = conv.type === 'group' ? conv.name : conv.participants?.find(p => p._id !== currentUserId)?.fullName || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const getConversationName = (conv) => {
    if (conv.type === 'group') return conv.name;
    const otherUser = conv.participants?.find(p => p._id !== useAuthStore.getState().authUser?._id);
    return otherUser?.fullName || 'Unknown';
  };

  const getConversationAvatar = (conv) => {
    if (conv.type === 'group') return conv.avatar;
    const otherUser = conv.participants?.find(p => p._id !== useAuthStore.getState().authUser?._id);
    return otherUser?.profilePic || "/avatar.png";
  };

  const isUserOnline = (conv) => {
    if (conv.type === 'group') return false;
    const otherUser = conv.participants?.find(p => p._id !== useAuthStore.getState().authUser?._id);
    return otherUser && onlineUsers.includes(otherUser._id);
  };

  if (isLoading) return <SidebarSkeleton />;

  return (
    <>
      <aside className="h-full w-20 lg:w-80 border-r border-base-300 flex flex-col transition-all duration-200">
        <div className="border-b border-base-300 w-full p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="size-5" />
              <span className="font-medium hidden lg:block">Chats</span>
            </div>
            <div className="flex gap-1">
              <button
                className="btn btn-sm btn-ghost btn-circle"
                onClick={() => setShowCreateGroup(true)}
                title="Create Group"
              >
                <Group className="size-4" />
              </button>
            </div>
          </div>

          <div className="relative hidden lg:block mb-3">
            <input
              type="text"
              placeholder="Search chats..."
              className="input input-sm input-bordered w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-base-content/50" />
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
            </label>
          </div>
        </div>

        <div className="overflow-y-auto w-full py-2 flex-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center text-base-content/50 py-8">
              <p>No conversations yet</p>
              <p className="text-sm">Start a chat or create a group</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => setCurrentConversation(conv)}
                className={`
                  w-full p-3 flex items-center gap-3
                  hover:bg-base-300 transition-colors
                  ${currentConversation?._id === conv._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                `}
              >
                <div className="relative mx-auto lg:mx-0 flex-shrink-0">
                  {conv.type === 'group' ? (
                    <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Group className="size-6 text-primary" />
                    </div>
                  ) : (
                    <>
                      <img
                        src={getConversationAvatar(conv)}
                        alt={getConversationName(conv)}
                        className="size-12 object-cover rounded-full"
                      />
                      {isUserOnline(conv) && (
                        <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100" />
                      )}
                    </>
                  )}
                </div>

                <div className="hidden lg:block text-left min-w-0 flex-1">
                  <div className="font-medium truncate flex items-center gap-2">
                    {getConversationName(conv)}
                    {conv.type === 'group' && (
                      <span className="badge badge-xs badge-primary">Group</span>
                    )}
                    {conv.mutedBy?.some(m => m.user === currentUserId) && (
                      <BellOff className="size-3 text-base-content/50" />
                    )}
                  </div>
                  <div className="text-sm text-base-content/60 truncate">
                    {conv.lastMessage?.text || (conv.type === 'group' ? 'Group chat' : 'No messages yet')}
                  </div>
                </div>

                {conv.unreadCount > 0 && (
                  <div className="hidden lg:block">
                    <span className="badge badge-primary badge-sm">{conv.unreadCount}</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={(group) => {
          fetchConversations();
          setCurrentConversation(group);
        }}
      />
    </>
  );
};
export default Sidebar;