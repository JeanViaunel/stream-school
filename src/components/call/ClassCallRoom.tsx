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
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
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
  onEndForAll?: () => Promise<void>;
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
  onEndForAll,
}: ClassCallRoomInnerProps) {
  const { useCallCallingState, useParticipants, useCameraState, useMicrophoneState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const { camera } = useCameraState();
  const { microphone } = useMicrophoneState();
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

  // Detect when call ends (either by host or by leaving) and release media
  useEffect(() => {
    if (callingState !== CallingState.LEFT) return;
    if (endHandledRef.current) return;
    endHandledRef.current = true;

    // Release camera and microphone so the browser indicator turns off
    camera.disable().catch(() => {});
    microphone.disable().catch(() => {});

    const terminated = !!call?.state.endedAt;
    setWasTerminated(terminated);
    setShowEnded(true);
  }, [callingState, call?.state.endedAt, camera, microphone]);

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
        onEndForAll={onEndForAll}
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
  classId: Id<"classes">;
  callId: string;
  className: string;
  teacherName: string;
  teacherId: string;
  onLeave: () => void;
}

export function ClassCallRoom({
  classId,
  callId,
  className,
  teacherName,
  teacherId,
  onLeave,
}: ClassCallRoomProps) {
  const { session } = useAuth();
  const client = useStreamVideoClient();
  const createSession = useMutation(api.sessions.createSession);
  const endSessionMutation = useMutation(api.sessions.endSession);
  const activeSession = useQuery(api.sessions.getActiveSessionForClass, { classId });
  const [call, setCall] = useState<Call | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isInLobby, setIsInLobby] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const isTeacher = session?.userId === teacherId;
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!client || activeSession === undefined || hasJoinedRef.current) return;

    const joinCall = async () => {
      hasJoinedRef.current = true;
      setIsJoining(true);
      try {
        const callInstance = client.call("default", callId);

        if (isTeacher) {
          await callInstance.join({ create: true });

          // Track who has actually joined this classroom call in the call custom
          // state so chat call cards can correctly show "Call ended" vs "Missed call".
          if (session?.streamUserId) {
            try {
              const custom = callInstance.state.custom as Record<string, unknown> | undefined;
              const joinedParticipants = (custom?.joinedParticipants as string[] | undefined) ?? [];
              if (!joinedParticipants.includes(session.streamUserId)) {
                await callInstance.update({
                  custom: {
                    joinedParticipants: [...joinedParticipants, session.streamUserId],
                  },
                });
              }
            } catch {
              // Best effort: don't block call join if custom state update fails.
            }
          }

          // Only create the Convex session record if one doesn't already exist for this class
          if (!activeSession) {
            await createSession({
              classId,
              hostId: session!.userId as Id<"users">,
              streamCallId: callId,
            });
          }
        } else {
          await callInstance.camera.disable();
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
  }, [client, callId, isTeacher, activeSession]);

  // Teacher: listen for students joining so they can be admitted
  useEffect(() => {
    if (!call || !isTeacher) return;

    const handleEvent = (event: {
      type: string;
      participant?: { user_id?: string; user?: { id?: string; name?: string } };
    }) => {
      if (event.type === "call.session_participant_joined") {
        const participant = event.participant;
        if (!participant) return;
        const userId = participant.user?.id ?? participant.user_id;
        const userName = participant.user?.name ?? userId;
        if (!userId) return;
        setPendingUsers((prev) => {
          if (prev.some((u) => u.id === userId)) return prev;
          return [...prev, { id: userId, name: userName || userId, streamUserId: userId }];
        });
        toast.info(`${userName || "A student"} is waiting to join`);
      }
    };

    call.on("all", handleEvent);
    return () => {
      call.off("all", handleEvent);
    };
  }, [call, isTeacher]);

  // Student: listen for admission signal from the teacher
  useEffect(() => {
    if (!call || isTeacher) return;

    const myStreamUserId = client?.user?.id;

    const markJoined = async (streamUserId: string) => {
      try {
        const custom = call.state.custom as Record<string, unknown> | undefined;
        const joinedParticipants = (custom?.joinedParticipants as string[] | undefined) ?? [];
        if (!joinedParticipants.includes(streamUserId)) {
          await call.update({
            custom: {
              joinedParticipants: [...joinedParticipants, streamUserId],
            },
          });
        }
      } catch {
        // Best effort: custom state might fail if the call custom isn't initialized yet.
      }
    };

    const handleEvent = async (event: {
      type: string;
      custom?: { type?: string; streamUserId?: string };
    }) => {
      // Primary signal: custom event sent by teacher on admit
      if (
        event.type === "custom" &&
        event.custom?.type === "student-admitted" &&
        event.custom?.streamUserId === myStreamUserId
      ) {
        const streamUserIdToMark = event.custom.streamUserId;
        if (streamUserIdToMark) {
          await markJoined(streamUserIdToMark);
        }
        setIsInLobby(false);
        return;
      }
      // Fallback: permissions_updated (fires if call type restricts permissions by default)
      if (event.type === "call.permissions_updated") {
        if (myStreamUserId) {
          await markJoined(myStreamUserId);
        }
        setIsInLobby(false);
      }
    };

    call.on("all", handleEvent);
    return () => {
      call.off("all", handleEvent);
    };
  }, [call, isTeacher, client]);

  const handleAdmit = async (userId: string) => {
    if (!call) return;
    try {
      await call.grantPermissions(userId, ["send-audio", "send-video"]).catch(() => {});
      // Send a custom event as the reliable admission signal — grantPermissions is a
      // no-op on the "default" call type (permissions already granted), so the
      // "call.permissions_updated" event never fires for the student.
      await call.sendCustomEvent({ type: "student-admitted", streamUserId: userId });
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

  const handleEndForAll = async () => {
    if (activeSession) {
      await endSessionMutation({ sessionId: activeSession._id }).catch(() => {});
    }
    await call?.endCall().catch(() => {});
    onLeave();
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
        onEndForAll={handleEndForAll}
      />
    </StreamCall>
  );
}
