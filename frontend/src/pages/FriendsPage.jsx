import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import { useConversationStore } from "../store/useConversationStore";
import { MessageCircle, UserPlus, Search, UserCheck, X, Check, Ban, XCircle } from "lucide-react";

const FriendsPage = () => {
  const navigate = useNavigate();
  const { authUser, onlineUsers } = useAuthStore();
  const {
    friends,
    friendRequests,
    searchResults,
    isLoading,
    isSearching,
    fetchFriends,
    fetchFriendRequests,
    searchUsers,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    clearSearch
  } = useFriendStore();
  
  const { getOrCreateConversation, setCurrentConversation } = useConversationStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("friends");

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length >= 2) {
      searchUsers(query);
    } else {
      clearSearch();
    }
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  const handleMessage = async (friendId) => {
    const conversation = await getOrCreateConversation(friendId);
    if (conversation) {
      setCurrentConversation(conversation);
      navigate("/");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-base-100">
      <div className="p-4 border-b border-base-300">
        <h1 className="text-2xl font-bold">Friends</h1>
      </div>

      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            className="input input-bordered w-full pl-10"
            value={searchQuery}
            onChange={handleSearch}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/50" />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); clearSearch(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="size-5 text-base-content/50" />
            </button>
          )}
        </div>
      </div>

      {searchQuery.length >= 2 ? (
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="font-semibold mb-3">Search Results</h2>
          {isSearching ? (
            <div className="text-center py-4">Searching...</div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-4 text-base-content/60">No users found</div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="size-12 rounded-full">
                        <img src={user.profilePic || "/avatar.png"} alt={user.fullName} />
                      </div>
                      {isOnline(user._id) && (
                        <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full border-2 border-base-100" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-sm text-base-content/60">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {user.isFriend ? (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleMessage(user._id)}
                      >
                        <MessageCircle className="size-4" />
                      </button>
                    ) : user.requestSent ? (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => cancelFriendRequest(user._id)}
                      >
                        Cancel
                      </button>
                    ) : user.requestStatus === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => acceptFriendRequest(user._id)}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => rejectFriendRequest(user._id)}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => sendFriendRequest(user._id)}
                      >
                        <UserPlus className="size-4" />
                        Add
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="tabs tabs-boxed px-4 gap-2">
            <button
              className={`tab ${activeTab === "friends" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("friends")}
            >
              Friends ({friends.length})
            </button>
            <button
              className={`tab ${activeTab === "requests" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              Requests ({friendRequests.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "friends" && (
              <>
                {isLoading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="size-16 mx-auto mb-4 text-base-content/30" />
                    <p className="text-base-content/60">No friends yet</p>
                    <p className="text-sm text-base-content/40">Search for users to add friends</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friends.map((friend) => (
                      <div key={friend._id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
                        <div className="flex items-center gap-3 cursor-pointer flex-1">
                          <div className="avatar">
                            <div className="size-12 rounded-full">
                              <img src={friend.profilePic || "/avatar.png"} alt={friend.fullName} />
                            </div>
                            {isOnline(friend._id) && (
                              <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full border-2 border-base-100" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{friend.fullName}</p>
                            <p className="text-sm text-base-content/60">{friend.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-ghost"
                            title="Message"
                            onClick={() => handleMessage(friend._id)}
                          >
                            <MessageCircle className="size-4" />
                          </button>
                          <div className="dropdown dropdown-end">
                            <button tabIndex={0} className="btn btn-sm btn-ghost">
                              <X className="size-4" />
                            </button>
                            <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow bg-base-200 rounded-box w-52">
                              <li>
                                <button onClick={() => blockUser(friend._id)}>
                                  <Ban className="size-4" /> Block
                                </button>
                              </li>
                              <li>
                                <button onClick={() => removeFriend(friend._id)}>
                                  <XCircle className="size-4" /> Remove
                                </button>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "requests" && (
              <>
                {isLoading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : friendRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <UserPlus className="size-16 mx-auto mb-4 text-base-content/30" />
                    <p className="text-base-content/60">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friendRequests.map((request) => (
                      <div key={request._id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="size-12 rounded-full">
                              <img src={request.sender?.profilePic || "/avatar.png"} alt={request.sender?.fullName} />
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">{request.sender?.fullName}</p>
                            <p className="text-sm text-base-content/60">{request.sender?.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => acceptFriendRequest(request._id)}
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => rejectFriendRequest(request._id)}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FriendsPage;