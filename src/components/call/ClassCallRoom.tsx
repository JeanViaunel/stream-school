"use client";

import { useEffect, useRef, useState } from "react";
import {
  StreamCall,
  StreamTheme,
  SpeakerLayout,
  useStreamVideoClient,
  useCall,
  useCallStateHooks,
  Call,
  CallingState,
} from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Lobby } from "./Lobby";
import { LobbyAdmitter } from "./LobbyAdmitter";
import { CallEnded } from "./CallEnded";
import { FloatingControls } from "./FloatingControls";
import { useAuth } from "@/contexts/AuthContext";
import { useGradeSkin } from "@/contexts/GradeSkinContext";
import { toast } from "sonner";
import { Loader2, MicOff, Captions } from "lucide-react";

type CallWithTranscription = Call & {
  startTranscription?: () => Promise<void>;
  stopTranscription?: () => Promise<void>;
};

function TranscriptionControls({ isTeacher }: { isTeacher: boolean }) {
  const call = useCall() as CallWithTranscription | undefined;
  const [captionsOn, setCaptionsOn] = useState(false);

  async function toggleCaptions() {
    if (!call) return;
    try {
      if (captionsOn) {
        await call.stopTranscription?.();
        setCaptionsOn(false);
        toast.success("Captions stopped");
      } else {
        await call.startTranscription?.();
        setCaptionsOn(true);
        toast.success("Captions started");
      }
    } catch {
      toast.error("Transcription is not available for this call");
    }
  }

  if (!isTeacher) return null;

  return (
    <div className="absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-2"
        onClick={toggleCaptions}
        aria-pressed={captionsOn}
        aria-label={captionsOn ? "Turn off live captions" : "Turn on live captions"}
      >
        <Captions className="h-4 w-4" />
        CC
      </Button>
    </div>
  );
}

interface PendingUser {
  id: string;
  name: string;
  streamUserId: string;
}

interface ClassCallRoomInnerProps {
  isTeacher: boolean;
  className: string;
  teacherName: string;
  pendingUsers: PendingUser[];
  onAdmit: (userId: string) => Promise<void>;
  onDeny: (userId: string) => Promise<void>;
  onMuteAll: () => Promise<void>;
  onLeave: () => void;
}

