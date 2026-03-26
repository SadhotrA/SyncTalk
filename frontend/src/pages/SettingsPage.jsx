import { useState, useEffect } from "react";
import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { useFriendStore } from "../store/useFriendStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { 
  Send, Shield, Eye, MessageSquare, Ban, User, Bell, MessageCircle, 
  Lock, Database, Globe, Camera, Mail, UserCircle, Trash2, Download,
  ChevronRight, Save
} from "lucide-react";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const { blockedUsers, fetchBlockedUsers, unblockUser } = useFriendStore();
  const { authUser, setAuthUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState("account");
  const [privacySettings, setPrivacySettings] = useState({
    lastSeenVisibility: 'friends',
    profileVisibility: 'friends',
    readReceipts: true,
    typingIndicators: true
  });
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    messageSound: true,
    groupNotifications: true,
    typingIndicator: true
  });
  const [chatSettings, setChatSettings] = useState({
    fontSize: 'medium',
    chatWallpaper: 'default',
    enterToSend: true,
    emojiSuggestions: true
  });
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBlockedUsers();
    if (authUser?.privacySettings) {
      setPrivacySettings(authUser.privacySettings);
    }
  }, [authUser]);

  const handlePrivacyChange = async (key, value) => {
    const newSettings = { ...privacySettings, [key]: value };
    setPrivacySettings(newSettings);
    setIsSaving(true);
    try {
      await axiosInstance.put("/auth/privacy-settings", newSettings);
      toast.success("Privacy settings updated");
    } catch (error) {
      toast.error("Failed to update settings");
      setPrivacySettings(privacySettings);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationChange = (key, value) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
    toast.success("Notification settings updated");
  };

  const handleChatChange = (key, value) => {
    setChatSettings(prev => ({ ...prev, [key]: value }));
    toast.success("Chat settings updated");
  };

  const tabs = [
    { id: "account", label: "Account", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "security", label: "Security", icon: Lock },
    { id: "data", label: "Data & Privacy", icon: Database },
    { id: "language", label: "Language", icon: Globe },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "account":
        return <AccountSettings authUser={authUser} setAuthUser={setAuthUser} />;
      case "notifications":
        return (
          <NotificationSettings 
            settings={notificationSettings} 
            onChange={handleNotificationChange} 
          />
        );
      case "chat":
        return (
          <ChatSettings 
            settings={chatSettings} 
            onChange={handleChatChange} 
          />
        );
      case "privacy":
        return (
          <PrivacySettings 
            settings={privacySettings} 
            onChange={handlePrivacyChange}
            blockedUsers={blockedUsers}
            unblockUser={unblockUser}
          />
        );
      case "security":
        return (
          <SecuritySettings 
            settings={securitySettings} 
            onChange={setSecuritySettings} 
            authUser={authUser}
          />
        );
      case "data":
        return <DataPrivacySettings />;
      case "language":
        return <LanguageSettings theme={theme} setTheme={setTheme} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen container mx-auto px-4 pt-20 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <div className="bg-base-200 rounded-lg p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id 
                    ? "bg-primary text-primary-content" 
                    : "hover:bg-base-300"
                }`}
              >
                <tab.icon className="size-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-base-200 rounded-lg p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

const AccountSettings = ({ authUser, setAuthUser }) => {
  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [email, setEmail] = useState(authUser?.email || "");
  const [isEditing, setIsEditing] = useState(false);
  const [previewImage, setPreviewImage] = useState(authUser?.profilePic || "");

  const handleSave = async () => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", {
        fullName,
        email,
        profilePic: previewImage
      });
      setAuthUser(res.data);
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <UserCircle className="size-5" />
          Account Settings
        </h2>
        <p className="text-sm text-base-content/70">Manage your account information</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="size-24 rounded-full overflow-hidden bg-base-300">
            <img 
              src={previewImage || "/avatar.png"} 
              alt="Profile" 
              className="size-full object-cover"
            />
          </div>
          <label className="absolute bottom-0 right-0 btn btn-circle btn-sm btn-primary cursor-pointer">
            <Camera className="size-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>
        </div>
        <div>
          <p className="font-medium">{authUser?.fullName}</p>
          <p className="text-sm text-base-content/60">{authUser?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        <Save className="size-4" />
        Save Changes
      </button>
    </div>
  );
};

const NotificationSettings = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bell className="size-5" />
          Notification Settings
        </h2>
        <p className="text-sm text-base-content/70">Control how you receive notifications</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
          <div>
            <p className="font-medium">Push Notifications</p>
            <p className="text-sm text-base-content/60">Receive notifications on your device</p>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary"
            checked={settings.pushNotifications}
            onChange={(e) => onChange("pushNotifications", e.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
          <div>
            <p className="font-medium">Message Sound</p>
            <p className="text-sm text-base-content/60">Play sound for new messages</p>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary"
            checked={settings.messageSound}
            onChange={(e) => onChange("messageSound", e.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
          <div>
            <p className="font-medium">Group Notifications</p>
            <p className="text-sm text-base-content/60">Notifications for group messages</p>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary"
            checked={settings.groupNotifications}
            onChange={(e) => onChange("groupNotifications", e.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
          <div>
            <p className="font-medium">Typing Indicators</p>
            <p className="text-sm text-base-content/60">Show when someone is typing</p>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary"
            checked={settings.typingIndicator}
            onChange={(e) => onChange("typingIndicator", e.target.checked)}
          />
        </div>
      </div>
    </div>
  );
};

const ChatSettings = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageCircle className="size-5" />
          Chat Settings
        </h2>
        <p className="text-sm text-base-content/70">Customize your chat experience</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-base-100 rounded-lg">
          <p className="font-medium mb-2">Font Size</p>
          <div className="flex gap-2">
            {['small', 'medium', 'large'].map((size) => (
              <button
                key={size}
                className={`btn btn-sm ${settings.fontSize === size ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => onChange("fontSize", size)}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
          <div>
            <p className="font-medium">Enter to Send</p>
            <p className="text-sm text-base-content/60">Press Enter to send message</p>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary"
            checked={settings.enterToSend}
            onChange={(e) => onChange("enterToSend", e.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
          <div>
            <p className="font-medium">Emoji Suggestions</p>
            <p className="text-sm text-base-content/60">Show emoji suggestions while typing</p>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary"
            checked={settings.emojiSuggestions}
            onChange={(e) => onChange("emojiSuggestions", e.target.checked)}
          />
        </div>

        <div className="p-4 bg-base-100 rounded-lg">
          <p className="font-medium mb-2">Chat Wallpaper</p>
          <div className="flex gap-3">
            {['default', 'light', 'dark', 'custom'].map((wallpaper) => (
              <button
                key={wallpaper}
                className={`w-16 h-16 rounded-lg border-2 ${
                  settings.chatWallpaper === wallpaper 
                    ? "border-primary" 
                    : "border-base-300"
                } ${wallpaper === 'default' ? 'bg-gradient-to-br from-blue-400 to-purple-500' : 
                   wallpaper === 'light' ? 'bg-white' : 
                   wallpaper === 'dark' ? 'bg-gray-800' : 'bg-base-300'}`}
                onClick={() => onChange("chatWallpaper", wallpaper)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PrivacySettings = ({ settings, onChange, blockedUsers, unblockUser }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="size-5" />
          Privacy Settings
        </h2>
        <p className="text-sm text-base-content/70">Control your privacy and security</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
          <div className="flex items-center gap-3">
            <Eye className="size-5 text-base-content/70" />
            <div>
              <p className="font-medium">Last Seen</p>
              <p className="text-sm text-base-content/60">Who can see your online status</p>
            </div>
          </div>
          <select 
            className="select select-bordered select-sm"
            value={settings.lastSeenVisibility}
            onChange={(e) => onChange("lastSeenVisibility", e.target.value)}
          >
            <option value="everyone">Everyone</option>
            <option value="friends">Friends Only</option>
            <option value="none">Nobody</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
          <div className="flex items-center gap-3">
            <User className="size-5 text-base-content/70" />
            <div>
              <p className="font-medium">Profile Visibility</p>
              <p className="text-sm text-base-content/60">Who can see your profile</p>
            </div>
          </div>
          <select 
            className="select select-bordered select-sm"
            value={settings.profileVisibility}
            onChange={(e) => onChange("profileVisibility", e.target.value)}
          >
            <option value="everyone">Everyone</option>
            <option value="friends">Friends Only</option>
            <option value="none">Nobody</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
          <div className="flex items-center gap-3">
            <MessageSquare className="size-5 text-base-content/70" />
            <div>
              <p className="font-medium">Read Receipts</p>
              <p className="text-sm text-base-content/60">Let others see when you've read messages</p>
            </div>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary"
            checked={settings.readReceipts}
            onChange={(e) => onChange("readReceipts", e.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
          <div className="flex items-center gap-3">
            <Ban className="size-5 text-base-content/70" />
            <div>
              <p className="font-medium">Typing Indicators</p>
              <p className="text-sm text-base-content/60">Show when you're typing</p>
            </div>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary"
            checked={settings.typingIndicators}
            onChange={(e) => onChange("typingIndicators", e.target.checked)}
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-3">Blocked Users ({blockedUsers.length})</h3>
        <div className="space-y-2">
          {blockedUsers.length === 0 ? (
            <p className="text-base-content/60">No blocked users</p>
          ) : (
            blockedUsers.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="avatar">
                    <div className="size-10 rounded-full">
                      <img src={user.profilePic || "/avatar.png"} alt={user.fullName} />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-sm text-base-content/60">{user.email}</p>
                  </div>
                </div>
                <button 
                  className="btn btn-sm btn-ghost"
                  onClick={() => unblockUser(user._id)}
                >
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const SecuritySettings = ({ settings, onChange, authUser }) => {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    try {
      await axiosInstance.put("/auth/change-password", {
        currentPassword,
        newPassword
      });
      toast.success("Password changed successfully");
      setShowPasswordChange(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Lock className="size-5" />
          Security Settings
        </h2>
        <p className="text-sm text-base-content/70">Manage your account security</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
          <div>
            <p className="font-medium">Two-Factor Authentication</p>
            <p className="text-sm text-base-content/60">Add an extra layer of security</p>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary"
            checked={settings.twoFactorEnabled}
            onChange={(e) => onChange({ ...settings, twoFactorEnabled: e.target.checked })}
          />
        </div>

        <div className="p-4 bg-base-100 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-base-content/60">Update your account password</p>
            </div>
            <button 
              className="btn btn-sm btn-ghost"
              onClick={() => setShowPasswordChange(!showPasswordChange)}
            >
              <ChevronRight className={`size-4 transition-transform ${showPasswordChange ? "rotate-90" : ""}`} />
            </button>
          </div>
          
          {showPasswordChange && (
            <div className="space-y-3 mt-4 pt-4 border-t border-base-300">
              <input
                type="password"
                placeholder="Current password"
                className="input input-bordered w-full"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="New password"
                className="input input-bordered w-full"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                className="input input-bordered w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={handlePasswordChange}>
                Update Password
              </button>
            </div>
          )}
        </div>

        <div className="p-4 bg-base-100 rounded-lg">
          <p className="font-medium">Active Sessions</p>
          <p className="text-sm text-base-content/60 mb-3">Manage your active login sessions</p>
          <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="size-2 bg-success rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Current Session</p>
                <p className="text-xs text-base-content/60">This device</p>
              </div>
            </div>
            <span className="text-xs text-success">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DataPrivacySettings = () => {
  const handleExportData = async () => {
    try {
      const response = await axiosInstance.get("/auth/export-data", {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "syncTalk-data.zip");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Data export started");
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const handleClearCache = async () => {
    if (confirm("This will clear cached data. Continue?")) {
      toast.success("Cache cleared");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Database className="size-5" />
          Data & Privacy
        </h2>
        <p className="text-sm text-base-content/70">Manage your data and privacy settings</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-base-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Export Your Data</p>
              <p className="text-sm text-base-content/60">Download all your messages and files</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleExportData}>
              <Download className="size-4" />
              Export
            </button>
          </div>
        </div>

        <div className="p-4 bg-base-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Clear Cache</p>
              <p className="text-sm text-base-content/60">Free up storage space</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleClearCache}>
              <Trash2 className="size-4" />
              Clear
            </button>
          </div>
        </div>

        <div className="p-4 bg-error/10 rounded-lg border border-error/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-error">Delete Account</p>
              <p className="text-sm text-base-content/60">Permanently delete your account and all data</p>
            </div>
            <button className="btn btn-error btn-sm">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LanguageSettings = ({ theme, setTheme }) => {
  const [language, setLanguage] = useState("en");

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "hi", name: "Hindi" },
    { code: "zh", name: "Chinese" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Globe className="size-5" />
          Language & Appearance
        </h2>
        <p className="text-sm text-base-content/70">Customize your language and app appearance</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-base-100 rounded-lg">
          <p className="font-medium mb-3">Language</p>
          <div className="grid grid-cols-2 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                className={`p-3 rounded-lg border text-left ${
                  language === lang.code 
                    ? "border-primary bg-primary/10" 
                    : "border-base-300 hover:border-base-content/30"
                }`}
                onClick={() => {
                  setLanguage(lang.code);
                  toast.success(`Language changed to ${lang.name}`);
                }}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-base-100 rounded-lg">
          <p className="font-medium mb-3">Theme</p>
          <div className="flex gap-4">
            {THEMES.map((t) => (
              <button
                key={t}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors border-2 ${
                  theme === t 
                    ? "border-primary bg-primary/10" 
                    : "border-base-300 hover:border-base-content/30"
                }`}
                onClick={() => setTheme(t)}
              >
                {t === 'system' && (
                  <div className="size-10 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
                    <span className="text-xl">⚙️</span>
                  </div>
                )}
                {t === 'light' && (
                  <div className="size-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-2xl">
                    ☀️
                  </div>
                )}
                {t === 'dark' && (
                  <div className="size-10 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center text-2xl">
                    🌙
                  </div>
                )}
                <span className="text-sm font-medium">
                  {t.charAt((0)).toUpperCase() + t.slice(1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 bg-base-100 rounded-lg">
        <h3 className="font-medium mb-3">Preview</h3>
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
          <div className="p-4 bg-base-200">
            <div className="max-w-lg mx-auto">
              <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                      J
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">John Doe</h3>
                      <p className="text-xs text-base-content/70">Online</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-4 min-h-[150px] max-h-[150px] overflow-y-auto bg-base-100">
                  {PREVIEW_MESSAGES.map((message) => (
                    <div key={message.id} className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}`}>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-base-300 bg-base-100">
                  <div className="flex gap-2">
                    <input type="text" className="input input-bordered flex-1 text-sm h-10" placeholder="Type a message..." value="This is a preview" readOnly />
                    <button className="btn btn-primary h-10 min-h-0">
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;