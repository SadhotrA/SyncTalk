import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { Send, Bell, MessageSquare, Eye } from "lucide-react";
import { useState } from "react";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    desktopNotifications: true,
    showOnlineStatus: true,
    showReadReceipts: true,
    messageTimeFormat: "12h",
    chatFontSize: "medium",
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-screen container mx-auto px-4 pt-20 max-w-5xl">
      <div className="space-y-8">
        {/* Theme Section */}
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Theme</h2>
            <p className="text-sm text-base-content/70">Choose a theme for your chat interface</p>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {THEMES.map((t) => (
              <button
                key={t}
                className={`
                  group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                  ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}
                `}
                onClick={() => setTheme(t)}
              >
                <div className="relative h-8 w-full rounded-md overflow-hidden" data-theme={t}>
                  <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                    <div className="rounded bg-primary"></div>
                    <div className="rounded bg-secondary"></div>
                    <div className="rounded bg-accent"></div>
                    <div className="rounded bg-neutral"></div>
                  </div>
                </div>
                <span className="text-[11px] font-medium truncate w-full text-center">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Bell className="size-5" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
              <div>
                <h3 className="font-medium">Enable Notifications</h3>
                <p className="text-sm text-base-content/70">Receive notifications for new messages</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.notifications}
                onChange={(e) => handleSettingChange("notifications", e.target.checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
              <div>
                <h3 className="font-medium">Sound Alerts</h3>
                <p className="text-sm text-base-content/70">Play sound for new messages</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.soundEnabled}
                onChange={(e) => handleSettingChange("soundEnabled", e.target.checked)}
                disabled={!settings.notifications}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
              <div>
                <h3 className="font-medium">Desktop Notifications</h3>
                <p className="text-sm text-base-content/70">Show desktop notifications</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.desktopNotifications}
                onChange={(e) => handleSettingChange("desktopNotifications", e.target.checked)}
                disabled={!settings.notifications}
              />
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Eye className="size-5" />
            <h2 className="text-lg font-semibold">Privacy</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
              <div>
                <h3 className="font-medium">Online Status</h3>
                <p className="text-sm text-base-content/70">Show when you're online</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.showOnlineStatus}
                onChange={(e) => handleSettingChange("showOnlineStatus", e.target.checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
              <div>
                <h3 className="font-medium">Read Receipts</h3>
                <p className="text-sm text-base-content/70">Show when you've read messages</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.showReadReceipts}
                onChange={(e) => handleSettingChange("showReadReceipts", e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Chat Display Settings */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            <h2 className="text-lg font-semibold">Chat Display</h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-base-200 rounded-lg">
              <h3 className="font-medium mb-2">Time Format</h3>
              <div className="flex gap-2">
                <button
                  className={`btn btn-sm ${settings.messageTimeFormat === "12h" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => handleSettingChange("messageTimeFormat", "12h")}
                >
                  12-hour
                </button>
                <button
                  className={`btn btn-sm ${settings.messageTimeFormat === "24h" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => handleSettingChange("messageTimeFormat", "24h")}
                >
                  24-hour
                </button>
              </div>
            </div>

            <div className="p-4 bg-base-200 rounded-lg">
              <h3 className="font-medium mb-2">Font Size</h3>
              <div className="flex gap-2">
                <button
                  className={`btn btn-sm ${settings.chatFontSize === "small" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => handleSettingChange("chatFontSize", "small")}
                >
                  Small
                </button>
                <button
                  className={`btn btn-sm ${settings.chatFontSize === "medium" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => handleSettingChange("chatFontSize", "medium")}
                >
                  Medium
                </button>
                <button
                  className={`btn btn-sm ${settings.chatFontSize === "large" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => handleSettingChange("chatFontSize", "large")}
                >
                  Large
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Preview</h3>
          <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
            <div className="p-4 bg-base-200">
              <div className="max-w-lg mx-auto">
                {/* Mock Chat UI */}
                <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
                  {/* Chat Header */}
                  <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                        J
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">John Doe</h3>
                        <p className="text-xs text-base-content/70">
                          {settings.showOnlineStatus ? "Online" : "Last seen recently"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
                    {PREVIEW_MESSAGES.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`
                            max-w-[80%] rounded-xl p-3 shadow-sm
                            ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}
                          `}
                        >
                          <p className={`text-sm ${settings.chatFontSize === "small" ? "text-xs" : settings.chatFontSize === "large" ? "text-base" : ""}`}>
                            {message.content}
                          </p>
                          <p
                            className={`
                              text-[10px] mt-1.5
                              ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}
                            `}
                          >
                            {settings.messageTimeFormat === "12h" ? "12:00 PM" : "12:00"}
                            {settings.showReadReceipts && message.isSent && " ✓✓"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 border-t border-base-300 bg-base-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input input-bordered flex-1 text-sm h-10"
                        placeholder="Type a message..."
                        value="This is a preview"
                        readOnly
                      />
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
    </div>
  );
};
export default SettingsPage;