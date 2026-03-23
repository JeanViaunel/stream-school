"use client";

import { useEffect, useState, useRef } from "react";
import {
  StreamCall,
  StreamTheme,
  SpeakerLayout,
  PaginatedGridLayout,
  useCallStateHooks,
  useCall,
  type Call,
  CallingState,
  BackgroundFiltersProvider,
} from "@stream-io/video-react-sdk";
import { toast } from "sonner";
import { Users, Clock, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingControls } from "./FloatingControls";
import { NetworkIndicator, NetworkBanner } from "./NetworkIndicator";
import { ParticipantList } from "./ParticipantList";
import { SelfView } from "./SelfView";
import { CallEnded } from "./CallEnded";
import { type CallLayout } from "./LayoutSwitcher";
import { ClosedCaptions } from "./ClosedCaptions";

function CallTimer() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;

  const timeString =
    hours > 0
      ? `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      : `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 backdrop-blur-md px-4 py-2">
      <Clock className="h-3.5 w-3.5 text-white/60" />
      <span
        className="text-sm font-mono text-white tabular-nums tracking-wider"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        {timeString}
      </span>
    </div>
  );
}

interface CallRoomProps {
  call: Call;
  onLeave: () => void;
}

// Inner component that uses Stream SDK hooks (must be inside StreamCall)
function CallRoomInner({ onLeave }: { onLeave: () => void }) {
  const { useParticipants, useLocalParticipant, useCallCallingState } = useCallStateHooks();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();
  const callingState = useCallCallingState();
  const call = useCall();
  const [layout, setLayout] = useState<CallLayout>("spotlight");
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showCallEnded, setShowCallEnded] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [networkQuality, setNetworkQuality] = useState<
    "excellent" | "good" | "poor"
  >("excellent");
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastMouseMoveRef = useRef(Date.now());
  const headerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Tracks remote participants across renders so we can detect who left
  const prevRemoteRef = useRef<Map<string, { name?: string; userId: string }>>(new Map());
  const [showRinging, setShowRinging] = useState(false);

  // Show a sonner toast when a remote participant leaves
  useEffect(() => {
    const remoteParticipants = participants.filter(
      (p) => p.sessionId !== localParticipant?.sessionId
    );
    const current = new Map(
      remoteParticipants.map((p) => [p.sessionId, { name: p.name, userId: p.userId }])
    );

    prevRemoteRef.current.forEach((info, sessionId) => {
      if (!current.has(sessionId)) {
        const displayName = info.name || info.userId || "Someone";
        toast(`${displayName} left the call`);
      }
    });

    prevRemoteRef.current = current;
  }, [participants, localParticipant?.sessionId]);

  // Handle call being ended remotely (e.g. host called endCall())
  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      const wasTerminated = !!call?.state.endedAt;
      setCallEnded(wasTerminated);
      setShowCallEnded(true);
    }
  }, [callingState, call?.state.endedAt]);

  // Auto-hide header after 3s - use ref to avoid re-renders
  useEffect(() => {
    const handleMouseMove = () => {
      lastMouseMoveRef.current = Date.now();
      setHeaderVisible(true);

      // Clear existing timeout
      if (headerTimeoutRef.current) {
        clearTimeout(headerTimeoutRef.current);
      }

      // Set new timeout
      headerTimeoutRef.current = setTimeout(() => {
        if (Date.now() - lastMouseMoveRef.current >= 3000) {
          setHeaderVisible(false);
        }
      }, 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Initial timeout
    headerTimeoutRef.current = setTimeout(() => {
      setHeaderVisible(false);
    }, 3000);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (headerTimeoutRef.current) {
        clearTimeout(headerTimeoutRef.current);
      }
    };
  }, []);

  // Track call duration
  useEffect(() => {
    if (callingState !== CallingState.JOINED) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callingState]);

  // Handle ringing state for ring calls
  useEffect(() => {
    if (callingState === CallingState.RINGING) {
      setShowRinging(true);
    } else if (callingState === CallingState.JOINED) {
      setShowRinging(false);
    }
  }, [callingState]);

  // Handle call end
  const handleLeave = async () => {
    // Call leave will be handled by the call object
    setShowCallEnded(true);
  };

  const handleRejoin = () => {
    setCallEnded(false);
    setShowCallEnded(false);
    window.location.reload();
  };

  const handleCloseCallEnded = () => {
    setShowCallEnded(false);
    onLeave();
  };

  // Render the appropriate video layout
  const renderVideoLayout = () => {
    const layoutProps = {
      className: "w-full h-full",
      // Local video is shown in SelfView (PiP); omit local from grid/speaker to avoid duplicate camera tiles.
      excludeLocalParticipant: true,
    };
    switch (layout) {
      case "grid":
        return <PaginatedGridLayout groupSize={16} {...layoutProps} />;
      case "sidebar":
        return (
          <SpeakerLayout participantsBarPosition="right" {...layoutProps} />
        );
      case "spotlight":
      default:
        return (
          <SpeakerLayout participantsBarPosition="bottom" {...layoutProps} />
        );
    }
  };

  if (showCallEnded) {
    return (
      <CallEnded
        duration={callDuration}
        participantCount={participants.length}
        canRejoin={!callEnded}
        onRejoin={handleRejoin}
        onClose={handleCloseCallEnded}
      />
    );
  }

  // Show ringing/lobby UI while in RINGING state
  if (showRinging || callingState === CallingState.RINGING || callingState === CallingState.JOINING) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-slate-950 to-purple-950/30" />
        
        <div className="relative z-10 text-center space-y-6">
          {/* Animated rings */}
          <div className="relative flex justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute h-40 w-40 rounded-full border-2 border-purple-500/20 animate-ring-pulse" />
              <div className="absolute h-48 w-48 rounded-full border border-purple-500/10 animate-ring-pulse" style={{ animationDelay: "0.3s" }} />
              <div className="absolute h-56 w-56 rounded-full border border-purple-500/5 animate-ring-pulse" style={{ animationDelay: "0.6s" }} />
            </div>
            
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-2 border-purple-500/40 shadow-2xl shadow-purple-500/20">
              <span className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-syne)" }}>
                📞
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-syne)" }}>
              {callingState === CallingState.RINGING ? "Ringing..." : "Joining call..."}
            </h2>
            <p className="text-white/50">
              {callingState === CallingState.RINGING 
                ? "Waiting for others to answer" 
                : "Connecting to the call"}
            </p>
          </div>

          {/* Cancel button for outgoing ring calls */}
          {call?.isCreatedByMe && callingState === CallingState.RINGING && (
            <button
              onClick={() => call?.leave({ reject: true, reason: "cancel" })}
              className="px-6 py-3 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
            >
              Cancel Call
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-indigo-950/20 to-slate-950" />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Header - auto-hiding */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-40 transition-all duration-300 px-6 py-4",
          headerVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-full pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between">
          {/* Left: Call info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/30 backdrop-blur-md px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30">
                <Hash className="h-4 w-4 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Center: Timer */}
          <CallTimer />

          {/* Right: Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 backdrop-blur-md px-3 py-2">
              <Users className="h-4 w-4 text-white/60" />
              <span className="text-sm text-white/80">
                {participants.length}
              </span>
            </div>
            <NetworkIndicator quality={networkQuality} />
          </div>
        </div>
      </div>

      {/* Network quality banner */}
      <NetworkBanner quality={networkQuality} />

      {/* Main video area */}
      <StreamTheme className="relative w-full h-full bg-transparent">
        <div className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-24">
          <div
            className={cn(
              "w-full h-full max-w-7xl mx-auto transition-all duration-400",
              showParticipants && "mr-80",
              showChat && "ml-80"
            )}
          >
            <div className="w-full h-full rounded-2xl overflow-hidden">
              {renderVideoLayout()}
            </div>
          </div>
        </div>
      </StreamTheme>

      {/* Self-view (Picture-in-Picture) */}
      <SelfView />

      {/* Closed captions overlay */}
      <ClosedCaptions />

      {/* Participant list panel */}
      <ParticipantList
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
      />

      {/* Floating controls */}
      <FloatingControls
        onLeave={handleLeave}
        onToggleParticipants={() => setShowParticipants(!showParticipants)}
        onToggleChat={() => setShowChat(!showChat)}
        currentLayout={layout}
        onLayoutChange={setLayout}
        isParticipantsOpen={showParticipants}
        isChatOpen={showChat}
      />
    </div>
  );
}

export function CallRoom({ call, onLeave }: CallRoomProps) {
  return (
    <StreamCall call={call}>
      <BackgroundFiltersProvider
        backgroundImages={[
          "/backgrounds/classroom.svg",
          "/backgrounds/office.svg",
          "/backgrounds/library.svg",
          "/backgrounds/nature.svg",
          "/backgrounds/space.svg",
        ]}
        onError={(error) => {
          console.error("Background filter error:", error);
        }}
      >
        <CallRoomInner onLeave={onLeave} />
      </BackgroundFiltersProvider>
    </StreamCall>
  );
}
