"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "@/lib/settings";

interface SettingsContextValue {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  // Apply CSS side-effects for compact mode and animations on mount and change
  useEffect(() => {
    const html = document.documentElement;
    if (settings.compactMode) {
      html.classList.add("compact-mode");
    } else {
      html.classList.remove("compact-mode");
    }
  }, [settings.compactMode]);

  useEffect(() => {
    const html = document.documentElement;
    if (!settings.animations) {
      html.classList.add("no-animations");
    } else {
      html.classList.remove("no-animations");
    }
  }, [settings.animations]);

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSettings(next);

        // Request notification permission when enabling desktop notifications
        if (key === "desktopNotifications" && value === true) {
          if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
          }
        }

        return next;
      });
    },
    []
  );

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
