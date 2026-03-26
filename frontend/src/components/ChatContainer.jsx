import { useEffect, useRef, useState } from "react";
import { useConversationStore } from "../store/useConversationStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import DOMPurify from "dompurify";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import ForwardMessageModal from "./ForwardMessageModal";
import { formatMessageTime } from "../lib/utils";
import { MoreVertical, Smile, Reply, Trash2, Edit3, Check, X, Forward } from "lucide-react";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "👎"];

const ChatContainer = () => {
  const {
    currentConversation,
    messages,
    fetchMessages,
    isLoadingMessages,
    addReaction,
    editMessage,
    deleteMessage,
    markAsSeen,
    typingUsers,
    forwardMessage,
  } = useConversationStore();

  const { authUser, onlineUsers } = useAuthStore();
  const { checkBlockedStatus } = useFriendStore();
  const messageEndRef = useRef(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [showReactions, setShowReactions] = useState(null);
  const [showOptions, setShowOptions] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [canSendMessage, setCanSendMessage] = useState(true);
  const [blockedStatus, setBlockedStatus] = useState({ isBlocked: false, amIBlocked: false });
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);

  useEffect(() => {
    const checkCanSend = async () => {
      const otherUserId = getOtherUserId();
      if (otherUserId && currentConversation?.type !== 'group') {
        const status = await checkBlockedStatus(otherUserId);
        setBlockedStatus(status);
        setCanSendMessage(!status.amIBlocked && !status.isBlocked);
      } else {
        setCanSendMessage(true);
        setBlockedStatus({ isBlocked: false, amIBlocked: false });
      }
    };
    checkCanSend();
  }, [currentConversation]);

  useEffect(() => {
    if (currentConversation?._id) {
      fetchMessages(currentConversation._id);
      markAsSeen(currentConversation._id);
    }
  }, [currentConversation?._id]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleReaction = async (messageId, emoji) => {
    await addReaction(messageId, emoji);
    setShowReactions(null);
  };

  const handleEdit = (message) => {
    setEditingMessage(message._id);
    setEditText(message.text);
  };

  const handleSaveEdit = async () => {
    if (editText.trim()) {
      await editMessage(editingMessage, editText);
    }
    setEditingMessage(null);
    setEditText("");
  };

  const handleDelete = async (messageId, deleteForEveryone) => {
    await deleteMessage(messageId, deleteForEveryone);
    setShowOptions(null);
  };

  const getOtherParticipants = () => {
    if (!currentConversation) return [];
    return currentConversation.participants?.filter(p => p._id !== authUser._id) || [];
  };

  const getConversationTitle = () => {
    if (currentConversation?.type === 'group') return currentConversation.name;
    const other = getOtherParticipants()[0];
    return other?.fullName || 'Unknown';
  };

  const getConversationAvatar = () => {
    if (currentConversation?.type === 'group') return currentConversation.avatar;
    const other = getOtherParticipants()[0];
    return other?.profilePic || "/avatar.png";
  };

  const isUserOnline = () => {
    if (currentConversation?.type === 'group') return false;
    const other = getOtherParticipants()[0];
    return other && onlineUsers.includes(other._id);
  };

  const getOtherUserId = () => {
    if (currentConversation?.type === 'direct') {
      return getOtherParticipants()[0]?._id;
    }
    return null;
  };

  const TypingIndicator = () => {
    if (!currentConversation || currentConversation.type === 'direct') return null;
    const typingNames = typingUsers
      .filter(id => id !== authUser._id)
      .map(id => currentConversation.participants?.find(p => p._id === id)?.fullName)
      .filter(Boolean);

    if (typingNames.length === 0) return null;
    return (
      <div className="text-xs text-base-content/50 px-4 py-2">
        {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
      </div>
    );
  };

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader conversation={currentConversation} />
        <MessageSkeleton />
        <MessageInput conversation={currentConversation} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChatHeader 
        conversation={currentConversation} 
        title={getConversationTitle()}
        avatar={getConversationAvatar()}
        isOnline={isUserOnline()}
        otherUserId={getOtherUserId()}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isMe = message.senderId?._id === authUser._id;
          const senderName = message.senderId?.fullName;
          const isDeleted = message.isDeleted;
          const canDelete = isMe && Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000;

          return (
            <div
              key={message._id}
              className={`chat ${isMe ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={isMe ? (authUser.profilePic || "/avatar.png") : (message.senderId?.profilePic || "/avatar.png")}
                    alt="profile pic"
                  />
                </div>
              </div>

              {currentConversation?.type === 'group' && !isMe && (
                <div className="chat-header mb-1">
                  <span className="text-xs font-medium">{senderName}</span>
                </div>
              )}

              <div className="chat-bubble flex flex-col relative">
                {message.replyTo && !message.replyTo.isDeleted && message.replyTo && (
                  <div className="border-l-2 border-primary pl-2 mb-1 text-xs opacity-70">
                    <p className="font-medium">{message.replyTo?.senderId?.fullName || 'Unknown'}</p>
                    <p className="truncate">{message.replyTo?.text || '[Image]'}</p>
                  </div>
                )}

                {message.image && !isDeleted && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer"
                    onClick={() => window.open(message.image, '_blank')}
                  />
                )}

                {message.voiceMessage && !isDeleted && (
                  <audio controls className="max-w-[200px] h-10 my-2">
                    <source src={message.voiceMessage} />
                  </audio>
                )}

                {message.file && !isDeleted && (
                  <a
                    href={message.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-base-200 rounded-md mb-2"
                  >
                    <span className="text-sm">📎 {message.file.name}</span>
                  </a>
                )}

                {editingMessage === message._id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="input input-sm input-bordered"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <button onClick={handleSaveEdit} className="btn btn-sm btn-primary btn-circle">
                      <Check className="size-3" />
                    </button>
                    <button onClick={() => setEditingMessage(null)} className="btn btn-sm btn-ghost btn-circle">
                      <X className="size-3" />
                    </button>
                  </div>
                ) : isDeleted ? (
                  <p className="italic opacity-50">This message was deleted</p>
                ) : (
                  <>
                    <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.text) }} />
                    {message.edited && (
                      <span className="text-xs opacity-50">(edited)</span>
                    )}
                  </>
                )}

                <div className="flex items-center gap-1 mt-1">
                  {message.reactions?.length > 0 && (
                    <div className="flex gap-0.5">
                      {message.reactions.reduce((acc, r) => {
                        const existing = acc.find(e => e.emoji === r.emoji);
                        if (existing) existing.users.push(r.user?.fullName);
                        else acc.push({ emoji: r.emoji, users: [r.user?.fullName] });
                        return acc;
                      }, []).map((r, i) => (
                        <span key={i} className="text-xs bg-base-200 px-1 rounded" title={r.users.join(', ')}>
                          {r.emoji}
                        </span>
                      ))}
                    </div>
                  )}

                  <span className="text-xs opacity-50 ml-auto">
                    {formatMessageTime(message.createdAt)}
                    {isMe && message.status === 'seen' && ' ✓✓'}
                    {isMe && message.status === 'delivered' && ' ✓'}
                  </span>
                </div>

                <div className="absolute -bottom-2 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => setShowReactions(showReactions === message._id ? null : message._id)}
                  >
                    <Smile className="size-3" />
                  </button>
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => setReplyingTo(replyingTo?._id === message._id ? null : message)}
                  >
                    <Reply className="size-3" />
                  </button>
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => { setMessageToForward(message); setShowForwardModal(true); }}
                    title="Forward"
                  >
                    <Forward className="size-3" />
                  </button>
                  {isMe && (
                    <div className="dropdown dropdown-end">
                      <button
                        tabIndex={0}
                        className="btn btn-xs btn-ghost"
                        onClick={() => setShowOptions(showOptions === message._id ? null : message._id)}
                      >
                        <MoreVertical className="size-3" />
                      </button>
                      {showOptions === message._id && (
                        <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow bg-base-200 rounded-box w-32">
                          {canDelete && (
                            <>
                              <li>
                                <button onClick={() => handleEdit(message)}>
                                  <Edit3 className="size-3" /> Edit
                                </button>
                              </li>
                              <li>
                                <button onClick={() => handleDelete(message._id, true)}>
                                  <Trash2 className="size-3" /> Delete
                                </button>
                              </li>
                            </>
                          )}
                          <li>
                            <button onClick={() => handleDelete(message._id, false)}>
                              Delete for me
                            </button>
                          </li>
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {showReactions === message._id && (
                  <div className="absolute -top-8 left-0 flex gap-1 bg-base-200 p-1 rounded-full shadow-lg">
                    {REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        className="hover:scale-125 transition-transform"
                        onClick={() => handleReaction(message._id, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <TypingIndicator />
        <div ref={messageEndRef} />
      </div>

      {canSendMessage ? (
        <MessageInput 
          conversation={currentConversation} 
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
        />
      ) : (
        <div className="p-4 text-center text-base-content/50 bg-base-200">
          {blockedStatus.isBlocked 
            ? "You have blocked this user" 
            : "You cannot send messages to this user"}
        </div>
      )}

      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={() => { setShowForwardModal(false); setMessageToForward(null); }}
        message={messageToForward}
        onForward={forwardMessage}
      />
    </div>
  );
};

export default ChatContainer;