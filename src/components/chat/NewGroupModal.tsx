"use client";

import { useState, useCallback, useEffect } from "react";
import { useChatContext } from "stream-chat-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  X,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  Camera,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserResponse } from "stream-chat";

interface NewGroupModalProps {
  onClose: (channelId?: string) => void;
}

type WizardStep = 1 | 2 | 3;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function NewGroupModal({ onClose }: NewGroupModalProps) {
  const { client } = useChatContext();
  const { session } = useAuth();
  
  const [step, setStep] = useState<WizardStep>(1);
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResponse[]>([]);
  const [selected, setSelected] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Search users
  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const filterConditions: Record<string, unknown> = {
        $and: [
          { id: { $ne: session!.streamUserId } },
          {
            $or: [
              { name: { $autocomplete: q } },
              { id: { $autocomplete: q } },
            ],
          },
        ],
      };
      
      const res = await client.queryUsers(
        filterConditions,
        { name: 1 },
        { limit: 10 }
      );
      setResults(
        res.users.filter((u) => !selected.some((s) => s.id === u.id))
      );
      setHighlightedIndex(-1);
    } finally {
      setLoading(false);
    }
  }, [client, session, selected]);

  function addMember(user: UserResponse) {
    setSelected((prev) => [...prev, user]);
    setResults((prev) => prev.filter((u) => u.id !== user.id));
    setQuery("");
    setHighlightedIndex(-1);
  }

  function removeMember(userId: string) {
    setSelected((prev) => prev.filter((u) => u.id !== userId));
  }

  async function createGroup() {
    if (!groupName.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      const members = [
        session!.streamUserId,
        ...selected.map((u) => u.id),
      ];
      // Use an explicit ID so this is a non-distinct channel (true group, not a DM)
      const channelId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const channel = client.channel("messaging", channelId, {
        members,
      } as any);
      await channel.watch();
      toast.success("Group created successfully!");
      onClose(channel.id);
    } catch (error) {
      toast.error("Failed to create group");
      console.error(error);
    } finally {
      setCreating(false);
    }
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (step !== 2) return;
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < results.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        const user = results[highlightedIndex];
        if (user) addMember(user);
      }
    }
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, results, highlightedIndex]);

  const canProceed = {
    1: groupName.trim().length > 0,
    2: selected.length > 0,
    3: true,
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-strong border-border/50 max-w-md p-0 overflow-hidden">
        {/* Progress Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {step === 1 && "Create Group"}
                {step === 2 && "Add Members"}
                {step === 3 && "Review & Create"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {step === 1 && "Choose a name for your group"}
                {step === 2 && `Search and select members (${selected.length} selected)`}
                {step === 3 && "Confirm your group details"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors duration-200",
                    s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 py-4">
          {step === 1 && (
            <div className="space-y-4 animate-ink-fade-up">
              {/* Avatar Upload Placeholder */}
              <div className="flex justify-center">
                <div className="relative group cursor-pointer">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center transition-all duration-200 group-hover:border-primary/50 group-hover:from-primary/30 group-hover:to-primary/10">
                    <Users className="h-8 w-8 text-primary/60" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                </div>
              </div>
              
              {/* Group Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Group Name
                </label>
                <Input
                  placeholder="e.g., Engineering Team"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="h-11 bg-secondary/50 border-border/50 focus:border-primary/30"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-ink-fade-up">
              {/* Selected Members */}
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-secondary/30 rounded-lg">
                  {selected.map((user) => (
                    <Badge 
                      key={user.id} 
                      variant="secondary" 
                      className="gap-1.5 px-2 py-1 text-xs animate-scale-in"
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[8px] bg-primary/20">
                          {initials(user.name || user.id)}
                        </AvatarFallback>
                      </Avatar>
                      {user.name || user.id}
                      <button 
                        onClick={() => removeMember(user.id)}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name..."
                  value={query}
                  onChange={(e) => search(e.target.value)}
                  className="pl-9 h-10 bg-secondary/50 border-border/50 focus:border-primary/30"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {loading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  
                  {results.map((user, index) => (
                    <button
                      key={user.id}
                      onClick={() => addMember(user)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150",
                        highlightedIndex === index
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-white/5 text-foreground"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/15 text-primary">
                            {initials(user.name || user.id)}
                          </AvatarFallback>
                        </Avatar>
                        {user.online && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-popover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.name || user.id}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{user.id}
                        </p>
                      </div>
                      {highlightedIndex === index && (
                        <span className="text-xs text-primary">Press Enter</span>
                      )}
                    </button>
                  ))}
                  
                  {!loading && query.length > 0 && results.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No users found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-ink-fade-up">
              {/* Group Preview */}
              <div className="p-4 bg-secondary/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <Users className="h-7 w-7 text-primary/70" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{groupName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selected.length + 1} members
                    </p>
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Members
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {/* Current user */}
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/5">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {session ? initials(session.displayName) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{session?.displayName} (You)</p>
                      <p className="text-xs text-muted-foreground">@{session?.streamUserId}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">Admin</Badge>
                  </div>
                  
                  {selected.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/15 text-primary">
                          {initials(user.name || user.id)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.name || user.id}</p>
                        <p className="text-xs text-muted-foreground">@{user.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => step > 1 && setStep((s) => (s - 1) as WizardStep)}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onClose()}
            >
              Cancel
            </Button>
            
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as WizardStep)}
                disabled={!canProceed[step]}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={createGroup}
                disabled={creating}
                className="gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Group
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
