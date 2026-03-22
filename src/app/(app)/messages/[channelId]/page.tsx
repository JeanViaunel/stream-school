"use client";

import { use, useEffect, useState } from "react";
import { useChatContext } from "stream-chat-react";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChannelView } from "@/components/chat/ChannelView";
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
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Loading…
          </div>
        )}
      </main>
    </div>
  );
}
