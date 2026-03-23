"use client";

import { useCallback, useState } from "react";
import { useChannelStateContext, useChatContext } from "stream-chat-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { X, CornerDownRight } from "lucide-react";
import type { MessageResponse } from "stream-chat";

interface ThreadPanelProps {
  parentMessageId: string;
  onClose: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ThreadPanel({ parentMessageId, onClose }: ThreadPanelProps) {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const { session } = useAuth();
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const channelType =
    (channel as unknown as { type?: string }).type ?? undefined;
  const isAdminReadonly = session?.role === "admin" && channelType === "classroom";
  if (isAdminReadonly) return null;

  // Get parent message from channel state
  const parentMessage = channel.state.messages.find((m) => m.id === parentMessageId);
  const replies = channel.state.threads[parentMessageId] || [];

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || isSending) return;

    setIsSending(true);
    try {
      await channel.sendMessage({
        text: replyText,
        parent_id: parentMessageId,
        show_in_channel: false,
      });
      setReplyText("");
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setIsSending(false);
    }
  }, [channel, parentMessageId, replyText, isSending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (!parentMessage) {
    return null;
  }

  const parentUserName = parentMessage.user?.name || parentMessage.user?.id || "Unknown";

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border/60 bg-background shadow-2xl animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <CornerDownRight className="h-5 w-5 text-primary" />
          <h3 className="font-semibold" style={{ fontFamily: "var(--font-syne)" }}>
            Thread
          </h3>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent message */}
      <div className="border-b border-border/40 bg-muted/30 px-4 py-4">
        <MessageBubble
          message={parentMessage as unknown as MessageResponse}
          isFirstInGroup={true}
          isLastInGroup={true}
          isThreadReply={false}
        />
      </div>

      {/* Reply count */}
      <div className="border-b border-border/40 px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </span>
      </div>

      {/* Replies */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 py-4">
          {replies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 rounded-full bg-muted p-3">
                <CornerDownRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No replies yet</p>
              <p className="text-xs text-muted-foreground/60">Be the first to reply!</p>
            </div>
          ) : (
            replies.map((reply, index) => (
              <MessageBubble
                key={reply.id}
                message={reply as unknown as MessageResponse}
                isFirstInGroup={true}
                isLastInGroup={index === replies.length - 1}
                isThreadReply={true}
              />
            ))
          )}
        </div>
        <TypingIndicator className="px-2" />
      </ScrollArea>

      {/* Reply input */}
      <div className="border-t border-border/60 p-4">
        <div className="flex items-end gap-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
              {client.user?.name ? getInitials(client.user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="relative flex-1">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Reply to ${parentUserName}...`}
              className={cn(
                "min-h-[44px] w-full resize-none rounded-2xl border border-border/60",
                "bg-secondary px-4 py-2.5 text-sm placeholder:text-muted-foreground/50",
                "focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30",
                "transition-all duration-200"
              )}
              rows={Math.min(5, Math.max(1, replyText.split("\n").length))}
              disabled={isSending}
            />
            <div className="absolute bottom-2 right-2">
              <Button
                size="sm"
                onClick={handleSendReply}
                disabled={!replyText.trim() || isSending}
                className="h-7 rounded-full px-3 text-xs"
              >
                Reply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
