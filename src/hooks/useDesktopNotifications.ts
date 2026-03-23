"use client";

import { useEffect, useCallback } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";

export function useDesktopNotifications() {
  const { settings } = useSettings();
  const { totalUnread } = useUnreadCounts();

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!settings.desktopNotifications) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    // Don't show notifications if window is focused
    if (document.visibilityState === "visible") return;

    new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });
  }, [settings.desktopNotifications]);

  useEffect(() => {
    if (!settings.desktopNotifications) return;
    
    // Request permission on first load
    requestPermission();
  }, [settings.desktopNotifications, requestPermission]);

  return {
    requestPermission,
    showNotification,
    isSupported: "Notification" in window,
    permission: typeof window !== "undefined" ? Notification.permission : "default",
  };
}
