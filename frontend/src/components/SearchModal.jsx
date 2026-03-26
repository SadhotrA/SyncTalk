import { useState, useEffect, useRef } from "react";
import { useConversationStore } from "../store/useConversationStore";
import { Search, X, FileImage, File } from "lucide-react";

const SearchModal = ({ isOpen, onClose, conversationId }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [media, setMedia] = useState([]);
  const [activeTab, setActiveTab] = useState("messages");
  const [isSearching, setIsSearching] = useState(false);
  
  const { searchMessages, getMedia } = useConversationStore();
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen && conversationId) {
      loadMedia();
    }
  }, [isOpen, conversationId]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length >= 2 && conversationId) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        const messages = await searchMessages(conversationId, query);
        setResults(messages);
        setIsSearching(false);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, conversationId]);

  const loadMedia = async () => {
    if (conversationId) {
      const mediaData = await getMedia(conversationId);
      setMedia(mediaData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-base-100 w-full max-w-lg rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/50" />
              <input
                type="text"
                placeholder="Search messages..."
                className="input input-bordered w-full pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="tabs tabs-boxed m-4">
          <button 
            className={`tab ${activeTab === "messages" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("messages")}
          >
            Messages
          </button>
          <button 
            className={`tab ${activeTab === "media" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("media")}
          >
            Media & Files
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4">
          {activeTab === "messages" && (
            <>
              {isSearching ? (
                <div className="text-center py-4">Searching...</div>
              ) : query.length < 2 ? (
                <div className="text-center py-4 text-base-content/60">
                  Type at least 2 characters to search
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-4 text-base-content/60">
                  No messages found
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((message) => (
                    <div 
                      key={message._id} 
                      className="p-3 bg-base-200 rounded-lg hover:bg-base-300 cursor-pointer"
                      onClick={() => {
                        onClose();
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <img 
                          src={message.senderId?.profilePic || "/avatar.png"} 
                          alt="" 
                          className="size-6 rounded-full"
                        />
                        <span className="font-medium text-sm">{message.senderId?.fullName}</span>
                        <span className="text-xs opacity-50 ml-auto">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm opacity-80 line-clamp-2">{message.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "media" && (
            <>
              {media.length === 0 ? (
                <div className="text-center py-4 text-base-content/60">
                  No media or files shared yet
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {media.map((item, index) => (
                    <div key={index} className="relative aspect-square bg-base-200 rounded-lg overflow-hidden">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt="" 
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => window.open(item.image, '_blank')}
                        />
                      ) : item.file ? (
                        <div className="w-full h-full flex items-center justify-center p-2">
                          <div className="text-center">
                            <File className="size-8 mx-auto mb-1 opacity-50" />
                            <span className="text-xs truncate block">{item.file.name}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;