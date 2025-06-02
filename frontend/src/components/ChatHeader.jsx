import { MoreVertical, Phone, Video, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useState } from "react";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);

  const isOnline = onlineUsers.includes(selectedUser._id);
  const lastSeen = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar with online indicator */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              {isOnline && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100" />
              )}
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <span className="size-2 bg-green-500 rounded-full animate-pulse" />
                  Online
                </span>
              ) : (
                <span>Last seen at {lastSeen}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm btn-circle">
            <Phone className="size-5" />
          </button>
          <button className="btn btn-ghost btn-sm btn-circle">
            <Video className="size-5" />
          </button>
          
          {/* More options menu */}
          <div className="relative">
            <button 
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="size-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-base-200 rounded-lg shadow-lg py-1 z-10">
                <button className="w-full px-4 py-2 text-left hover:bg-base-300 text-sm">
                  View Profile
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-base-300 text-sm">
                  Mute Notifications
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-base-300 text-sm text-error">
                  Block User
                </button>
              </div>
            )}
          </div>

          {/* Close chat button */}
          <button 
            onClick={() => setSelectedUser(null)}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChatHeader;