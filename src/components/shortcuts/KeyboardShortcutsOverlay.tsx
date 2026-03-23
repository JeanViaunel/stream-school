"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Keyboard, Search, Command, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ["g", "d"], description: "Go to Dashboard", category: "Navigation" },
  { keys: ["g", "a"], description: "Go to Assignments", category: "Navigation" },
  { keys: ["g", "m"], description: "Go to Messages", category: "Navigation" },
  { keys: ["g", "p"], description: "Go to Profile", category: "Navigation" },
  { keys: ["n"], description: "New message", category: "Navigation" },
  
  // Global
  { keys: ["?"], description: "Show this help", category: "Global" },
  { keys: ["⌘", "k"], description: "Open command palette", category: "Global" },
  { keys: ["Esc"], description: "Close modal / Cancel", category: "Global" },
  
  // Class
  { keys: ["1"], description: "Overview tab", category: "Class" },
  { keys: ["2"], description: "Chat tab", category: "Class" },
  { keys: ["3"], description: "Grades tab", category: "Class" },
  { keys: ["4"], description: "Sessions tab", category: "Class" },
  { keys: ["j"], description: "Join live session", category: "Class" },
  
  // Messages
  { keys: ["Enter"], description: "Send message", category: "Messages" },
  { keys: ["⇧", "Enter"], description: "New line in message", category: "Messages" },
];

export function KeyboardShortcutsOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Open on ? key
    if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }
      e.preventDefault();
      setIsOpen(true);
    }

    // Close on Escape
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const filteredShortcuts = SHORTCUTS.filter((shortcut) =>
    shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shortcut.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-32 right-4 z-50 gap-2 md:bottom-12"
      >
        <Keyboard className="h-4 w-4" />
        Shortcuts
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <ScrollArea className="h-[50vh]">
            <div className="space-y-6">
              {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, j) => (
                            <kbd
                              key={j}
                              className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-md border border-border/60 bg-muted text-[11px] font-mono font-medium text-muted-foreground shadow-sm"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredShortcuts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No shortcuts found matching &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">?</kbd> anytime to show this help
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
