"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function useKeyboardShortcuts() {
  const router = useRouter();
  const { session } = useAuth();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Navigation shortcuts
      if (modKey && e.key === "k") {
        e.preventDefault();
        // Command palette is handled by CommandPalette component
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: !isMac, metaKey: isMac }));
      }

      // Go to Dashboard - g then d
      if (e.key === "g" && !e.repeat) {
        const handler = (ev: KeyboardEvent) => {
          if (ev.key === "d") {
            ev.preventDefault();
            router.push("/dashboard");
          }
          document.removeEventListener("keydown", handler);
        };
        document.addEventListener("keydown", handler, { once: true });
        setTimeout(() => document.removeEventListener("keydown", handler), 500);
      }

      // Go to Assignments - g then a
      if (e.key === "g" && !e.repeat && session?.role === "student") {
        const handler = (ev: KeyboardEvent) => {
          if (ev.key === "a") {
            ev.preventDefault();
            router.push("/assignments");
          }
          document.removeEventListener("keydown", handler);
        };
        document.addEventListener("keydown", handler, { once: true });
        setTimeout(() => document.removeEventListener("keydown", handler), 500);
      }

      // Go to Messages - g then m
      if (e.key === "g" && !e.repeat) {
        const handler = (ev: KeyboardEvent) => {
          if (ev.key === "m") {
            ev.preventDefault();
            router.push("/messages");
          }
          document.removeEventListener("keydown", handler);
        };
        document.addEventListener("keydown", handler, { once: true });
        setTimeout(() => document.removeEventListener("keydown", handler), 500);
      }

      // New Message - n
      if (e.key === "n" && !modKey && !e.repeat) {
        e.preventDefault();
        // Trigger new DM modal through UIActionsContext
        document.dispatchEvent(new CustomEvent("openNewDMModal"));
      }

      // Show keyboard shortcuts - ?
      if (e.key === "?" && !modKey) {
        e.preventDefault();
        router.push("/keyboard-shortcuts");
      }

      // Settings - cmd/cmd + ,
      if (modKey && e.key === ",") {
        e.preventDefault();
        router.push("/settings");
      }

      // Profile - cmd/cmd + p
      if (modKey && e.key === "p") {
        e.preventDefault();
        router.push("/profile");
      }

      // Escape - close modals/go back
      if (e.key === "Escape") {
        // Check if any modal is open
        const openModal = document.querySelector("[data-state='open']");
        if (!openModal) {
          // Could implement back navigation here
        }
      }
    },
    [router, session]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
