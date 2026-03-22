"use client";

import { Sidebar } from "@/components/chat/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessagesSquare, Plus, Users, Keyboard, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-8 relative overflow-hidden">
        {/* Animated background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div 
            className="h-[500px] w-[500px] rounded-full blur-[150px] animate-pulse"
            style={{ background: "oklch(0.672 0.200 268 / 6%)" }} 
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-md">
          {/* Animated icon container */}
          <div className="relative">
            {/* Outer glow rings */}
            <div className="absolute inset-0 rounded-3xl animate-glow-pulse" 
              style={{ background: "oklch(0.672 0.200 268 / 20%)", filter: "blur(20px)" }} 
            />
            
            {/* Main icon container */}
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-card shadow-2xl animate-float">
              <div 
                className="absolute inset-0 rounded-3xl"
                style={{ background: "linear-gradient(135deg, oklch(0.672 0.200 268 / 10%), oklch(0.750 0.180 290 / 5%))" }} 
              />
              <MessagesSquare className="relative h-11 w-11 text-primary animate-ink-fade-up" strokeWidth={1.5} />
            </div>
            
            {/* Decorative dots */}
            <div className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-primary/40 animate-bounce-subtle" />
            <div className="absolute -bottom-1 -left-3 h-2 w-2 rounded-full bg-primary/30 animate-bounce-subtle" style={{ animationDelay: "0.5s" }} />
          </div>

          {/* Heading */}
          <div className="space-y-2 animate-ink-fade-up" style={{ animationDelay: "0.1s" }}>
            <h1 
              className="text-2xl font-bold tracking-tight gradient-text"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Select a conversation
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-[300px]">
              Choose a chat from the sidebar to start messaging, or create a new conversation.
            </p>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap justify-center gap-3 animate-ink-fade-up" style={{ animationDelay: "0.2s" }}>
            <Button 
              variant="outline" 
              className="gap-2 rounded-full border-border/60 bg-card/60 backdrop-blur-sm hover:bg-card hover:border-primary/30 transition-all duration-300 hover:scale-105"
            >
              <Plus className="h-4 w-4 text-primary" />
              New Message
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 rounded-full border-border/60 bg-card/60 backdrop-blur-sm hover:bg-card hover:border-primary/30 transition-all duration-300 hover:scale-105"
            >
              <Users className="h-4 w-4 text-primary" />
              Join Group
            </Button>
          </div>

          {/* Keyboard shortcuts */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 animate-ink-fade-up" style={{ animationDelay: "0.3s" }}>
            {[
              { key: "⌘", label: "K", desc: "Search" },
              { key: "⌘", label: "N", desc: "New DM" },
              { key: "Esc", label: "", desc: "Close" },
            ].map((shortcut, i) => (
              <div 
                key={i} 
                className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/40 px-2.5 py-1.5 text-xs text-muted-foreground"
              >
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  {shortcut.key}
                </kbd>
                {shortcut.label && (
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    {shortcut.label}
                  </kbd>
                )}
                <span className="ml-1 opacity-60">{shortcut.desc}</span>
              </div>
            ))}
          </div>

          {/* Pro tip */}
          <div className="mt-2 animate-ink-fade-up" style={{ animationDelay: "0.4s" }}>
            <Badge variant="outline" className="gap-1.5 rounded-full border-primary/20 bg-primary/5 text-primary/80">
              <span className="text-[10px] uppercase tracking-wider">Pro Tip</span>
              <span className="text-[10px] opacity-70">Use @ to mention someone</span>
            </Badge>
          </div>
        </div>
      </main>
    </div>
  );
}
