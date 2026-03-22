"use client";

import { Sidebar } from "@/components/chat/Sidebar";
import { MessageCircle } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <MessageCircle className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Choose a conversation
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Pick a chat from the list or start a new direct message or group.
          </p>
        </div>
      </main>
    </div>
  );
}
