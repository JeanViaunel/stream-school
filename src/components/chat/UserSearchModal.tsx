"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useChatContext } from "stream-chat-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserResponse } from "stream-chat";

interface UserSearchModalProps {
  onSelect: (userId: string) => void;
  onClose: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-primary/20 text-primary font-semibold rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function UserSearchModal({ onSelect, onClose }: UserSearchModalProps) {
  const { client } = useChatContext();
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      setHighlightedIndex(-1);
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
      setResults(res.users);
      setHighlightedIndex(res.users.length > 0 ? 0 : -1);
    } finally {
      setLoading(false);
    }
  }, [client, session]);

  function handleSelect(user: UserResponse) {
    onSelect(user.id);
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (results.length === 0) return;
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < results.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        const user = results[highlightedIndex];
        if (user) handleSelect(user);
      }
    }
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [results, highlightedIndex, onSelect]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0) {
      const element = document.getElementById(`user-result-${highlightedIndex}`);
      element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightedIndex]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-strong border-border/50 max-w-md p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <MessageCircle className="h-5 w-5 text-primary" />
              New Direct Message
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search 
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
                loading ? "text-primary" : "text-muted-foreground"
              )} 
            />
            <Input
              placeholder="Search by name or username..."
              value={query}
              onChange={(e) => search(e.target.value)}
              className="pl-9 h-11 bg-secondary/50 border-border/50 focus:border-primary/30 text-sm"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Results */}
          <ScrollArea className="h-64 -mx-2 px-2">
            <div className="space-y-1">
              {results.map((user, index) => (
                <button
                  key={user.id}
                  id={`user-result-${index}`}
                  onClick={() => handleSelect(user)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150",
                    highlightedIndex === index
                      ? "bg-primary/10 shadow-depth-1"
                      : "hover:bg-white/5"
                  )}
                >
                  <div className="relative">
                    <Avatar className={cn(
                      "h-10 w-10 transition-all duration-200",
                      highlightedIndex === index ? "ring-2 ring-primary/30" : ""
                    )}>
                      <AvatarFallback className={cn(
                        "text-sm font-semibold transition-colors",
                        highlightedIndex === index 
                          ? "bg-primary/20 text-primary" 
                          : "bg-primary/15 text-primary/80"
                      )}>
                        {initials(user.name || user.id)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-popover transition-colors duration-200",
                      user.online ? "bg-emerald-400" : "bg-gray-400"
                    )} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {highlightMatch(user.name || user.id, query)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{highlightMatch(user.id, query)}
                    </p>
                  </div>
                  
                  {highlightedIndex === index && (
                    <span className="text-xs text-primary font-medium animate-ink-fade-up">
                      Press Enter
                    </span>
                  )}
                </button>
              ))}
              
              {!loading && query.length > 0 && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-ink-fade-up">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No users found
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Try a different search term
                  </p>
                </div>
              )}
              
              {!query && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Type to search for users</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Keyboard hints */}
        <div className="px-6 py-3 border-t border-border/50 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↓</kbd>
                <span>to navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
                <span>to select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
              <span>to close</span>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
