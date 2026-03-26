import { useState, useEffect } from "react";
import { useFriendStore } from "../store/useFriendStore";
import { useGroupStore } from "../store/useGroupStore";
import toast from "react-hot-toast";
import { Users, X, Plus, Image } from "lucide-react";

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const { friends, fetchFriends } = useFriendStore();
  const { createGroup } = useGroupStore();

  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [avatar, setAvatar] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  const toggleMember = (friendId) => {
    setSelectedMembers((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (selectedMembers.length < 2) {
      toast.error("Select at least 2 members");
      return;
    }

    setIsCreating(true);
    const group = await createGroup({
      name: groupName,
      avatar,
      memberIds: selectedMembers,
    });

    if (group) {
      onGroupCreated(group);
      onClose();
      setGroupName("");
      setSelectedMembers([]);
      setAvatar("");
    }
    setIsCreating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-100 p-6 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create Group</h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="avatar relative cursor-pointer" onClick={() => document.getElementById("group-avatar-input").click()}>
              <div className="size-24 rounded-full bg-base-200 flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="Group avatar" className="size-full object-cover rounded-full" />
                ) : (
                  <Image className="size-10 text-base-content/30" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 btn btn-circle btn-sm btn-primary">
                <Plus className="size-3" />
              </div>
              <input
                id="group-avatar-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setAvatar(reader.result);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label className="label">Group Name</label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Add Members (at least 2)</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {friends.length === 0 ? (
                <p className="text-base-content/60 text-sm">No friends yet. Add friends first!</p>
              ) : (
                friends.map((friend) => (
                  <label
                    key={friend._id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-base-200 ${
                      selectedMembers.includes(friend._id) ? "bg-primary/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedMembers.includes(friend._id)}
                      onChange={() => toggleMember(friend._id)}
                    />
                    <div className="avatar">
                      <div className="size-8 rounded-full">
                        <img src={friend.profilePic || "/avatar.png"} alt={friend.fullName} />
                      </div>
                    </div>
                    <span>{friend.fullName}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Group"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;