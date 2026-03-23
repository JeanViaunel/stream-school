"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const QUICK_REACTIONS = ["👍", "❤️", "🎉", "👏", "🔥", "😂"];

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
  timestamp: number;
  x: number;
}

interface FloatingReactionProps {
  reaction: Reaction;
  onComplete: () => void;
}

function FloatingReaction({ reaction, onComplete }: FloatingReactionProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="fixed z-50 pointer-events-none animate-float-up-fade"
      style={{
        left: `${reaction.x}%`,
        bottom: "120px",
      }}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="text-4xl filter drop-shadow-lg">{reaction.emoji}</span>
        <span className="text-xs text-white/80 font-medium bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
          {reaction.userName}
        </span>
      </div>
    </div>
  );
}

export function LiveReactions() {
  const call = useCall();
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const reactionsRef = useRef<Reaction[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    reactionsRef.current = reactions;
  }, [reactions]);

  // Listen for custom events (reactions) from other participants
  useEffect(() => {
    if (!call) return;

    const handleCustomEvent = (event: {
      type: string;
      custom?: {
        type?: string;
        emoji?: string;
        userId?: string;
        userName?: string;
      };
      user?: { id?: string; name?: string };
    }) => {
      if (event.type === "custom" && event.custom?.type === "reaction") {
        const { emoji, userId, userName } = event.custom;
        if (!emoji) return;

        // Skip if it's our own reaction
        if (userId === localParticipant?.userId) return;

        const newReaction: Reaction = {
          id: `${Date.now()}-${Math.random()}`,
          emoji,
          userId: userId || event.user?.id || "unknown",
          userName: userName || event.user?.name || "Someone",
          timestamp: Date.now(),
          x: 10 + Math.random() * 80,
        };

        setReactions((prev) => [...prev, newReaction]);
      }
    };

    call.on("custom", handleCustomEvent);
    return () => {
      call.off("custom", handleCustomEvent);
    };
  }, [call, localParticipant?.userId]);

  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!call) return;

      try {
        // Send reaction as a custom event through Stream SDK
        await call.sendCustomEvent({
          type: "reaction",
          emoji,
          userId: localParticipant?.userId,
          userName: localParticipant?.name || "You",
        });

        // Show our own reaction immediately
        const newReaction: Reaction = {
          id: `${Date.now()}-${Math.random()}`,
          emoji,
          userId: localParticipant?.userId || "me",
          userName: "You",
          timestamp: Date.now(),
          x: 10 + Math.random() * 80,
        };

        setReactions((prev) => [...prev, newReaction]);
        setIsOpen(false);
      } catch (error) {
        console.error("Failed to send reaction:", error);
      }
    },
    [call, localParticipant?.userId, localParticipant?.name]
  );

  const removeReaction = useCallback((id: string) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const triggerClassName = cn(
    "group relative flex h-14 w-14 items-center justify-center rounded-2xl",
    "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
    isOpen
      ? "bg-yellow-500/30 text-yellow-400 border border-yellow-500/40"
      : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 hover:border-white/15"
  );

  return (
    <>
      {/* Floating reactions overlay */}
      {reactions.map((reaction) => (
        <FloatingReaction
          key={reaction.id}
          reaction={reaction}
          onComplete={() => removeReaction(reaction.id)}
        />
      ))}

      {/* Tooltip + popover share one trigger (one shared element node was rendering two buttons) */}
      <TooltipProvider>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger>
                  <button type="button" className={triggerClassName}>
                    <SmilePlus className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                  </button>
                </PopoverTrigger>
              }
            />
            <TooltipContent side="top">
              <p>Send Reaction</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            align="center"
            side="top"
            className="w-auto p-3 glass-strong border-white/10"
          >
            <div className="flex items-center gap-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    "text-xl transition-all duration-150 hover:scale-110",
                    "hover:bg-white/10"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    </>
  );
}
