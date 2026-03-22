"use client";

import { useState, useEffect, useCallback } from "react";
import { useChannelStateContext } from "stream-chat-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToBottomProps {
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  onScrollToBottom?: () => void;
}

export function ScrollToBottom({ scrollAreaRef, onScrollToBottom }: ScrollToBottomProps) {
  const { channel } = useChannelStateContext();
  const [isVisible, setIsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const checkScrollPosition = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollArea;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setIsVisible(!isNearBottom);
  }, [scrollAreaRef]);

  const scrollToBottom = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    scrollArea.scrollTo({
      top: scrollArea.scrollHeight,
      behavior: "smooth",
    });
    setIsVisible(false);
    setUnreadCount(0);
    onScrollToBottom?.();
  }, [scrollAreaRef, onScrollToBottom]);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    scrollArea.addEventListener("scroll", checkScrollPosition);
    checkScrollPosition();

    return () => {
      scrollArea.removeEventListener("scroll", checkScrollPosition);
    };
  }, [scrollAreaRef, checkScrollPosition]);

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = () => {
      const scrollArea = scrollAreaRef.current;
      if (!scrollArea) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (!isNearBottom) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    channel.on("message.new", handleNewMessage);

    return () => {
      channel.off("message.new", handleNewMessage);
    };
  }, [channel, scrollAreaRef]);

  if (!isVisible && unreadCount === 0) return null;

  return (
    <Button
      size="sm"
      onClick={scrollToBottom}
      className={cn(
        "fixed bottom-24 right-6 z-50 h-10 gap-1.5 rounded-full border border-border/50",
        "bg-popover/95 backdrop-blur-md shadow-lg transition-all duration-300",
        "hover:bg-popover hover:scale-105",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <ChevronDown className="h-4 w-4" />
      {unreadCount > 0 && (
        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
