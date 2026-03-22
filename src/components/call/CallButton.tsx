"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStreamVideoClient, useCalls, CallingState } from "@stream-io/video-react-sdk";
import { useChannelStateContext, useChatContext } from "stream-chat-react";
import { Video, PhoneCall } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function CallButton() {
  const router = useRouter();
  const { session } = useAuth();
  const videoClient = useStreamVideoClient();
  const { channel } = useChannelStateContext();
  const { client: chatClient } = useChatContext();
  const [loading, setLoading] = useState(false);

  const channelData = channel.data as Record<string, unknown> | undefined;
  const activeCallId = channelData?.active_call_id as string | undefined;

  async function handleClick() {
    if (!videoClient || !session || !channel) return;

    // Existing active call → join it instead of creating a new one
    if (activeCallId) {
      router.push(`/call/${activeCallId}`);
      return;
    }

    setLoading(true);
    try {
      const raw = `${channel.id}-${Date.now()}`;
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(raw)
      );
      const callId = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32);

      const members = Object.values(channel.state.members)
        .filter((m) => m.user_id)
        .map((m) => ({ user_id: m.user_id! }));

      // Send the call card message first so we get its ID
      const { message } = await channel.sendMessage({
        text: `${session.displayName} started a video call`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attachments: [{ type: "call", call_id: callId } as any],
      });

      // Create the Stream Video call, storing the message ID for later cleanup
      const call = videoClient.call("default", callId);
      await call.getOrCreate({
        ring: true,
        data: {
          members,
          custom: {
            channelCid: channel.cid,
            callMessageId: message.id,
          },
        },
      });

      // Mark the channel as having an active call (real-time for all members)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (channel as any).updatePartial({ set: { active_call_id: callId } });

      router.push(`/call/${callId}`);
    } catch (err) {
      console.error("Failed to start call:", err);
    } finally {
      setLoading(false);
    }
  }

  const calls = useCalls();
  const hasActiveCall = Boolean(activeCallId);
  // Pulsing indicator only when this user has actually joined the call
  const isInCall = calls.some(
    (c) => c.id === activeCallId && c.state.callingState === CallingState.JOINED
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={handleClick}
              disabled={loading || !videoClient}
              className={cn(
                "group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
                "disabled:cursor-not-allowed disabled:opacity-40",
                isInCall
                  ? "text-emerald-400 hover:bg-emerald-400/10"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            />
          }
        >
          {isInCall ? (
            <>
              <span className="absolute inset-0 animate-ping rounded-lg bg-emerald-400/15" />
              <PhoneCall className="relative h-4 w-4" />
            </>
          ) : (
            <Video className={cn("h-4 w-4", loading && "animate-pulse")} />
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isInCall ? "In call" : hasActiveCall ? "Join ongoing call" : "Start video call"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
