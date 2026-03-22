"use client";

import { useState, useEffect, useRef } from "react";
import {
  Channel,
  MessageList,
  MessageSimple,
  Thread,
  Window,
  useChannelStateContext,
  useChatContext,
  useMessageContext,
} from "stream-chat-react";
import { CallButton } from "@/components/call/CallButton";
import { CallMessageCard } from "@/components/call/CallMessage";
import { ThreadPanel } from "./ThreadPanel";
import { ScrollToBottom } from "./ScrollToBottom";
import { CustomMessageInput } from "./CustomMessageInput";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Search,
  Info,
  MoreVertical,
  ChevronLeft,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function CustomChannelHeader() {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get channel info with type assertions
  const channelData = channel.data as Record<string, unknown> | undefined;
  const channelName = (channelData?.name as string) || "Unnamed Channel";
  const channelImage = channelData?.image as string | undefined;
  const memberCount = Object.keys(channel.state.members).length;
  
  // Check if DM
  const members = Object.values(channel.state.members);
  const isDM = members.length === 2;
  const otherMember = isDM
    ? members.find((m) => m.user?.id !== client.userID)?.user
    : null;
  const isOnline = otherMember?.online ?? false;
  
  // Use other member info for DMs
  const displayName = isDM ? otherMember?.name || otherMember?.id || "Unknown" : channelName;
  const displayImage = isDM ? (otherMember?.image as string | undefined) : channelImage;

  return (
    <div className="relative flex items-center border-b border-border/60 bg-card/50 px-4 py-3 backdrop-blur-md">
      {/* Mobile back button */}
      {isMobile && (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => router.push("/messages")}
          className="mr-2 h-8 w-8 shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Channel/DM Avatar */}
      <div className="relative mr-3 shrink-0">
        <Avatar className="h-10 w-10 ring-2 ring-border/50">
          <AvatarImage src={displayImage} alt={displayName} />
          <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        {isDM && (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card",
              isOnline ? "bg-emerald-400" : "bg-white/20"
            )}
          />
        )}
      </div>

      {/* Channel info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-semibold" style={{ fontFamily: "var(--font-syne)" }}>
            {displayName}
          </h2>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {isDM ? (
            isOnline ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online now
              </span>
            ) : (
              "Offline"
            )
          ) : (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {memberCount} members
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="ml-2 flex items-center gap-1">
        <CallButton />

        <Tooltip>
          <TooltipTrigger render={<Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Search className="h-4 w-4" />
            </Button>} />
          <TooltipContent side="bottom">Search messages</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger render={<Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Info className="h-4 w-4" />
            </Button>} />
          <TooltipContent side="bottom">Channel info</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>} />
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Mute notifications</DropdownMenuItem>
            <DropdownMenuItem>Mark as unread</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Leave channel</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Gradient underline */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
}

function CustomMessage() {
  const { message } = useMessageContext();
  const { client } = useChatContext();

  const callAttachment = message.attachments?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => a.type === "call"
  );

  if (callAttachment) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callId = (callAttachment as any).call_id as string;
    const senderName =
      message.user?.name || message.user?.id || "Someone";
    const isOwnMessage = message.user?.id === client.userID;

    return (
      <div className="px-4 py-1">
        <CallMessageCard
          callId={callId}
          senderName={senderName}
          isOwnMessage={isOwnMessage}
        />
      </div>
    );
  }

  return <MessageSimple />;
}

// Custom message list with enhanced features
function CustomMessageList() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenThread = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveThreadId(customEvent.detail?.messageId || null);
    };

    window.addEventListener("openThread", handleOpenThread);
    return () => window.removeEventListener("openThread", handleOpenThread);
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={scrollAreaRef} className="h-full overflow-y-auto scrollbar-thin">
        <MessageList Message={CustomMessage} />
      </div>
      <ScrollToBottom scrollAreaRef={scrollAreaRef} />
      
      {/* Thread panel */}
      {activeThreadId && (
        <ThreadPanel
          parentMessageId={activeThreadId}
          onClose={() => setActiveThreadId(null)}
        />
      )}
    </div>
  );
}

export function ChannelView() {
  return (
    <div className="flex h-full w-full flex-col">
      <Channel>
        <Window>
          <CustomChannelHeader />
          <CustomMessageList />
          <CustomMessageInput />
        </Window>
        <Thread />
      </Channel>
    </div>
  );
}
