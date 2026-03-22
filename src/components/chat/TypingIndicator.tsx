"use client";

import { useEffect, useState } from "react";
import { useChannelStateContext } from "stream-chat-react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  const { channel } = useChannelStateContext();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    const handleTypingStart = (event: unknown) => {
      const e = event as { user?: { name?: string; id?: string } };
      const user = e.user;
      if (user && (user.name || user.id)) {
        const displayName = user.name || user.id!;
        setTypingUsers((prev) =>
          prev.includes(displayName) ? prev : [...prev, displayName]
        );
      }
    };

    const handleTypingStop = (event: unknown) => {
      const e = event as { user?: { name?: string; id?: string } };
      const user = e.user;
      if (user && (user.name || user.id)) {
        const displayName = user.name || user.id!;
        setTypingUsers((prev) => prev.filter((name) => name !== displayName));
      }
    };

    channel.on("typing.start", handleTypingStart);
    channel.on("typing.stop", handleTypingStop);

    return () => {
      channel.off("typing.start", handleTypingStart);
      channel.off("typing.stop", handleTypingStop);
    };
  }, [channel]);

  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing...`
      : typingUsers.length === 2
      ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
      : `${typingUsers.length} people are typing...`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground animate-ink-fade-up",
        className
      )}
    >
      <div className="flex gap-0.5">
        <span className="h-2 w-2 rounded-full bg-primary/60 animate-typing-dot" />
        <span className="h-2 w-2 rounded-full bg-primary/60 animate-typing-dot" />
        <span className="h-2 w-2 rounded-full bg-primary/60 animate-typing-dot" />
      </div>
      <span className="text-xs">{text}</span>
    </div>
  );
}
