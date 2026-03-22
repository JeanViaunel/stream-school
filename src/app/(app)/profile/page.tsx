"use client";

import { useState } from "react";
import { Sidebar } from "@/components/chat/Sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useChatContext } from "stream-chat-react";
import { toast } from "sonner";
import { Pencil, Check, X, User, AtSign, Calendar } from "lucide-react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
  const { session } = useAuth();
  const { client } = useChatContext();
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(session?.displayName ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSaveName() {
    if (!displayName.trim() || !session) return;
    setSaving(true);
    try {
      await client.partialUpdateUser({
        id: session.streamUserId,
        set: { name: displayName.trim() },
      });
      toast.success("Display name updated");
      setEditingName(false);
    } catch {
      toast.error("Failed to update display name");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelName() {
    setDisplayName(session?.displayName ?? "");
    setEditingName(false);
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-2xl font-bold tracking-tight gradient-text"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Profile
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your personal information
            </p>
          </div>

          {/* Avatar section */}
          <div className="flex items-center gap-6 mb-8">
            <Avatar className="h-20 w-20 ring-2 ring-primary/20 shrink-0">
              <AvatarFallback className="bg-primary/15 text-2xl font-semibold text-primary">
                {session ? initials(session.displayName) : "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-base">{session?.displayName ?? "—"}</p>
              <p className="text-sm text-muted-foreground">@{session?.streamUserId ?? "—"}</p>
            </div>
          </div>

          <Separator className="bg-border/50 mb-8" />

          {/* Info fields */}
          <div className="space-y-6">
            {/* Display Name */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <User className="h-3.5 w-3.5" />
                Display Name
              </div>
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-9 text-sm max-w-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") handleCancelName();
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0"
                    onClick={handleSaveName}
                    disabled={saving}
                  >
                    <Check className="h-4 w-4 text-emerald-400" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0"
                    onClick={handleCancelName}
                    disabled={saving}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-sm font-medium rounded-md border border-transparent px-3 py-2 bg-card/50">
                    {session?.displayName ?? "—"}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingName(true)}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <AtSign className="h-3.5 w-3.5" />
                Username
              </div>
              <p className="text-sm text-muted-foreground rounded-md border border-border/40 px-3 py-2 bg-card/30 max-w-xs">
                {session?.streamUserId ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground/60">Username cannot be changed</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
