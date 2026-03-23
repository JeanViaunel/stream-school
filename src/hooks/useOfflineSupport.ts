"use client";

import { useState, useEffect, useCallback } from "react";

type QueuedAction = {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
};

interface UseOfflineSupportReturn {
  isOnline: boolean;
  isOffline: boolean;
  queuedActions: QueuedAction[];
  queueAction: (action: Omit<QueuedAction, "id" | "timestamp">) => void;
  clearQueue: () => void;
  syncWhenOnline: () => Promise<void>;
}

const QUEUE_KEY = "stream-school-offline-queue";

export function useOfflineSupport(): UseOfflineSupportReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);

  // Load queued actions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQueuedActions(parsed);
      } catch {
        localStorage.removeItem(QUEUE_KEY);
      }
    }
  }, []);

  // Save queued actions to localStorage when they change
  useEffect(() => {
    if (queuedActions.length > 0) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queuedActions));
    } else {
      localStorage.removeItem(QUEUE_KEY);
    }
  }, [queuedActions]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Attempt to sync when coming back online
      syncWhenOnline();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const queueAction = useCallback(
    (action: Omit<QueuedAction, "id" | "timestamp">) => {
      const newAction: QueuedAction = {
        ...action,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      setQueuedActions((prev) => [...prev, newAction]);
    },
    []
  );

  const clearQueue = useCallback(() => {
    setQueuedActions([]);
    localStorage.removeItem(QUEUE_KEY);
  }, []);

  const syncWhenOnline = useCallback(async () => {
    if (!navigator.onLine || queuedActions.length === 0) return;

    const actionsToSync = [...queuedActions];
    const failedActions: QueuedAction[] = [];

    for (const action of actionsToSync) {
      try {
        // Attempt to sync each action
        await syncAction(action);
      } catch (error) {
        console.error("Failed to sync action:", action, error);
        failedActions.push(action);
      }
    }

    // Update queue with only failed actions
    setQueuedActions(failedActions);
  }, [queuedActions]);

  // Helper function to sync a single action
  const syncAction = async (action: QueuedAction): Promise<void> => {
    // Use Background Sync API if available
    if ("serviceWorker" in navigator && "sync" in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      // @ts-expect-error - Background Sync API
      await registration.sync.register("form-submission");
    }

    // Otherwise, try to send directly
    // This is a placeholder - actual implementation depends on your API
    console.log("Syncing action:", action);
  };

  return {
    isOnline,
    isOffline: !isOnline,
    queuedActions,
    queueAction,
    clearQueue,
    syncWhenOnline,
  };
}

// Hook for detecting PWA install state
export function usePWAStatus() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const checkInstallStatus = () => {
      // Check if running as installed PWA
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstallStatus();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    mediaQuery.addEventListener("change", checkInstallStatus);

    // Check for beforeinstallprompt support
    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      mediaQuery.removeEventListener("change", checkInstallStatus);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  return { isInstalled, canInstall };
}

// Hook for push notification permission
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkSupport = () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      setIsSupported(supported);
      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return false;

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  };

  const subscribe = async () => {
    if (!isSupported || permission !== "granted") return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      return subscription;
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      return null;
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    subscribe,
  };
}
