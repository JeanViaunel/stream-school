"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChannelList,
  ChannelPreviewMessenger,
  useChatContext,
  type ChannelPreviewUIComponentProps,
} from "stream-chat-react";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LogOut, MessageSquare, Users } from "lucide-react";
import { NewGroupModal } from "./NewGroupModal";
import { UserSearchModal } from "./UserSearchModal";

function PresenceChannelPreview(props: ChannelPreviewUIComponentProps) {
  const { client } = useChatContext();
  const router = useRouter();
  const members = Object.values(props.channel.state.members);
  const otherMember =
    members.length === 2
      ? members.find((m) => m.user?.id !== client.userID)
      : null;
  const isOnline = otherMember?.user?.online ?? false;

  function handleClick() {
    router.push(`/messages/${props.channel.id}`);
  }

  return (
    <div className="relative" onClick={handleClick}>
      {otherMember && (
        <span
          className={`absolute left-[26px] top-[26px] z-10 h-2.5 w-2.5 rounded-full ring-2 ring-background ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      )}
      <ChannelPreviewMessenger {...props} />
    </div>
  );
}

function displayInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const { client } = useChatContext();
  const videoClient = useStreamVideoClient();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDMModal, setShowDMModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const filters = {
    type: "messaging",
    members: { $in: [session?.streamUserId ?? ""] },
  };
  const sort = { last_message_at: -1 as const };
  const options = { limit: 30 };

  async function handleDMSelect(userId: string) {
    const channel = client.channel("messaging", {
      members: [session!.streamUserId, userId],
    });
    await channel.watch();
    setShowDMModal(false);
    router.push(`/messages/${channel.id}`);
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await client.disconnectUser();
    } catch {
      /* best-effort */
    }
    try {
      await videoClient?.disconnectUser();
    } catch {
      /* best-effort */
    }
    logout();
    router.replace("/login");
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border/80 bg-sidebar text-sidebar-foreground shadow-[inset_-1px_0_0_0_oklch(0_0_0/4%)] dark:shadow-[inset_-1px_0_0_0_oklch(1_0_0/6%)]">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight">Messages</p>
          <p className="truncate text-xs text-muted-foreground">
            Direct & group chats
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setShowDMModal(true)}
            title="New direct message"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setShowGroupModal(true)}
            title="New group"
          >
            <Users className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
        <ChannelList
          filters={filters}
          sort={sort}
          options={options}
          showChannelSearch
          Preview={PresenceChannelPreview}
        />
      </div>

      <Separator />

      <div className="p-3">
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-2.5 shadow-sm">
          <div className="relative shrink-0">
            <Avatar size="sm" className="ring-1 ring-border/80">
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {session ? displayInitials(session.displayName) : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {session?.displayName ?? "Signed in"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              @{session?.streamUserId ?? "—"}
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            title="Log out"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
      </div>

      {showGroupModal && (
        <NewGroupModal
          onClose={(channelId) => {
            setShowGroupModal(false);
            if (channelId) router.push(`/messages/${channelId}`);
          }}
        />
      )}
      {showDMModal && (
        <UserSearchModal
          onSelect={handleDMSelect}
          onClose={() => setShowDMModal(false)}
        />
      )}
    </aside>
  );
}
