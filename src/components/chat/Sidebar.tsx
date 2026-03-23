"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useChatContext } from "stream-chat-react";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Users,
  Inbox,
  AlertTriangle,
  LogOut,
  GraduationCap,
  Hash,
  LayoutDashboard,
  Shield,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useUIActionsRegistry } from "@/contexts/UIActionsContext";
import { NewGroupModal } from "./NewGroupModal";
import { UserSearchModal } from "./UserSearchModal";
import { UserMenu } from "./UserMenu";
import { ChannelItem } from "./ChannelItem";
import { SearchBar } from "./SearchBar";
import { SectionHeader } from "./SectionHeader";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";
import type { Channel } from "stream-chat";

interface ChannelListState {
  channels: Channel[];
  loading: boolean;
}

// Generate a stable color from class ID
function getClassColor(classId: string): string {
  const colors = [
    "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#22C55E",
    "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9", "#3B82F6",
    "#6366F1", "#8B5CF6", "#A855F7", "#D946EF", "#EC4899", "#F43F5E",
  ];
  let hash = 0;
  for (let i = 0; i < classId.length; i++) {
    hash = classId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { client, setActiveChannel } = useChatContext();
  const videoClient = useStreamVideoClient();
  
  const { registerDMOpener, registerGroupOpener } = useUIActionsRegistry();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDMModal, setShowDMModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pinnedChannelIds, setPinnedChannelIds] = useState<Set<string>>(new Set());
  const [mutedChannelIds, setMutedChannelIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [channelList, setChannelList] = useState<ChannelListState>({ channels: [], loading: true });
  const [expandedSections, setExpandedSections] = useState({
    dms: true,
    groups: true,
    classes: true,
  });
  
  // Fetch channels
  const fetchChannels = useCallback(async () => {
    if (!client || !session) return;
    
    setChannelList(prev => ({ ...prev, loading: true }));
    try {
      const filters = {
        type: "messaging" as const,
        members: { $in: [session.streamUserId] },
      };
      const sort = { last_message_at: -1 as const };
      const options = { limit: 50 };
      
      const channels = await client.queryChannels(filters, sort, options);
      setChannelList({ channels, loading: false });
    } catch (error) {
      console.error("Failed to fetch channels:", error);
      setChannelList(prev => ({ ...prev, loading: false }));
    }
  }, [client, session]);
  
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Register modal openers with UIActionsContext so CommandPalette can trigger them
  useEffect(() => {
    registerDMOpener(() => setShowDMModal(true));
    registerGroupOpener(() => setShowGroupModal(true));
  }, [registerDMOpener, registerGroupOpener]);

  // Load pinned channels from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("pinnedChannels");
    if (stored) {
      try { setPinnedChannelIds(new Set(JSON.parse(stored))); } catch { /* ignore */ }
    }
  }, []);

  // Initialise muted channel IDs from already-loaded channels
  useEffect(() => {
    if (channelList.channels.length === 0) return;
    const muted = new Set<string>();
    channelList.channels.forEach((ch) => {
      if (ch.muteStatus().muted) muted.add(ch.id!);
    });
    setMutedChannelIds(muted);
  }, [channelList.channels]);
  
  // Filter channels based on search
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channelList.channels;
    const query = searchQuery.toLowerCase();
    return channelList.channels.filter((channel) => {
      const name = ((channel.data as any)?.name || "").toLowerCase();
      return name.includes(query);
    });
  }, [channelList.channels, searchQuery]);
  
  // Partition into DMs and groups
  const { directMessages, groupChats } = useMemo(() => {
    const dms: Channel[] = [];
    const groups: Channel[] = [];
    filteredChannels.forEach((ch) => {
      const memberCount = Object.keys(ch.state.members || {}).length;
      if (memberCount === 2) {
        dms.push(ch);
      } else {
        groups.push(ch);
      }
    });
    return { directMessages: dms, groupChats: groups };
  }, [filteredChannels]);
  
  // Sort: pinned first, then by last message
  const sortChannels = (channels: Channel[]) => {
    return [...channels].sort((a, b) => {
      const aPinned = pinnedChannelIds.has(a.id!);
      const bPinned = pinnedChannelIds.has(b.id!);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      const aTime = a.state.last_message_at?.getTime() || 0;
      const bTime = b.state.last_message_at?.getTime() || 0;
      return bTime - aTime;
    });
  };
  
  const sortedDMs = useMemo(() => sortChannels(directMessages), [directMessages, pinnedChannelIds]);
  const sortedGroups = useMemo(() => sortChannels(groupChats), [groupChats, pinnedChannelIds]);

  // Fetch classes (admins see all org classes, not only classes where they are teacherId)
  const teacherClasses = useQuery(
    api.classes.getClassesByTeacher,
    session?.role === "teacher" || session?.role === "co_teacher" ? {} : "skip",
  );
  const adminOrgClasses = useQuery(
    api.admin.getAllClasses,
    session?.role === "admin" ? {} : "skip",
  );
  const studentClasses = useQuery(
    api.classes.getClassesByStudent,
    session?.role === "student" ? {} : "skip"
  );
  const classes =
    session?.role === "admin"
      ? (adminOrgClasses ?? []).filter((c) => !c.isArchived)
      : teacherClasses || studentClasses || [];
  const isAdmin = session?.role === "admin";

  // Handlers
  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      await videoClient?.disconnectUser();
      await client?.disconnectUser();
      router.push("/login");
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }

  async function handleDMSelect(userId: string) {
    if (!client || !session) return;
    try {
      const channel = client.channel("messaging", {
        members: [session.streamUserId, userId],
      });
      await channel.watch();
      setActiveChannel(channel);
      router.push(`/messages/${channel.id}`);
      setShowDMModal(false);
    } catch {
      toast.error("Failed to start conversation");
    }
  }

  function handleMarkRead(channel: Channel) {
    const hasUnread = channel.state.unreadCount > 0;
    if (hasUnread) {
      channel.markRead();
      toast.success("Marked as read");
    } else {
      toast.success("Already read");
    }
  }

  async function handleToggleMute(channel: Channel) {
    try {
      if (mutedChannelIds.has(channel.id!)) {
        await channel.unmute();
        setMutedChannelIds((prev) => {
          const next = new Set(prev);
          next.delete(channel.id!);
          return next;
        });
        toast.success("Unmuted notifications");
      } else {
        await channel.mute();
        setMutedChannelIds((prev) => new Set(prev).add(channel.id!));
        toast.success("Muted notifications");
      }
    } catch {
      toast.error("Failed to update notification settings");
    }
  }

  function handleTogglePin(channel: Channel) {
    setPinnedChannelIds((prev) => {
      const next = new Set(prev);
      if (next.has(channel.id!)) {
        next.delete(channel.id!);
        toast.success("Unpinned");
      } else {
        next.add(channel.id!);
        toast.success("Pinned to top");
      }
      localStorage.setItem("pinnedChannels", JSON.stringify([...next]));
      return next;
    });
  }

  function handleCopyLink(channel: Channel) {
    navigator.clipboard.writeText(`${window.location.origin}/dashboard`);
    toast.success("Link copied to clipboard");
  }

  function handleLeaveGroup(channel: Channel) {
    channel.removeMembers([session!.streamUserId]);
    toast.success("Left group successfully");
  }

  const hasConversations = directMessages.length > 0 || groupChats.length > 0;
  const isOnClassesPage = pathname?.startsWith("/class/");
  
  return (
    <TooltipProvider>
      <aside className="flex w-72 shrink-0 flex-col h-full min-h-0 border-r border-border/60 bg-sidebar relative">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 shadow-glow">
              <span className="text-sm font-bold text-primary" style={{ fontFamily: "var(--font-syne)" }}>
                S
              </span>
            </div>
            <span className="text-sm font-bold tracking-tight gradient-text" style={{ fontFamily: "var(--font-syne)" }}>
              StreamSchool
            </span>
          </div>
          <NotificationBell />
        </div>

        {/* ── Main Navigation ── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-1">
            {/* Dashboard */}
            <Link href="/dashboard">
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                pathname === "/dashboard" 
                  ? "bg-primary/10 text-primary" 
                  : "text-foreground hover:bg-muted"
              )}>
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </div>
            </Link>

            {/* Classes - Expandable */}
            <div className="space-y-1">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, classes: !prev.classes }))}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isOnClassesPage 
                    ? "bg-primary/10 text-primary" 
                    : "text-foreground hover:bg-muted"
                )}
              >
                <GraduationCap className="h-4 w-4" />
                <span className="flex-1 text-left">Classes</span>
                {expandedSections.classes ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {/* Classes List */}
              {expandedSections.classes && (
                <div className="ml-4 space-y-1">
                  {/* Create Class Button (Admins only) */}
                  {isAdmin && (
                    <Link href="/class/create">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
                        <Plus className="h-4 w-4" />
                        <span>Create New Class</span>
                      </div>
                    </Link>
                  )}

                  {/* Class Items */}
                  {classes.map((cls) => (
                    <Link key={cls._id} href={`/class/${cls._id}`}>
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                        pathname === `/class/${cls._id}`
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      )}>
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: getClassColor(cls._id) }}
                        />
                        <span className="flex-1 truncate">{cls.name}</span>
                      </div>
                    </Link>
                  ))}

                  {classes.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No classes yet
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Meetings link (teachers + admins) */}
            {(isAdmin || session?.role === "teacher" || session?.role === "co_teacher") && (
              <Link href="/meetings">
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  pathname === "/meetings"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted",
                )}>
                  <Video className="h-4 w-4" />
                  <span>Meetings</span>
                </div>
              </Link>
            )}

            {/* Assignments link (students only) */}
            {session?.role === "student" && (
              <Link href="/assignments">
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  pathname === "/assignments"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted",
                )}>
                  <FileText className="h-4 w-4" />
                  <span>Assignments</span>
                </div>
              </Link>
            )}

            {/* Divider */}
            <div className="my-2 h-px bg-border/60" />

            {/* Role-specific Links */}
            {session?.role === "parent" && (
              <Link href="/parent">
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  pathname?.startsWith("/parent")
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                )}>
                  <Users className="h-4 w-4" />
                  <span>Parent Portal</span>
                </div>
              </Link>
            )}

            {(session?.role === "admin") && (
              <Link href="/admin">
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  pathname?.startsWith("/admin")
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                )}>
                  <Shield className="h-4 w-4" />
                  <span>Admin Panel</span>
                </div>
              </Link>
            )}

            {/* Divider */}
            <div className="my-2 h-px bg-border/60" />

            {/* Messages Section Header */}
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Conversations
              </p>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
              <SearchBar 
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search..."
              />
            </div>

            {/* New Message Buttons */}
            <div className="px-3 pb-2 flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDMModal(true)}
                className="flex-1 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                New DM
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowGroupModal(true)}
                className="flex-1 text-xs"
              >
                <Users className="h-3 w-3 mr-1" />
                Group
              </Button>
            </div>

            {/* Conversations List */}
            {channelList.loading ? (
              <div className="space-y-2 p-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !hasConversations ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No conversations</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Direct Messages */}
                {sortedDMs.length > 0 && (
                  <div>
                    <SectionHeader
                      title="Direct Messages"
                      count={sortedDMs.length}
                      isExpanded={expandedSections.dms}
                      onToggle={() => setExpandedSections(prev => ({ ...prev, dms: !prev.dms }))}
                    />
                    {expandedSections.dms && (
                      <div className="space-y-0.5">
                        {sortedDMs.map((channel, index) => (
                          <ContextMenu key={channel.id}>
                            <ContextMenuTrigger>
                              <div>
                                <ChannelItem channel={channel} index={index} />
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-52">
                              <ContextMenuItem onClick={() => handleMarkRead(channel)}>
                                {channel.state.unreadCount ? "Mark as Read" : "Mark as Unread"}
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleToggleMute(channel)}>
                                {mutedChannelIds.has(channel.id!) ? "Unmute" : "Mute"}
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleTogglePin(channel)}>
                                {pinnedChannelIds.has(channel.id!) ? "Unpin" : "Pin"}
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Group Chats */}
                {sortedGroups.length > 0 && (
                  <div>
                    <SectionHeader
                      title="Group Chats"
                      count={sortedGroups.length}
                      isExpanded={expandedSections.groups}
                      onToggle={() => setExpandedSections(prev => ({ ...prev, groups: !prev.groups }))}
                    />
                    {expandedSections.groups && (
                      <div className="space-y-0.5">
                        {sortedGroups.map((channel, index) => (
                          <ContextMenu key={channel.id}>
                            <ContextMenuTrigger>
                              <div>
                                <ChannelItem channel={channel} index={index} />
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-52">
                              <ContextMenuItem onClick={() => handleMarkRead(channel)}>
                                {channel.state.unreadCount ? "Mark as Read" : "Mark as Unread"}
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleToggleMute(channel)}>
                                {mutedChannelIds.has(channel.id!) ? "Unmute" : "Mute"}
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleTogglePin(channel)}>
                                {pinnedChannelIds.has(channel.id!) ? "Unpin" : "Pin"}
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleLeaveGroup(channel)}
                              >
                                Leave Group
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── User Card ── */}
        <div className="border-t border-border/60 p-3 mt-auto">
          <UserMenu onLogout={() => setShowLogoutConfirm(true)} />
        </div>

        {/* ── Modals ── */}
        {showGroupModal && (
          <NewGroupModal
            onClose={(channelId) => {
              setShowGroupModal(false);
              if (channelId) {
                fetchChannels();
                router.push(`/messages/${channelId}`);
              }
            }}
          />
        )}
        
        {showDMModal && (
          <UserSearchModal
            onSelect={handleDMSelect}
            onClose={() => setShowDMModal(false)}
          />
        )}
        
        {/* Logout Confirmation Dialog */}
        <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <DialogContent className="glass-strong border-border/50 max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirm Logout
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to log out?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={loggingOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Logging out..." : "Log Out"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </aside>
    </TooltipProvider>
  );
}
