"use client";

import { use } from "react";
import { ChannelView } from "@/components/chat/ChannelView";
import { useChatContext } from "stream-chat-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Channel } from "stream-chat";

interface ChannelPageProps {
  params: Promise<{ channelId: string }>;
}

export default function ChannelPage({ params }: ChannelPageProps) {
  const { channelId } = use(params);
  const { client, setActiveChannel } = useChatContext();
  const router = useRouter();
  const [ready, setReady] = useState(false);

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
        } else if (active) {
          router.replace("/dashboard");
        }
      } catch {
        if (active) router.replace("/dashboard");
      }
    }
    loadChannel();
    return () => {
      active = false;
    };
  }, [channelId, client, setActiveChannel, router]);

  return (
    <div className="flex h-screen">
      {ready ? (
        <ChannelView />
      ) : (
        <div className="flex flex-1 flex-col bg-background">
          <div className="flex items-center border-b border-border/60 bg-card/50 px-4 py-3">
            <div className="ml-3 min-w-0 flex-1">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded mt-1" />
            </div>
          </div>
          <div className="flex-1 p-4">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-12 w-3/4 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
