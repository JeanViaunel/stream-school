"use client";

import { useState, useCallback } from "react";
import { useChatContext, useChannelStateContext } from "stream-chat-react";
import type { MessageResponse } from "stream-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageActions } from "./MessageActions";
import { Check, CheckCheck, Clock, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: MessageResponse;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isThreadReply?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMessageTime(dateStr: string | Date): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatFullDate(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  let dateLabel: string;
  if (date.toDateString() === today.toDateString()) {
    dateLabel = "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    dateLabel = "Yesterday";
  } else {
    dateLabel = date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
  }
  
  return `${dateLabel} at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`;
}

function renderMessageText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  if (!urlRegex.test(text)) {
    return <span className="whitespace-pre-wrap break-words">{text}</span>;
  }

  const parts = text.split(urlRegex);
  const matches = text.match(urlRegex) || [];

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {matches[i] && (
            <a
              href={matches[i]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {matches[i]}
            </a>
          )}
        </span>
      ))}
    </span>
  );
}

export function MessageBubble({
  message,
  isFirstInGroup = true,
  isLastInGroup = true,
  isThreadReply = false,
}: MessageBubbleProps) {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const [isHovered, setIsHovered] = useState(false);
  
  const isOwn = message.user?.id === client.userID;
  const userName = message.user?.name || message.user?.id || "Unknown";
  const userImage = message.user?.image as string | undefined;
  const messageDate = new Date(message.created_at || Date.now());
  const isEdited = message.updated_at && message.updated_at !== message.created_at;
  
  // Read receipts
  const readBy = Object.values(channel.state.read).filter(
    (read) => read.user.id !== client.userID && new Date(read.last_read) >= messageDate
  );
  const isRead = readBy.length > 0;

  // Border radius based on position in group
  const bubbleRadius = isOwn
    ? isFirstInGroup && isLastInGroup
      ? "rounded-2xl"
      : isFirstInGroup
      ? "rounded-2xl rounded-br-md"
      : isLastInGroup
      ? "rounded-2xl rounded-tr-md"
      : "rounded-2xl rounded-r-md"
    : isFirstInGroup && isLastInGroup
    ? "rounded-2xl"
    : isFirstInGroup
    ? "rounded-2xl rounded-bl-md"
    : isLastInGroup
    ? "rounded-2xl rounded-tl-md"
    : "rounded-2xl rounded-l-md";

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-1 animate-scale-in",
        isOwn ? "flex-row-reverse" : "flex-row",
        isThreadReply && "px-2"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ animationDelay: "0.05s" }}
    >
      {/* Avatar - only show on first message in group */}
      {isFirstInGroup ? (
        <div className="shrink-0 pt-1">
          <Avatar className={cn("h-8 w-8 ring-1 ring-border/50", isOwn && "order-2")}>
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
        </div>
      ) : (
        <div className="shrink-0 w-8" />
      )}

      {/* Message content */}
      <div className={cn("flex max-w-[75%] flex-col", isOwn ? "items-end" : "items-start")}>
        {/* Sender name - only on first in group */}
        {isFirstInGroup && !isOwn && (
          <span className="mb-0.5 px-1 text-xs font-medium text-muted-foreground">
            {userName}
          </span>
        )}

        {/* Message bubble */}
        <div className="relative">
          <div
            className={cn(
              "relative px-4 py-2.5 shadow-sm transition-shadow duration-200",
              "hover:shadow-md",
              bubbleRadius,
              isOwn
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {/* Message text */}
            <div className="text-sm leading-relaxed">
              {renderMessageText(message.text || "")}
            </div>

            {/* Attachments */}
            {message.attachments?.map((attachment, idx) => (
              <div key={idx} className="mt-2">
                {attachment.type === "image" ? (
                  <img
                    src={attachment.image_url || attachment.thumb_url}
                    alt="Attachment"
                    className="max-h-64 rounded-lg object-cover"
                  />
                ) : attachment.type === "file" ? (
                  <a
                    href={attachment.asset_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm hover:bg-background"
                  >
                    <span className="truncate">{attachment.title || "File"}</span>
                  </a>
                ) : null}
              </div>
            ))}

            {/* Reactions */}
            {message.reaction_counts && Object.keys(message.reaction_counts).length > 0 && (
              <div
                className={cn(
                  "mt-1.5 flex flex-wrap gap-1",
                  isOwn ? "justify-end" : "justify-start"
                )}
              >
                {Object.entries(message.reaction_counts).map(([type, count]) => (
                  <button
                    key={type}
                    className="inline-flex items-center gap-0.5 rounded-full bg-background/20 px-1.5 py-0.5 text-xs backdrop-blur-sm transition-transform hover:scale-110"
                  >
                    <span>{type}</span>
                    {count > 1 && <span className="text-[10px] opacity-80">{count}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hover actions */}
          <MessageActions
            message={message}
            isOwn={isOwn}
            isVisible={isHovered}
            position={isOwn ? "left" : "right"}
          />
        </div>

        {/* Metadata row */}
        <div
          className={cn(
            "mt-1 flex items-center gap-2 px-1",
            isOwn ? "flex-row-reverse" : "flex-row"
          )}
        >
          {/* Timestamp */}
          <Tooltip>
            <TooltipTrigger>
              <span className="text-[11px] text-muted-foreground/70 cursor-default">
                {formatMessageTime(message.created_at!)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {formatFullDate(message.created_at!)}
            </TooltipContent>
          </Tooltip>

          {/* Edited indicator */}
          {isEdited && (
            <Tooltip>
              <TooltipTrigger>
                <Edit3 className="h-3 w-3 text-muted-foreground/50 cursor-default" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Edited {formatMessageTime(message.updated_at!)}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Read receipts - only for own messages */}
          {isOwn && (
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center cursor-default">
                  {isRead ? (
                    <CheckCheck className="h-3.5 w-3.5 text-primary" />
                  ) : message.status === "sending" ? (
                    <Clock className="h-3.5 w-3.5 animate-pulse text-muted-foreground" />
                  ) : (
                    <Check className="h-3.5 w-3.5 text-muted-foreground/50" />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isRead
                  ? `Read by ${readBy.map((r) => r.user.name || r.user.id).join(", ")}`
                  : message.status === "sending"
                  ? "Sending..."
                  : "Sent"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