function ClassCallRoomInner({
  isTeacher,
  className,
  teacherName,
  pendingUsers,
  onAdmit,
  onDeny,
  onMuteAll,
  onLeave,
}: ClassCallRoomInnerProps) {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const call = useCall();
  const { gradeBand } = useGradeSkin();
  const isPrimaryBand = gradeBand === "primary";

  const [showEnded, setShowEnded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [wasTerminated, setWasTerminated] = useState(false);
  const endHandledRef = useRef(false);
  const lastParticipantCountRef = useRef(0);

  useEffect(() => {
    lastParticipantCountRef.current = participants.length;
  }, [participants]);

  // Track call duration while joined
  useEffect(() => {
    if (callingState !== CallingState.JOINED) return;
    const interval = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callingState]);

  // Detect when call ends (either by host or by leaving)
  useEffect(() => {
    if (callingState !== CallingState.LEFT) return;
    if (endHandledRef.current) return;
    endHandledRef.current = true;

    const terminated = !!call?.state.endedAt;
    setWasTerminated(terminated);
    setShowEnded(true);
  }, [callingState, call?.state.endedAt]);

  if (showEnded) {
    return (
      <CallEnded
        duration={callDuration}
        participantCount={lastParticipantCountRef.current}
        canRejoin={!wasTerminated}
        onRejoin={() => {
          endHandledRef.current = false;
          setShowEnded(false);
          window.location.reload();
        }}
        onClose={onLeave}
      />
    );
  }

  return (
    <div className="relative h-full bg-slate-950">
      <StreamTheme className="relative w-full h-full bg-transparent">
        <div className="absolute inset-0 flex items-center justify-center pb-24">
          <SpeakerLayout />
        </div>
      </StreamTheme>

      {/* Mute All button for teacher (non-primary band) */}
      {isTeacher && !isPrimaryBand && (
        <div className="absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={onMuteAll}
            className="flex items-center gap-2"
          >
            <MicOff className="h-4 w-4" />
            Mute All
          </Button>
        </div>
      )}

      <TranscriptionControls isTeacher={isTeacher} />

      {/* Lobby admitter panel for teacher */}
      {isTeacher && pendingUsers.length > 0 && (
        <div className="absolute right-4 top-4 z-10">
          <LobbyAdmitter
            pendingUsers={pendingUsers}
            onAdmit={onAdmit}
            onDeny={onDeny}
          />
        </div>
      )}

      <FloatingControls
        onLeave={onLeave}
        onToggleParticipants={() => {}}
        onToggleChat={() => {}}
        currentLayout="spotlight"
        onLayoutChange={() => {}}
        isParticipantsOpen={false}
        isChatOpen={false}
      />
    </div>
  );
}

interface ClassCallRoomProps {
  callId: string;
  className: string;
  teacherName: string;
  teacherId: string;
  onLeave: () => void;
}

export function ClassCallRoom({
  callId,
  className,
  teacherName,
  teacherId,
  onLeave,
}: ClassCallRoomProps) {
  const { session } = useAuth();
  const client = useStreamVideoClient();
  const [call, setCall] = useState<Call | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isInLobby, setIsInLobby] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const isTeacher = session?.userId === teacherId;

  useEffect(() => {
    if (!client) return;

    const joinCall = async () => {
      setIsJoining(true);
      try {
        const callInstance = client.call("classroom", callId);

        if (isTeacher) {
          await callInstance.join({ create: true });
        } else {
          await callInstance.join();
          setIsInLobby(true);
        }

        setCall(callInstance);
      } catch (err) {
        toast.error("Failed to join call");
        console.error(err);
      } finally {
        setIsJoining(false);
      }
    };

    joinCall();

    return () => {
      if (call) {
        call.leave().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, callId, isTeacher]);

  // Listen for lobby join events
  useEffect(() => {
    if (!call) return;

    const handleEvent = (event: { type: string; user?: { id: string; name?: string } }) => {
      if (event.type === "call.session_participant_joined") {
        const user = event.user;
        if (isTeacher && user) {
          setPendingUsers((prev) => {
            if (prev.some((u) => u.id === user.id)) return prev;
            return [...prev, { id: user.id, name: user.name || user.id, streamUserId: user.id }];
          });
        }
      }
    };

    call.on("all", handleEvent);
    return () => {
      call.off("all", handleEvent);
    };
  }, [call, isTeacher]);

  const handleAdmit = async (userId: string) => {
    if (!call) return;
    try {
      await call.grantPermissions(userId, ["send-audio", "send-video"]);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User admitted");
    } catch {
      toast.error("Failed to admit user");
    }
  };

  const handleDeny = async (userId: string) => {
    if (!call) return;
    try {
      await call.blockUser(userId);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User removed");
    } catch {
      toast.error("Failed to remove user");
    }
  };

  const handleMuteAll = async () => {
    if (!call) return;
    try {
      await call.muteAllUsers("audio");
      toast.success("All participants muted");
    } catch {
      toast.error("Failed to mute all");
    }
  };

  if (isJoining) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Failed to join call</p>
      </div>
    );
  }

  if (isInLobby && !isTeacher) {
    return (
      <Lobby
        className={className}
        teacherName={teacherName}
        onJoin={() => setIsInLobby(false)}
      />
    );
  }

  return (
    <StreamCall call={call}>
      <ClassCallRoomInner
        isTeacher={isTeacher}
        className={className}
        teacherName={teacherName}
        pendingUsers={pendingUsers}
        onAdmit={handleAdmit}
        onDeny={handleDeny}
        onMuteAll={handleMuteAll}
        onLeave={onLeave}
      />
    </StreamCall>
  );
}
