"use client";

import { useState, useCallback } from "react";
import { useChatContext, useChannelStateContext } from "stream-chat-react";
import type { MessageResponse } from "stream-chat";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Smile,
  CornerDownRight,
  Copy,
  Edit3,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface MessageActionsProps {
  message: MessageResponse;
  isOwn: boolean;
  isVisible: boolean;
  position: "left" | "right";
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"];

export function MessageActions({
  message,
  isOwn,
  isVisible,
  position,
}: MessageActionsProps) {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const { session } = useAuth();
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);

  const channelType =
    (channel as unknown as { type?: string }).type ?? undefined;
  const isAdminReadonly = session?.role === "admin" && channelType === "classroom";
  if (isAdminReadonly) return null;

  const handleReaction = useCallback(
    async (reactionType: string) => {
      try {
        await channel.sendReaction(message.id, { type: reactionType });
        setIsEmojiOpen(false);
        toast.success("Reaction added", { duration: 1500 });
      } catch {
        toast.error("Failed to add reaction");
      }
    },
    [channel, message.id]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.text || "");
    toast.success("Message copied to clipboard", { duration: 2000 });
  }, [message.text]);

  const handleReply = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("openThread", { detail: { messageId: message.id } })
    );
  }, [message.id]);

  const handleEdit = useCallback(async () => {
    const newText = window.prompt("Edit message:", message.text);
    if (newText && newText !== message.text) {
      try {
        await client.updateMessage({
          id: message.id,
          text: newText,
        });
        toast.success("Message updated", { duration: 1500 });
      } catch {
        toast.error("Failed to update message");
      }
    }
  }, [client, message.id, message.text]);

  const handleDelete = useCallback(async () => {
    if (window.confirm("Delete this message?")) {
      try {
        await client.deleteMessage(message.id);
        toast.success("Message deleted", { duration: 1500 });
      } catch {
        toast.error("Failed to delete message");
      }
    }
  }, [client, message.id]);

  return (
    <div
      className={cn(
        "absolute top-0 flex items-center gap-0.5 rounded-lg border border-border/50 bg-popover p-1 shadow-lg",
        "transition-all duration-150",
        position === "left" ? "right-full mr-2" : "left-full ml-2",
        isVisible || isEmojiOpen
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-1 pointer-events-none"
      )}
    >
      {/* Add reaction */}
      <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
        <PopoverTrigger
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Add reaction"
        >
          <Smile className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent side="top" align="center" className="w-auto p-2">
          <div className="flex gap-1">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="rounded p-1 text-lg transition-transform hover:scale-125 hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Reply in thread */}
      {message.parent_id === undefined && (
        <ActionButton icon={CornerDownRight} label="Reply in thread" onClick={handleReply} />
      )}

      {/* Copy text */}
      <ActionButton icon={Copy} label="Copy text" onClick={handleCopy} />

      {/* Edit - only for own messages */}
      {isOwn && <ActionButton icon={Edit3} label="Edit" onClick={handleEdit} />}

      {/* Delete - only for own messages */}
      {isOwn && (
        <ActionButton
          icon={Trash2}
          label="Delete"
          onClick={handleDelete}
          destructive
        />
      )}
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  destructive?: boolean;
}

function ActionButton({ icon: Icon, label, onClick, destructive }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <button
          onClick={onClick}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            destructive
              ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
