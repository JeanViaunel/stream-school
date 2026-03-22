"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useStreamVideoClient,
  CallingState,
  type Call,
} from "@stream-io/video-react-sdk";
import { CallRoom } from "@/components/call/CallRoom";

interface CallPageProps {
  params: Promise<{ callId: string }>;
}

export default function CallPage({ params }: CallPageProps) {
  const { callId } = use(params);
  const router = useRouter();
  const videoClient = useStreamVideoClient();
  const [call, setCall] = useState<Call | undefined>();
  const [error, setError] = useState<string | null>(null);
  const leftRef = useRef(false);

  useEffect(() => {
    if (!videoClient) return;

    const c = videoClient.call("default", callId);
    setCall(c);

    const doJoin = async () => {
      const state = c.state.callingState;
      if (state === CallingState.JOINED || state === CallingState.JOINING) return;
      try {
        await c.join({ create: true });
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
    };
  }, [videoClient, callId]);

  function handleLeave() {
    leftRef.current = true;
    router.replace("/messages");
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <p className="text-destructive">{error}</p>
        <button onClick={() => router.replace("/messages")} className="underline">
          Back to messages
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
