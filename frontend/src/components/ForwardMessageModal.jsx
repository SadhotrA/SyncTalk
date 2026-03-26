import { useState, useEffect } from "react";
import { useConversationStore } from "../store/useConversationStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { X, Send, Search, Group, User } from "lucide-react";

const ForwardMessageModal = ({ isOpen, onClose, message, onForward }) => {
  const { conversations, fetchConversations } = useConversationStore();
  const { user } = useAuthStore();
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  const currentUserId = user?._id;

  const filteredConversations = conversations.filter(conv => {
    if (conv._id === message?.conversationId?._id || conv._id === message?.conversationId) return false;
    const name = conv.type === 'group' ? conv.name : conv.participants?.find(p => p._id !== currentUserId)?.fullName || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleConversation = (convId) => {
    setSelectedConversations(prev =>
      prev.includes(convId)
        ? prev.filter(id => id !== convId)
        : [...prev, convId]
    );
  };

  const handleSend = async () => {
    if (selectedConversations.length === 0) {
      toast.error("Select at least one conversation");
      return;
    }

    setIsSending(true);
    try {
      await onForward(message._id, selectedConversations);
      toast.success("Message forwarded");
      onClose();
    } catch (error) {
      toast.error("Failed to forward message");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-100 p-6 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Forward Message</h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost">
            <X className="size-5" />
          </button>
        </div>

        {message && (
          <div className="bg-base-200 p-3 rounded-lg mb-4">
            <p className="text-sm line-clamp-2">
              {message.text || (message.image ? "[Image]" : "Forwarded message")}
            </p>
          </div>
        )}

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search conversations..."
            className="input input-bordered w-full pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-base-content/50" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[300px]">
          {filteredConversations.length === 0 ? (
            <p className="text-center text-base-content/60 py-4">No conversations found</p>
          ) : (
            filteredConversations.map((conv) => {
              const name = conv.type === 'group' ? conv.name : conv.participants?.find(p => p._id !== currentUserId)?.fullName || 'Unknown';
              const avatar = conv.type === 'group' ? conv.avatar : conv.participants?.find(p => p._id !== currentUserId)?.profilePic;
              
              return (
                <label
                  key={conv._id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-base-200 ${
                    selectedConversations.includes(conv._id) ? "bg-primary/10" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedConversations.includes(conv._id)}
                    onChange={() => toggleConversation(conv._id)}
                  />
                  <div className="avatar">
                    <div className="size-8 rounded-full">
                      {conv.type === 'group' ? (
                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Group className="size-4 text-primary" />
                        </div>
                      ) : (
                        <img src={avatar || "/avatar.png"} alt={name} />
                      )}
                    </div>
                  </div>
                  <span className="flex-1 truncate">{name}</span>
                  {conv.type === 'group' && <span className="badge badge-xs badge-primary">Group</span>}
                </label>
              );
            })
          )}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-base-300">
          <span className="text-sm text-base-content/60">
            {selectedConversations.length} selected
          </span>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={isSending || selectedConversations.length === 0}
            >
              <Send className="size-4" />
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;