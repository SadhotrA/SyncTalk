import { useState, useEffect } from "react";
import { X, Phone, Video, MoreHorizontal, Trash2, Ban, Info, UserCheck, Bell, BellOff } from "lucide-react";
import { useConversationStore } from "../store/useConversationStore";
import { useFriendStore } from "../store/useFriendStore";
import { useAuthStore } from "../store/useAuthStore";
import GroupInfoModal from "./GroupInfoModal";
import toast from "react-hot-toast";

const ChatHeader = ({ conversation, title, avatar, isOnline, otherUserId }) => {
  const { setCurrentConversation, clearChat, toggleMuteConversation } = useConversationStore();
  const { blockUser, unblockUser, blockedUsers, fetchBlockedUsers, checkBlockedStatus } = useFriendStore();
  const { user } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [blockedStatus, setBlockedStatus] = useState({ iBlocked: false, theyBlockedMe: false });
  const [isLoading, setIsLoading] = useState(true);
  const [showMuteOptions, setShowMuteOptions] = useState(false);

  const isGroup = conversation?.type === 'group';
  const currentUserId = user?._id;
  const isMuted = conversation?.mutedBy?.some(m => m.user === currentUserId);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      if (otherUserId) {
        setIsLoading(true);
        try {
          const status = await checkBlockedStatus(otherUserId);
          setBlockedStatus({
            iBlocked: status.isBlocked,
            theyBlockedMe: status.amIBlocked
          });
        } catch (error) {
          console.error("Error checking blocked status:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    checkStatus();
  }, [otherUserId]);

  const handleClose = () => {
    setCurrentConversation(null);
  };

  const handleCall = () => {
    if (blockedStatus.theyBlockedMe) {
      toast.error("You cannot call this user");
      return;
    }
    console.log("Starting call with", otherUserId);
  };

  const handleClearChat = async () => {
    if (confirm("Are you sure you want to clear this chat?")) {
      await clearChat(conversation._id);
      toast.success("Chat cleared");
    }
    setShowMenu(false);
  };

  const handleToggleMute = async (duration) => {
    await toggleMuteConversation(conversation._id, duration);
    setShowMenu(false);
    setShowMuteOptions(false);
  };

  const handleBlock = async () => {
    if (otherUserId) {
      if (confirm("Are you sure you want to block this user?")) {
        await blockUser(otherUserId);
        setCurrentConversation(null);
        toast.success("User blocked");
      }
    }
    setShowMenu(false);
  };

  const handleUnblock = async () => {
    if (otherUserId) {
      await unblockUser(otherUserId);
      toast.success("User unblocked");
      setBlockedStatus({ iBlocked: false, theyBlockedMe: false });
    }
    setShowMenu(false);
  };

  const canInteract = !blockedStatus.iBlocked && !blockedStatus.theyBlockedMe;
  const isOtherUserOnline = isOnline && !blockedStatus.theyBlockedMe;

  const getStatusText = () => {
    if (isGroup) return `${conversation?.participants?.length || 0} members`;
    if (blockedStatus.theyBlockedMe) return "You are blocked";
    if (blockedStatus.iBlocked) return "Blocked";
    return isOnline ? "Online" : "Offline";
  };

  if (isLoading) {
    return (
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="size-10 rounded-full skeleton" />
            </div>
            <div>
              <div className="skeleton h-4 w-24 mb-1" />
              <div className="skeleton h-3 w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="size-10 rounded-full relative">
                {isGroup ? (
                  <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {title?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <img src={avatar || "/avatar.png"} alt={title} />
                )}
                {!isGroup && isOtherUserOnline && (
                  <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full border-2 border-base-100" />
                )}
              </div>
            </div>

            <div className="cursor-pointer" onClick={() => isGroup && setShowGroupInfo(true)}>
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-base-content/70">
                {getStatusText()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!isGroup && otherUserId && canInteract && (
              <>
                <button className="btn btn-sm btn-ghost btn-circle" onClick={handleCall}>
                  <Phone className="size-4" />
                </button>
                <button className="btn btn-sm btn-ghost btn-circle" onClick={handleCall}>
                  <Video className="size-4" />
                </button>
              </>
            )}
          
            <div className="dropdown dropdown-end">
              <button 
                tabIndex={0} 
                className="btn btn-sm btn-ghost btn-circle"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreHorizontal className="size-4" />
              </button>
              {showMenu && (
                <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow bg-base-200 rounded-box w-52">
                  <li className="relative">
                    <button onClick={() => setShowMuteOptions(!showMuteOptions)}>
                      {isMuted ? <BellOff className="size-4" /> : <Bell className="size-4" />}
                      {isMuted ? "Unmute" : "Mute"}
                    </button>
                    {showMuteOptions && (
                      <ul className="absolute left-full top-0 ml-1 menu p-2 shadow bg-base-300 rounded-box w-36">
                        <li><button onClick={() => handleToggleMute("1h")}>1 hour</button></li>
                        <li><button onClick={() => handleToggleMute("24h")}>24 hours</button></li>
                        <li><button onClick={() => handleToggleMute("7d")}>7 days</button></li>
                        <li><button onClick={() => handleToggleMute(null)}>Unmute</button></li>
                      </ul>
                    )}
                  </li>
                  {isGroup && (
                    <li>
                      <button onClick={() => { setShowGroupInfo(true); setShowMenu(false); }}>
                        <Info className="size-4" /> Group Info
                      </button>
                    </li>
                  )}
                  {!isGroup && otherUserId && !blockedStatus.theyBlockedMe && !blockedStatus.iBlocked && (
                    <li>
                      <button onClick={handleBlock}>
                        <Ban className="size-4" /> Block User
                      </button>
                    </li>
                  )}
                  {!isGroup && otherUserId && blockedStatus.iBlocked && (
                    <li>
                      <button onClick={handleUnblock}>
                        <UserCheck className="size-4" /> Unblock User
                      </button>
                    </li>
                  )}
                  <li>
                    <button onClick={handleClearChat}>
                      <Trash2 className="size-4" /> Clear Chat
                    </button>
                  </li>
                </ul>
              )}
            </div>

            <button onClick={handleClose}>
              <X />
            </button>
          </div>
        </div>
      </div>

      {isGroup && (
        <GroupInfoModal 
          isOpen={showGroupInfo} 
          onClose={() => setShowGroupInfo(false)} 
          conversation={conversation} 
        />
      )}
    </>
  );
};

export default ChatHeader;