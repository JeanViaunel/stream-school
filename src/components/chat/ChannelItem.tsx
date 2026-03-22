"use client";

import { useRouter, useParams } from "next/navigation";
import { useChatContext } from "stream-chat-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { Channel } from "stream-chat";

interface ChannelItemProps {
  channel: Channel;
  index?: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  } else {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export function ChannelItem({ channel, index = 0 }: ChannelItemProps) {
  const router = useRouter();
  const params = useParams();
  const { client } = useChatContext();
  const { session } = useAuth();
  
  const isActive = params.channelId === channel.id;
  const members = Object.values(channel.state.members);
  const isGroup = members.length > 2;
  
  // Get other member for DMs
  const otherMember = !isGroup 
    ? members.find((m) => m.user?.id !== client.userID)
    : null;
  
  const isOnline = otherMember?.user?.online ?? false;
  
  // Get channel name
  const channelData = channel.data as Record<string, unknown> | undefined;
  const channelName = (channelData?.name as string) || 
    (isGroup 
      ? `Group (${members.length})`
      : otherMember?.user?.name || otherMember?.user?.id || "Unknown"
    );
  
  // Get last message
  const lastMessage = channel.state.messages[channel.state.messages.length - 1];
  const lastMessageText = lastMessage?.text || "No messages yet";
  const lastMessageSender = lastMessage?.user?.id === session?.streamUserId 
    ? "You: " 
    : "";
  
  // Get unread count
  const unreadCount = channel.state.unreadCount || 0;
  
  // Get last message time
  const lastMessageTime = lastMessage?.created_at || channel.data?.last_message_at;
  
  function handleClick() {
    router.push(`/messages/${channel.id}`);
  }
  
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    // Context menu will be handled by parent
  }
  
  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer",
        "transition-all duration-200 ease-out",
        "animate-ink-fade-up",
        isActive 
          ? "bg-primary/10 border-l-2 border-primary" 
          : "hover:bg-white/5 border-l-2 border-transparent"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Hover indicator */}
      <div 
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 rounded-full bg-primary transition-all duration-200",
          !isActive && "group-hover:h-8 group-hover:rounded-full"
        )} 
      />
      
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className={cn(
          "h-10 w-10 ring-1 transition-all duration-200",
          isActive ? "ring-primary/30" : "ring-border/50 group-hover:ring-border"
        )}>
          <AvatarFallback className={cn(
            "text-xs font-semibold transition-colors duration-200",
            isActive ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary/80"
          )}>
            {initials(channelName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Online indicator for DMs */}
        {!isGroup && (
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar transition-colors duration-200",
            isOnline ? "bg-emerald-400" : "bg-white/20"
          )} />
        )}
        
        {/* Group indicator */}
        {isGroup && (
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-secondary border-2 border-sidebar flex items-center justify-center">
            <span className="text-[8px] font-bold text-secondary-foreground">
              {members.length}
            </span>
          </span>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "truncate text-sm font-medium transition-colors duration-200",
            isActive ? "text-foreground" : "text-foreground/90 group-hover:text-foreground",
            unreadCount > 0 && "font-semibold"
          )}>
            {channelName}
          </p>
          {lastMessageTime && (
            <span className={cn(
              "text-[10px] shrink-0 transition-colors duration-200",
              isActive ? "text-muted-foreground" : "text-muted-foreground/70 group-hover:text-muted-foreground"
            )}>
              {formatTime(lastMessageTime)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            "truncate text-xs transition-colors duration-200",
            isActive ? "text-muted-foreground" : "text-muted-foreground/70 group-hover:text-muted-foreground",
            unreadCount > 0 && "text-foreground/80"
          )}>
            {lastMessageSender}{lastMessageText}
          </p>
          
          {unreadCount > 0 && (
            <Badge 
              variant="default" 
              className="shrink-0 h-4 min-w-4 px-1 text-[10px] font-semibold bg-primary text-primary-foreground"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
