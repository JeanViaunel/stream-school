"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useChatContext } from "stream-chat-react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CallButtonProps {
  channelId: string;
}

export function CallButton({ channelId }: CallButtonProps) {
  const router = useRouter();
  const { session } = useAuth();
  const videoClient = useStreamVideoClient();
  const { channel } = useChatContext();
  const [loading, setLoading] = useState(false);

  async function startCall() {
    if (!videoClient || !session || !channel) return;
    setLoading(true);
    try {
      const raw = `${channelId}-${Date.now()}`;
      const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
      const callId = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32);

      const members = Object.values(channel.state.members)
        .filter((m) => m.user_id)
        .map((m) => ({ user_id: m.user_id! }));

      const call = videoClient.call("default", callId);
      await call.getOrCreate({
        ring: true,
        data: { members },
      });

      await channel.sendMessage({
        text: `📹 Video call started. Join at /call/${callId}`,
      });

      router.push(`/call/${callId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={startCall}
      disabled={loading || !videoClient}
      title="Start video call"
    >
      <Video className="h-5 w-5" />
    </Button>
  );
}
