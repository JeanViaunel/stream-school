"use client";

import { useEffect } from "react";
import { useChatContext } from "stream-chat-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { playMessageBeep } from "@/lib/settings";

/**
 * Invisible component that subscribes to Stream Chat events and fires
 * browser notifications + sounds according to the user's settings.
 * Must be rendered inside the <Chat> provider.
 */
export function NotificationManager() {
  const { client } = useChatContext();
  const { session } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    if (!client || !session) return;

    const handleNewMessage = (event: Parameters<typeof client.on>[1] extends ((...args: infer A) => void) ? A[0] : never) => {
      // Don't notify for own messages
      if (event.message?.user?.id === session.streamUserId) return;
      // Don't notify if window is focused
      if (document.visibilityState === "visible") {
        if (settings.messageSounds) {
          playMessageBeep();
        }
        return;
      }

      const senderName = event.message?.user?.name ?? event.message?.user?.id ?? "Someone";
      const channelName = (event.channel_type && event.channel_id)
        ? (event.message?.user?.name ?? "a channel")
        : "a channel";

      if (settings.messageSounds) {
        playMessageBeep();
      }

      if (
        settings.desktopNotifications &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const body = settings.messagePreview
          ? (event.message?.text ?? "New message")
          : "New message received";

        new Notification(`${senderName}`, {
          body,
          icon: "/favicon.ico",
          tag: event.message?.id,
          silent: true, // We handle sounds ourselves
        });
      }
    };

    // `notification.message_new` fires for channels the user is watching
    // but is not actively viewing — perfect for background notifications
    const unsubscribeNew = client.on("notification.message_new", handleNewMessage);
    const unsubscribeAdded = client.on("message.new", handleNewMessage);

    return () => {
      unsubscribeNew.unsubscribe();
      unsubscribeAdded.unsubscribe();
    };
    // Re-subscribe when relevant settings change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, session, settings.desktopNotifications, settings.messagePreview, settings.messageSounds]);

  return null;
}
