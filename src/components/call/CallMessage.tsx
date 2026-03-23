"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useChatContext } from "stream-chat-react";
import { Video, PhoneOff, PhoneMissed, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface CallMessageCardProps {
  callId: string;
  senderName: string;
  isOwnMessage: boolean;
  canJoin?: boolean;
}

export function CallMessageCard({
  callId,
  senderName,
  isOwnMessage,
  canJoin = true,
}: CallMessageCardProps) {
  const router = useRouter();
  const videoClient = useStreamVideoClient();
  const { client: chatClient } = useChatContext();
  const [status, setStatus] = useState<"loading" | "active" | "ended">(
    "loading"
  );
  const [duration, setDuration] = useState<number | undefined>();
  const [wasParticipant, setWasParticipant] = useState(false);

  useEffect(() => {
    if (!videoClient) return;
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const call = videoClient.call("default", callId);
        await call.get();
        if (cancelled) return;

        if (call.state.endedAt) {
          const joinedParticipants = (
            call.state.custom as Record<string, unknown>
          )?.joinedParticipants as string[] | undefined;

          const currentUserId = chatClient.userID ?? "";
          const wasIn =
            isOwnMessage ||
            (joinedParticipants?.includes(currentUserId) ?? false);
          setWasParticipant(wasIn);

          const endedAt = call.state.endedAt;
          const startedAt = call.state.startedAt;
          if (endedAt && startedAt) {
            const ms =
              new Date(endedAt).getTime() - new Date(startedAt).getTime();
            setDuration(Math.floor(ms / 1000));
          }

          setStatus("ended");
        } else {
          setStatus("active");
        }
      } catch {
        if (!cancelled) {
          setStatus("ended");
          setWasParticipant(false);
        }
      }
    };

    // Initial check
    checkStatus();

    // Poll every 5 s so the Join button disables as soon as the call ends
    const interval = setInterval(checkStatus, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [callId, videoClient, chatClient.userID, isOwnMessage]);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 max-w-[280px]">
        <Loader2 className="h-4 w-4 animate-spin text-white/40" />
        <span className="text-sm text-white/40">Video call</span>
      </div>
    );
  }

  if (status === "ended") {
    if (wasParticipant) {
      return (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 max-w-[280px]">
          <div className="shrink-0 rounded-full bg-white/10 p-2">
            <PhoneOff className="h-4 w-4 text-white/50" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">Call ended</p>
            {duration !== undefined && (
              <p className="text-xs text-white/40">{formatDuration(duration)}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 max-w-[280px]">
        <div className="shrink-0 rounded-full bg-red-500/10 p-2">
          <PhoneMissed className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">Missed call</p>
          <p className="text-xs text-white/40">from {senderName}</p>
        </div>
      </div>
    );
  }

  if (!canJoin) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 max-w-[280px]">
        <div className="relative shrink-0">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/25" />
          <div className="relative rounded-full bg-emerald-500/20 p-2">
            <Video className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Session live</p>
          <p className="text-xs text-emerald-400/80 truncate">
            Started by {senderName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push(`/call/${callId}`)}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10",
        "px-4 py-3 max-w-[280px] w-full text-left",
        "transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/15 active:scale-[0.98]"
      )}
    >
      <div className="relative shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/25" />
        <div className="relative rounded-full bg-emerald-500/20 p-2">
          <Video className="h-4 w-4 text-emerald-400" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Ongoing call</p>
        <p className="text-xs text-emerald-400/80 truncate">
          Started by {senderName}
        </p>
      </div>

      <div className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(16,185,129,0.35)] transition-transform group-hover:scale-105 group-active:scale-95">
        Join
      </div>
    </button>
  );
}
