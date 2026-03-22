"use client";

import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useChatContext } from "stream-chat-react";
import { toast } from "sonner";
import {
  LogOut,
  Settings,
  Keyboard,
  User,
  Circle,
  Moon,
  MinusCircle,
  XCircle,
} from "lucide-react";

interface UserMenuProps {
  onLogout: () => void;
}

type UserStatus = "online" | "away" | "dnd" | "offline";

const statusConfig = {
  online: { label: "Online", icon: Circle, color: "text-emerald-400", bg: "bg-emerald-400" },
  away: { label: "Away", icon: Moon, color: "text-amber-400", bg: "bg-amber-400" },
  dnd: { label: "Do Not Disturb", icon: MinusCircle, color: "text-rose-400", bg: "bg-rose-400" },
  offline: { label: "Offline", icon: XCircle, color: "text-gray-400", bg: "bg-gray-400" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({ onLogout }: UserMenuProps) {
  const { session } = useAuth();
  const { client } = useChatContext();
  const [status, setStatus] = useState<UserStatus>("online");
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [open, setOpen] = useState(false);

  // Initialise from Stream user data on mount
  useEffect(() => {
    const streamStatus = client.user?.status;
    if (typeof streamStatus === "string") {
      const match = (Object.keys(statusConfig) as UserStatus[]).find(
        (key) => statusConfig[key].label === streamStatus
      );
      setStatus(match ?? "online");
    }
  }, [client.user?.status]);

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <div className="w-full group cursor-pointer">
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-2.5 backdrop-blur-sm transition-all duration-200 hover:bg-card/80 hover:border-border/80 hover:shadow-depth-1">
            <div className="relative shrink-0">
              <Avatar className="h-9 w-9 ring-1 ring-border/60">
                <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                  {session ? initials(session.displayName) : "?"}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar ${currentStatus.bg} ring-2 ring-sidebar`} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold leading-tight">
                {session?.displayName ?? "—"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                @{session?.streamUserId ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </PopoverTrigger>
      
      <PopoverContent 
        side="top" 
        align="start" 
        className="w-64 p-0 glass-strong border-border/50 shadow-depth-4 animate-scale-in"
        sideOffset={8}
      >
        {/* Profile Preview */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                  {session ? initials(session.displayName) : "?"}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-popover ${currentStatus.bg}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{session?.displayName ?? "—"}</p>
              <p className="text-xs text-muted-foreground truncate">@{session?.streamUserId ?? "—"}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <StatusIcon className={`h-3 w-3 ${currentStatus.color}`} />
                <span className="text-xs text-muted-foreground">{currentStatus.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="p-2">
          <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Set Status
          </p>
          {(Object.keys(statusConfig) as UserStatus[]).map((s) => {
            const config = statusConfig[s];
            const Icon = config.icon;
            return (
              <button
                key={s}
                disabled={syncingStatus}
              onClick={async () => {
                if (syncingStatus) return;
                setStatus(s);
                setSyncingStatus(true);
                try {
                  await client.partialUpdateUser({
                    id: session!.streamUserId,
                    set: { status: statusConfig[s].label },
                  });
                } catch {
                  setStatus(status);
                  toast.error("Failed to update status");
                } finally {
                  setSyncingStatus(false);
                }
              }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  status === s 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${config.color}`} />
                <span>{config.label}</span>
                {status === s && (
                  <span className="ml-auto text-xs text-primary">Active</span>
                )}
              </button>
            );
          })}
        </div>

        <Separator className="bg-border/50" />

        {/* Menu Items */}
        <div className="p-2 space-y-0.5">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-muted transition-colors">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Profile</span>
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-muted transition-colors">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Settings</span>
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-muted transition-colors">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            <span>Keyboard Shortcuts</span>
            <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        <Separator className="bg-border/50" />

        {/* Logout */}
        <div className="p-2">
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
