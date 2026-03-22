"use client";

import { useEffect, useState } from "react";
import {
  StreamCall,
  StreamTheme,
  SpeakerLayout,
  useCallStateHooks,
  type Call,
} from "@stream-io/video-react-sdk";
import { CallControls } from "./CallControls";

function CallTimer() {
  const { useCallSession } = useCallStateHooks();
  const session = useCallSession();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session?.started_at) return;
    const start = new Date(session.started_at).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.started_at]);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const secs = (elapsed % 60).toString().padStart(2, "0");

  return (
    <span className="text-sm text-white/60 tabular-nums font-mono">
      {mins}:{secs}
    </span>
  );
}

interface CallRoomProps {
  call: Call;
  onLeave: () => void;
}

export function CallRoom({ call, onLeave }: CallRoomProps) {
  return (
    <StreamCall call={call}>
      <div className="flex flex-col h-full bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 bg-zinc-950/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-white tracking-wide">
              Video Call
            </span>
          </div>
          <CallTimer />
        </div>

        {/* Video area */}
        <StreamTheme className="flex-1 min-h-0">
          <SpeakerLayout />
        </StreamTheme>

        {/* Controls */}
        <CallControls onLeave={onLeave} />
      </div>
    </StreamCall>
  );
}
