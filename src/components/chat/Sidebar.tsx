"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useChatContext } from "stream-chat-react";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useAuth } from "@/contexts/AuthContext";
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
import { toast } from "sonner";
import {
  Plus,
  Users,
  MessageCircle,
  RefreshCw,
  Inbox,
  Hash,
  Bell,
  BellOff,
  Pin,
  Link2,
  CheckCheck,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { NewGroupModal } from "./NewGroupModal";
import { UserSearchModal } from "./UserSearchModal";
import { UserMenu } from "./UserMenu";
import { ChannelItem } from "./ChannelItem";
import { SearchBar } from "./SearchBar";
import { SectionHeader } from "./SectionHeader";
import { cn } from "@/lib/utils";
import type { Channel } from "stream-chat";

interface ChannelListState {
  channels: Channel[];
  loading: boolean;
}

export function Sidebar() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const { client, setActiveChannel } = useChatContext();
  const videoClient = useStreamVideoClient();
  
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDMModal, setShowDMModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelList, setChannelList] = useState<ChannelListState>({ channels: [], loading: true });
  const [expandedSections, setExpandedSections] = useState({
    dms: true,
    groups: true,
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
  
  // Filter channels based on search
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channelList.channels;
    
    const query = searchQuery.toLowerCase();
    return channelList.channels.filter(channel => {
      const channelData = channel.data as Record<string, unknown> | undefined;
      const name = (channelData?.name as string) || "";
      const members = Object.values(channel.state.members);
      const memberNames = members.map(m => m.user?.name || m.user?.id || "").join(" ");
      
      return name.toLowerCase().includes(query) || 
             memberNames.toLowerCase().includes(query);
    });
  }, [channelList.channels, searchQuery]);
  
  // Separate channels by type — groups have an explicit name, DMs do not
  const { directMessages, groupChats } = useMemo(() => {
    const dms: Channel[] = [];
    const groups: Channel[] = [];
    
    filteredChannels.forEach(channel => {
      const channelData = channel.data as Record<string, unknown> | undefined;
      const hasName = !!(channelData?.name as string | undefined)?.trim();
      if (hasName) {
        groups.push(channel);
      } else {
        dms.push(channel);
      }
    });
    
    return { directMessages: dms, groupChats: groups };
  }, [filteredChannels]);
  
  async function handleDMSelect(userId: string) {
    try {
      const channel = client.channel("messaging", {
        members: [session!.streamUserId, userId],
      });
      await channel.watch();
      setShowDMModal(false);
      await fetchChannels();
      setActiveChannel(channel);
      router.push(`/messages/${channel.id}`);
    } catch (error) {
      console.error("Failed to create DM:", error);
      toast.error("Failed to start conversation. Please try again.");
    }
  }
  
  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await client.disconnectUser(); } catch { /* best-effort */ }
    try { await videoClient?.disconnectUser(); } catch { /* best-effort */ }
    logout();
    router.replace("/login");
    toast.success("Logged out successfully");
  }
  
  function handleContextMenu(e: React.MouseEvent, channel: Channel) {
    e.preventDefault();
    e.stopPropagation();
    
    // Create a custom context menu
    const menuItems = [
      {
        label: channel.state.unreadCount ? "Mark as Read" : "Mark as Unread",
        icon: CheckCheck,
        action: () => {
          if (channel.state.unreadCount) {
            channel.markRead();
            toast.success("Marked as read");
          } else {
            // Mark as unread by sending a dummy event or similar
            toast.success("Marked as unread");
          }
        },
      },
      {
        label: "Mute Notifications",
        icon: BellOff,
        action: () => toast.success("Notifications muted"),
      },
      {
        label: "Pin to Top",
        icon: Pin,
        action: () => toast.success("Pinned to top"),
      },
      {
        label: "Copy Link",
        icon: Link2,
        action: () => {
          navigator.clipboard.writeText(`${window.location.origin}/messages/${channel.id}`);
          toast.success("Link copied to clipboard");
        },
      },
    ];
    
    const memberCount = Object.keys(channel.state.members).length;
    if (memberCount > 2) {
      menuItems.push({
        label: "Leave Group",
        icon: LogOut,
        action: () => {
          channel.removeMembers([session!.streamUserId]);
          toast.success("Left group successfully");
        },
      });
    }
    
    // Show toast with action info for now
    toast.info("Right-click menu: " + menuItems.map(i => i.label).join(", "));
  }
  
  function handleSidebarContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    toast.info("Right-click menu: Create DM, Create Group, Refresh");
  }
  
  const hasConversations = directMessages.length > 0 || groupChats.length > 0;
  
  return (
    <TooltipProvider>
      <aside 
        className="flex w-72 shrink-0 flex-col border-r border-border/60 bg-sidebar relative"
        onContextMenu={handleSidebarContextMenu}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 shadow-glow">
              <span 
                className="text-sm font-bold text-primary" 
                style={{ fontFamily: "var(--font-syne)" }}
              >
                S
              </span>
            </div>
            <span 
              className="text-sm font-bold tracking-tight gradient-text" 
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Messages
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setShowDMModal(true)}
              className="text-muted-foreground hover:text-foreground hover:bg-white/5 hover-scale"
              title="New DM (⌘N)"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setShowGroupModal(true)}
              className="text-muted-foreground hover:text-foreground hover:bg-white/5 hover-scale"
              title="New Group (⌘G)"
            >
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="px-3 pb-3">
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search conversations..."
          />
        </div>

        {/* ── Channel List ── */}
        <ScrollArea className="flex-1 min-h-0 px-2">
          {channelList.loading ? (
            // Loading state
            <div className="space-y-2 p-2">
              {[...Array(6)].map((_, i) => (
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
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 animate-float">
                <Inbox className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                No conversations yet
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Start a new conversation to get messaging
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDMModal(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Message
                </Button>
              </div>
            </div>
          ) : (
            // Channel list
            <div className="pb-4 space-y-1">
              {/* Direct Messages Section */}
              {directMessages.length > 0 && (
                <div>
                  <SectionHeader
                    title="Direct Messages"
                    count={directMessages.length}
                    isExpanded={expandedSections.dms}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, dms: !prev.dms }))}
                  />
                  <div
                    className={cn(
                      "space-y-0.5 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      expandedSections.dms ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    {directMessages.map((channel, index) => (
                      <div 
                        key={channel.id} 
                        onContextMenu={(e) => handleContextMenu(e, channel)}
                      >
                        <ChannelItem channel={channel} index={index} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Group Chats Section */}
              {groupChats.length > 0 && (
                <div>
                  <SectionHeader
                    title="Group Chats"
                    count={groupChats.length}
                    isExpanded={expandedSections.groups}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, groups: !prev.groups }))}
                  />
                  <div
                    className={cn(
                      "space-y-0.5 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      expandedSections.groups ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    {groupChats.map((channel, index) => (
                      <div 
                        key={channel.id}
                        onContextMenu={(e) => handleContextMenu(e, channel)}
                      >
                        <ChannelItem channel={channel} index={index} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* ── User Card ── */}
        <div className="border-t border-border/60 p-3">
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
                Are you sure you want to log out? You will need to sign in again to access your messages.
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
