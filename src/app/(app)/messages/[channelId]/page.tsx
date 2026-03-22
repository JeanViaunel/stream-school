"use client";

import { use, useEffect, useState, useRef } from "react";
import { useChatContext } from "stream-chat-react";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChannelView } from "@/components/chat/ChannelView";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Channel } from "stream-chat";
import { cn } from "@/lib/utils";

interface ChannelPageProps {
  params: Promise<{ channelId: string }>;
}

// Skeleton message bubbles for loading state
function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Date separator */}
      <div className="flex items-center justify-center py-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <Skeleton className="mx-4 h-6 w-24 rounded-full" />
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Message bubbles */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={cn(
            "flex gap-3",
            i % 2 === 0 ? "flex-row-reverse" : "flex-row"
          )}
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className={cn("flex max-w-[70%] flex-col", i % 2 === 0 ? "items-end" : "items-start")}>
            {i % 2 !== 0 && <Skeleton className="mb-1 h-3 w-20" />}
            <Skeleton 
              className={cn(
                "h-12 rounded-2xl",
                i % 2 === 0 ? "w-48 bg-primary/20" : "w-64"
              )} 
            />
            <Skeleton className="mt-1 h-2 w-12" />
          </div>
        </div>
      ))}

      {/* Typing indicator */}
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="flex gap-0.5">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// Skeleton header for loading state
function HeaderSkeleton() {
  return (
    <div className="flex items-center border-b border-border/60 bg-card/50 px-4 py-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="ml-3 min-w-0 flex-1">
        <Skeleton className="mb-1 h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="ml-2 flex items-center gap-1">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  );
}

// Skeleton input for loading state
function InputSkeleton() {
  return (
    <div className="border-t border-border/60 px-4 py-3">
      <div className="mb-2 flex items-center gap-1">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1" />
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
    </div>
  );
}

export default function ChannelPage({ params }: ChannelPageProps) {
  const { channelId } = use(params);
  const { client, setActiveChannel } = useChatContext();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadChannel() {
      try {
        const res = await client.queryChannels(
          { id: { $eq: channelId }, type: "messaging" },
          {},
          { limit: 1 }
        );
        if (res.length > 0 && active) {
          setActiveChannel(res[0] as Channel);
          setReady(true);
          setLoading(false);
        } else if (active) {
          router.replace("/messages");
        }
      } catch {
        if (active) router.replace("/messages");
      }
    }
    loadChannel();
    return () => {
      active = false;
    };
  }, [channelId, client, setActiveChannel, router]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex flex-1 overflow-hidden">
        {ready ? (
          <ChannelView />
        ) : (
          <div className="flex flex-1 flex-col bg-background">
            <HeaderSkeleton />
            <div className="flex-1 overflow-hidden">
              <MessageSkeleton />
            </div>
            <InputSkeleton />
          </div>
        )}
      </main>
    </div>
  );
}
