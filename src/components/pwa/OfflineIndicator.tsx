"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useOfflineSupport } from "@/hooks/useOfflineSupport";

export function OfflineIndicator() {
  const { isOnline, queuedActions } = useOfflineSupport();

  if (isOnline && queuedActions.length === 0) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 ${
        isOnline
          ? "bg-yellow-500 text-yellow-950"
          : "bg-red-500 text-white"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">
            Back online - {queuedActions.length} actions syncing
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Offline mode</span>
        </>
      )}
    </div>
  );
}
