"use client";

import { useEffect, useState, useCallback } from "react";
import { useChatContext } from "stream-chat-react";
import type { Channel } from "stream-chat";

interface UnreadCounts {
  [channelId: string]: number;
}

export function useUnreadCounts() {
  const { client } = useChatContext();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [totalUnread, setTotalUnread] = useState(0);

  const updateUnreadCounts = useCallback(() => {
    if (!client) return;

    const counts: UnreadCounts = {};
    let total = 0;

    // Get all channels the user is a member of
    const channels = Object.values(client.activeChannels || {});
    
    channels.forEach((channel: Channel) => {
      const unreadCount = channel.state.unreadCount || 0;
      if (unreadCount > 0) {
        counts[channel.id || ""] = unreadCount;
        total += unreadCount;
      }
    });

    setUnreadCounts(counts);
    setTotalUnread(total);
  }, [client]);

  useEffect(() => {
    if (!client) return;

    // Initial update
    updateUnreadCounts();

    // Listen for message events
    const handleMessageNew = () => {
      updateUnreadCounts();
    };

    const handleMessageRead = () => {
      updateUnreadCounts();
    };

    const handleNotificationMarkRead = () => {
      updateUnreadCounts();
    };

    client.on("message.new", handleMessageNew);
    client.on("message.read", handleMessageRead);
    client.on("notification.mark_read", handleNotificationMarkRead);

    return () => {
      client.off("message.new", handleMessageNew);
      client.off("message.read", handleMessageRead);
      client.off("notification.mark_read", handleNotificationMarkRead);
    };
  }, [client, updateUnreadCounts]);

  // Update browser tab title with unread count
  useEffect(() => {
    const originalTitle = document.title;
    
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [totalUnread]);

  const getUnreadCount = useCallback((channelId: string): number => {
    return unreadCounts[channelId] || 0;
  }, [unreadCounts]);

  return {
    unreadCounts,
    totalUnread,
    getUnreadCount,
    updateUnreadCounts,
  };
}
