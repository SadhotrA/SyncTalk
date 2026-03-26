import { create } from "zustand";

const getSystemTheme = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const getStoredTheme = () => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem("chat-theme") || "system";
  }
  return "system";
};

export const useThemeStore = create((set, get) => ({
  theme: getStoredTheme(),
  
  setTheme: (theme) => {
    localStorage.setItem("chat-theme", theme);
    set({ theme });
  },
  
  getEffectiveTheme: () => {
    const { theme } = get();
    if (theme === "system") {
      return getSystemTheme();
    }
    return theme;
  }
}));

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useThemeStore.getState();
    if (theme === "system") {
      useThemeStore.setState({ theme: "system" });
    }
  });
}