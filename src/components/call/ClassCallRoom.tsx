"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StreamCall,
  StreamTheme,
  SpeakerLayout,
  PaginatedGridLayout,
  useStreamVideoClient,
  useCall,
  useCallStateHooks,
  Call,
  CallingState,
  BackgroundFiltersProvider,
} from "@stream-io/video-react-sdk";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Lobby } from "./Lobby";
import { LobbyAdmitter } from "./LobbyAdmitter";
import { CallEnded } from "./CallEnded";
import { FloatingControls, CallLayout } from "./FloatingControls";
import { PermissionRequests } from "./PermissionRequests";
import { RequestPermissionButton } from "./RequestPermissionButton";
import { useAuth } from "@/contexts/AuthContext";
import { useGradeSkin } from "@/contexts/GradeSkinContext";
import { toast } from "sonner";
import { Loader2, MicOff } from "lucide-react";
import { ClosedCaptions } from "./ClosedCaptions";
import { ScreenShareAnnotation } from "./ScreenShareAnnotation";

interface PendingUser {
  id: string;
  name: string;
  streamUserId: string;
  requestId: Id<"sessionLobbyRequests">;
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
  activeSessionId?: Id<"sessions">;
}

function ClassCallRoomInner({
  isTeacher,
  className,
  teacherName,
  pendingUsers,
  addPendingIfNew,
  onAdmit,
  onDeny,
  onMuteAll,
  onLeave,
  onEndForAll,
  activeSessionId,
}: ClassCallRoomInnerProps & { activeSessionId?: Id<"sessions"> }) {
  const {
    useCallCallingState,
    useParticipants,
    useRemoteParticipants,
    useCameraState,
    useMicrophoneState,
    useScreenShareState,
  } = useCallStateHooks();
  const remoteParticipants = useRemoteParticipants();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const { camera } = useCameraState();
  const { microphone } = useMicrophoneState();
  const { isMute: isScreenShareMuted } = useScreenShareState();
  const call = useCall();
  const { gradeBand } = useGradeSkin();
  const isPrimaryBand = gradeBand === "primary";
  
  // Layout state - managed here and passed to controls
  const [currentLayout, setCurrentLayout] = useState<CallLayout>("spotlight");

  const [showEnded, setShowEnded] = useState(false);
  const [showRinging, setShowRinging] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [wasTerminated, setWasTerminated] = useState(false);
  const endHandledRef = useRef(false);
  const lastParticipantCountRef = useRef(0);
  const screenShareContainerRef = useRef<HTMLDivElement>(null);

  // Check if screen sharing is active
  const isScreenSharing = !isScreenShareMuted;

  useEffect(() => {
    lastParticipantCountRef.current = participants.length;
  }, [participants]);

  // Teacher: when remote participants appear in reactive state, queue them for admit + toast.
  // This complements call.session_participant_joined (some clients miss or filter WS events).
  useEffect(() => {
    if (!isTeacher) return;
    for (const p of remoteParticipants) {
      const streamUserId = p.userId;
      if (!streamUserId) continue;
      addPendingIfNew(streamUserId, p.name ?? streamUserId);
    }
  }, [isTeacher, remoteParticipants, addPendingIfNew]);

  // Track call duration while joined
  useEffect(() => {
    if (callingState !== CallingState.JOINED) return;
    const interval = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callingState]);

  // Handle ringing state transitions
  useEffect(() => {
    if (callingState === CallingState.RINGING) {
      setShowRinging(true);
    } else if (callingState === CallingState.JOINED) {
      setShowRinging(false);
    }
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
              {callingState === CallingState.RINGING ? "Ringing..." : "Joining classroom..."}
            </h2>
            <p className="text-white/50">
              {callingState === CallingState.RINGING 
                ? "Waiting for others to answer" 
                : "Connecting to the classroom"}
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

  // Render the appropriate layout based on current selection
  const renderLayout = () => {
    switch (currentLayout) {
      case "grid":
        return <PaginatedGridLayout key="grid-layout" />;
      case "sidebar":
        return <SpeakerLayout key="sidebar-layout" participantsBarPosition="left" />;
      case "spotlight":
      default:
        return <SpeakerLayout key="spotlight-layout" />;
    }
  };

  return (
    <div className="relative h-full bg-slate-950">
      <StreamTheme className="relative w-full h-full bg-transparent">
        <div 
          ref={screenShareContainerRef}
          className="absolute inset-0 flex items-center justify-center pb-24"
        >
          {renderLayout()}
          
          {/* Screen Share Annotation Overlay */}
          {isScreenSharing && activeSessionId && (
            <ScreenShareAnnotation
              sessionId={activeSessionId}
              isTeacher={isTeacher}
              screenShareElement={screenShareContainerRef.current}
            />
          )}
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

      {/* Closed captions overlay for all users */}
      <ClosedCaptions />

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

      {/* Permission requests notification panel for teacher/moderator */}
      {isTeacher && <PermissionRequests />}

      {/* Permission request buttons for students */}
      {!isTeacher && (
        <div className="absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          <RequestPermissionButton />
        </div>
      )}

      <FloatingControls
        onLeave={onLeave}
        onEndForAll={onEndForAll}
        currentLayout={currentLayout}
        onLayoutChange={setCurrentLayout}
        isTeacher={isTeacher}
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

  const addPendingIfNew = useCallback(
    (streamUserId: string, displayName: string) => {
      if (!streamUserId || streamUserId === session?.streamUserId) return;
      setPendingUsers((prev) => {
        if (prev.some((u) => u.id === streamUserId)) return prev;
        toast.info(`${displayName || "A participant"} is waiting to join`);
        return [
          ...prev,
          {
            id: streamUserId,
            name: displayName || streamUserId,
            streamUserId,
          },
        ];
      });
    },
    [session?.streamUserId]
  );

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
          // For students: disable camera initially but allow them to enable later
          await callInstance.camera.disable();
          await callInstance.microphone.disable();
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

  // Teacher: listen for students joining the call session (subscribe to the concrete event).
  useEffect(() => {
    if (!call || !isTeacher) return;

    const handleSessionParticipantJoined = (event: {
      type: string;
      participant?: { user?: { id?: string; name?: string } };
    }) => {
      if (event.type !== "call.session_participant_joined") return;
      const participant = event.participant;
      const userId = participant?.user?.id;
      if (!userId) return;
      const userName = participant.user?.name ?? userId;
      addPendingIfNew(userId, userName);
    };

    const unsubscribe = call.on(
      "call.session_participant_joined",
      handleSessionParticipantJoined
    );
    return () => {
      unsubscribe();
    };
  }, [call, isTeacher, addPendingIfNew]);

  // Student: listen for admission signal from the teacher
  useEffect(() => {
    if (!call || isTeacher) return;

    const myStreamUserId = session?.streamUserId;

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
        <ClassCallRoomInner
          isTeacher={isTeacher}
          className={className}
          teacherName={teacherName}
          pendingUsers={pendingUsers}
          addPendingIfNew={addPendingIfNew}
          onAdmit={handleAdmit}
          onDeny={handleDeny}
          onMuteAll={handleMuteAll}
          onLeave={onLeave}
          onEndForAll={handleEndForAll}
          activeSessionId={activeSession?._id}
        />
      </BackgroundFiltersProvider>
    </StreamCall>
  );
}
