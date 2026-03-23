"use client";

import { useCallback, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";

// Optimistic hook for enrolling in a class
export function useOptimisticJoinClass() {
  const enrollByJoinCode = useAction(api.classes.enrollByJoinCode);
  const [isPending, setIsPending] = useState(false);

  const joinClass = useCallback(
    async (joinCode: string) => {
      setIsPending(true);
      try {
        const result = await enrollByJoinCode({ joinCode: joinCode.trim() });
        
        if (result.success && result.classId) {
          toast.success("Successfully joined class!");
          return result.classId;
        }
        
        return null;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to join class");
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [enrollByJoinCode]
  );

  return { joinClass, isPending };
}

// Optimistic hook for marking notifications as read
export function useOptimisticMarkAsRead() {
  const markAsRead = useMutation(api.inAppNotifications.markAsRead);

  const markNotificationAsRead = useCallback(
    async (notificationId: Id<"notifications">) => {
      try {
        await markAsRead({ notificationId });
      } catch (err) {
        toast.error("Failed to mark as read");
      }
    },
    [markAsRead]
  );

  return { markNotificationAsRead };
}

// Optimistic hook for updating display name with local storage sync
export function useOptimisticUpdateDisplayName() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateDisplayName = useCallback(
    async (newName: string, updateFn: () => Promise<void>) => {
      setIsUpdating(true);
      
      // Store current session
      const sessionStr = localStorage.getItem("stream_app_session");
      const currentSession = sessionStr ? JSON.parse(sessionStr) : null;
      
      // Optimistically update session
      if (currentSession) {
        localStorage.setItem(
          "stream_app_session",
          JSON.stringify({ ...currentSession, displayName: newName })
        );
      }

      try {
        await updateFn();
        toast.success("Display name updated");
      } catch (err) {
        // Revert on error
        if (currentSession) {
          localStorage.setItem("stream_app_session", JSON.stringify(currentSession));
        }
        toast.error("Failed to update display name");
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  return { updateDisplayName, isUpdating };
}

// Hook for batch operations
export function useBatchOperations() {
  const [isProcessing, setIsProcessing] = useState(false);
  const markAllAsRead = useMutation(api.inAppNotifications.markAllAsRead);

  const batchMarkAsRead = useCallback(async () => {
    setIsProcessing(true);
    try {
      await markAllAsRead({});
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    } finally {
      setIsProcessing(false);
    }
  }, [markAllAsRead]);

  return { batchMarkAsRead, isProcessing };
}
