import { useState, useEffect } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useFriendStore } from "../store/useFriendStore";
import { useConversationStore } from "../store/useConversationStore";
import toast from "react-hot-toast";
import { X, Users, UserPlus, UserMinus, Shield, Trash2, Crown } from "lucide-react";

const GroupInfoModal = ({ isOpen, onClose, conversation }) => {
  const { friends, fetchFriends } = useFriendStore();
  const { addMembers, removeMember, leaveGroup, makeAdmin, getGroupInfo } = useGroupStore();
  const { setCurrentConversation } = useConversationStore();
  
  const [groupInfo, setGroupInfo] = useState(null);
  const [showAddMembers, setShowAddMembers] = useState(false);

  useEffect(() => {
    if (isOpen && conversation?._id) {
      loadGroupInfo();
      fetchFriends();
    }
  }, [isOpen, conversation?._id]);

  const loadGroupInfo = async () => {
    const info = await getGroupInfo(conversation._id);
    setGroupInfo(info);
  };

  const handleAddMembers = async (memberIds) => {
    await addMembers(conversation._id, memberIds);
    await loadGroupInfo();
    setShowAddMembers(false);
    toast.success("Members added");
  };

  const handleRemoveMember = async (memberId) => {
    if (confirm("Remove this member from the group?")) {
      await removeMember(conversation._id, memberId);
      await loadGroupInfo();
    }
  };

  const handleMakeAdmin = async (memberId) => {
    await makeAdmin(conversation._id, memberId);
    await loadGroupInfo();
    toast.success("User promoted to admin");
  };

  const handleLeaveGroup = async () => {
    if (confirm("Are you sure you want to leave this group?")) {
      await leaveGroup(conversation._id);
      setCurrentConversation(null);
      onClose();
    }
  };

  if (!isOpen || !conversation) return null;

  const currentUserId = groupInfo?.participants?.find(p => p._id)?.fullName ? groupInfo.participants[0]?._id : null;
  const isAdmin = groupInfo?.admin?.some(a => currentUserId && a.toString() === currentUserId.toString());

  const nonMembers = friends.filter(f => !groupInfo?.participants?.some(p => p._id === f._id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-base-100 w-full max-w-md rounded-lg overflow-hidden max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-base-300 flex items-center justify-between">
          <h2 className="text-xl font-bold">Group Info</h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="text-center mb-6">
            <div className="avatar w-20 h-20 mx-auto mb-2 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {conversation.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg font-semibold">{conversation.name}</h3>
            <p className="text-sm text-base-content/60">
              {groupInfo?.participants?.length || 0} members • {groupInfo?.admin?.length || 0} admins
            </p>
          </div>

          {isAdmin && (
            <button 
              className="btn btn-primary btn-sm w-full mb-4"
              onClick={() => setShowAddMembers(true)}
            >
              <UserPlus className="size-4" /> Add Members
            </button>
          )}

          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="size-4" /> Members
            </h4>
            {groupInfo?.participants?.map(member => {
              const isMemberAdmin = groupInfo.admin?.some(a => a.toString() === member._id.toString());
              const isCurrentUser = member._id.toString() === currentUserId?.toString();

              return (
                <div key={member._id} className="flex items-center justify-between p-2 bg-base-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="size-8 rounded-full">
                        <img src={member.profilePic || "/avatar.png"} alt={member.fullName} />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {member.fullName}
                        {isCurrentUser && " (You)"}
                      </p>
                      {isMemberAdmin && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <Crown className="size-3" /> Admin
                        </span>
                      )}
                    </div>
                  </div>

                  {isAdmin && !isCurrentUser && (
                    <div className="flex gap-1">
                      {!isMemberAdmin && (
                        <button 
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleMakeAdmin(member._id)}
                          title="Make Admin"
                        >
                          <Shield className="size-3" />
                        </button>
                      )}
                      <button 
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => handleRemoveMember(member._id)}
                        title="Remove"
                      >
                        <UserMinus className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-base-300">
          <button 
            className="btn btn-error btn-outline w-full"
            onClick={handleLeaveGroup}
          >
            Leave Group
          </button>
        </div>
      </div>

      {showAddMembers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowAddMembers(false)}>
          <div className="bg-base-100 w-full max-w-sm rounded-lg p-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Add Members</h3>
            {nonMembers.length === 0 ? (
              <p className="text-base-content/60 text-sm">No friends to add</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {nonMembers.map(friend => (
                  <label 
                    key={friend._id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer"
                  >
                    <input 
                      type="checkbox" 
                      className="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleAddMembers([friend._id]);
                        }
                      }}
                    />
                    <img src={friend.profilePic || "/avatar.png"} alt={friend.fullName} className="size-8 rounded-full" />
                    <span>{friend.fullName}</span>
                  </label>
                ))}
              </div>
            )}
            <button className="btn btn-ghost btn-sm mt-3 w-full" onClick={() => setShowAddMembers(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupInfoModal;