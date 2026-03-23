"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useStreamVideoClient,
  CallingState,
  type Call,
} from "@stream-io/video-react-sdk";
import { useChatContext } from "stream-chat-react";
import { useAuth } from "@/contexts/AuthContext";
import { CallRoom } from "@/components/call/CallRoom";

interface CallPageProps {
  params: Promise<{ callId: string }>;
}

export default function CallPage({ params }: CallPageProps) {
  const { callId } = use(params);
  const router = useRouter();
  const videoClient = useStreamVideoClient();
  const { client: chatClient } = useChatContext();
  const { session } = useAuth();
  const [call, setCall] = useState<Call | undefined>();
  const [error, setError] = useState<string | null>(null);
  const leftRef = useRef(false);
  const hasJoinedRef = useRef(false);
  const chatClientRef = useRef(chatClient);
  chatClientRef.current = chatClient;

  useEffect(() => {
    if (!videoClient) return;

    // reuseInstance: true returns the already-tracked Call object (e.g. from the
    // ring flow in IncomingCallModal) instead of creating a fresh instance.
    // Without this, the callee ends up with two separate Call objects for the
    // same call ID — one joined via the ring modal (orphaned) and one in IDLE
    // state created here — so participants can never see each other.
    const c = videoClient.call("default", callId, { reuseInstance: true });
    setCall(c);

    const doJoin = async () => {
      // Prevent multiple join attempts
      if (hasJoinedRef.current) return;
      
      const state = c.state.callingState;
      if (state === CallingState.JOINED || state === CallingState.JOINING) return;

      hasJoinedRef.current = true;

      // Probe camera and microphone before the SDK tries — avoids unhandled internal rejection
      let cameraEnabled = true;
      let micEnabled = true;
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        probe.getTracks().forEach((t) => t.stop());
      } catch {
        // Try camera only
        try {
          const probeCam = await navigator.mediaDevices.getUserMedia({ video: true });
          probeCam.getTracks().forEach((t) => t.stop());
        } catch {
          cameraEnabled = false;
          await c.camera.disable();
        }
        // Try microphone only
        try {
          const probeMic = await navigator.mediaDevices.getUserMedia({ audio: true });
          probeMic.getTracks().forEach((t) => t.stop());
        } catch {
          micEnabled = false;
          await c.microphone.disable();
        }
      }

      try {
        await c.join({ create: true });
        // Enable microphone after joining if permission was granted
        if (micEnabled) {
          await c.microphone.enable();
        }

        // Record this user as a participant in the call's custom data
        // so the call card can later show "call ended" vs "missed call"
        if (session?.streamUserId) {
          try {
            const existing =
              (c.state.custom as Record<string, unknown>) ?? {};
            const joined =
              (existing.joinedParticipants as string[] | undefined) ?? [];
            if (!joined.includes(session.streamUserId)) {
              await c.update({
                custom: {
                  ...existing,
                  joinedParticipants: [...joined, session.streamUserId],
                },
              });
            }
          } catch {
            // best effort — don't block the call if this fails
          }
        }
      } catch (err) {
        if (c.state.callingState !== CallingState.JOINED) {
          setError(err instanceof Error ? err.message : "Failed to join call");
        }
      }
    };

    doJoin();

    return () => {
      if (!leftRef.current && c.state.callingState === CallingState.JOINED) {
        c.leave().catch(() => {});
      }
      // Clear the active call marker so others can start a new call
      const channelCid = (c.state.custom as Record<string, unknown>)
        ?.channelCid as string | undefined;
      if (channelCid) {
        const [type, cid] = channelCid.split(":");
        chatClientRef.current
          .channel(type, cid)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .updatePartial({ unset: ["active_call_id"] } as any)
          .catch(() => {});
      }
    };
  }, [videoClient, callId]);

  const handleLeave = useCallback(() => {
    leftRef.current = true;
    router.replace("/dashboard");
  }, [router]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <p className="text-destructive">{error}</p>
        <button onClick={() => router.replace("/dashboard")} className="underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Joining call…
      </div>
    );
  }

  return (
    <div className="h-screen">
      <CallRoom call={call} onLeave={handleLeave} />
    </div>
  );
}
