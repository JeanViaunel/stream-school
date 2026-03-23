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
  BackgroundFiltersProvider
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
  pendingUsers,
  onAdmit,
  onDeny,
  onMuteAll,
  onLeave,
  onEndForAll,
  activeSessionId
}: ClassCallRoomInnerProps & { activeSessionId?: Id<"sessions"> }) {
  const {
    useCallCallingState,
    useParticipants,
    useCameraState,
    useMicrophoneState,
    useScreenShareState
  } = useCallStateHooks();
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
  if (
    showRinging ||
    callingState === CallingState.RINGING ||
    callingState === CallingState.JOINING
  ) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-950/50 via-slate-950 to-purple-950/30" />

        <div className="relative z-10 text-center space-y-6">
          {/* Animated rings */}
          <div className="relative flex justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute h-40 w-40 rounded-full border-2 border-purple-500/20 animate-ring-pulse" />
              <div
                className="absolute h-48 w-48 rounded-full border border-purple-500/10 animate-ring-pulse"
                style={{ animationDelay: "0.3s" }}
              />
              <div
                className="absolute h-56 w-56 rounded-full border border-purple-500/5 animate-ring-pulse"
                style={{ animationDelay: "0.6s" }}
              />
            </div>

            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-linear-to-br from-purple-500/30 to-indigo-500/30 border-2 border-purple-500/40 shadow-2xl shadow-purple-500/20">
              <span
                className="text-3xl font-bold text-white"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                📞
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h2
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              {callingState === CallingState.RINGING
                ? "Ringing..."
                : "Joining classroom..."}
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
        return (
          <SpeakerLayout key="sidebar-layout" participantsBarPosition="left" />
        );
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
  onLeave
}: ClassCallRoomProps) {
  const { session } = useAuth();
  const isTeacher = session?.userId === teacherId;
  const client = useStreamVideoClient();
  const createSession = useMutation(api.sessions.createSession);
  const endSessionMutation = useMutation(api.sessions.endSession);
  const requestLobbyAccess = useMutation(api.sessions.requestLobbyAccess);
  const admitLobbyRequest = useMutation(api.sessions.admitLobbyRequest);
  const denyLobbyRequest = useMutation(api.sessions.denyLobbyRequest);
  const activeSession = useQuery(api.sessions.getActiveSessionForClass, {
    classId
  });
  const lobbyPending = useQuery(
    api.sessions.listPendingLobbyForSession,
    isTeacher && activeSession?._id ? { sessionId: activeSession._id } : "skip"
  );
  const myLobbyRequest = useQuery(
    api.sessions.getMyLobbyRequestForSession,
    !isTeacher && activeSession?._id ? { sessionId: activeSession._id } : "skip"
  );
  const [call, setCall] = useState<Call | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isEnteringClassroom, setIsEnteringClassroom] = useState(false);
  const [isInLobby, setIsInLobby] = useState(false);
  const teacherInitRef = useRef(false);
  const studentLobbyInitRef = useRef(false);
  const studentJoinedAfterAdmitRef = useRef(false);
  const deniedDismissRef = useRef(false);

  const pendingUsers: PendingUser[] = useMemo(() => {
    if (!lobbyPending) return [];
    return lobbyPending.map((r) => ({
      id: r.streamUserId,
      streamUserId: r.streamUserId,
      name: r.displayName,
      requestId: r._id
    }));
  }, [lobbyPending]);

  useEffect(() => {
    if (!client || activeSession === undefined) return;
    if (isTeacher) {
      if (teacherInitRef.current) return;
      teacherInitRef.current = true;
      const run = async () => {
        setIsJoining(true);
        try {
          const callInstance = client.call("default", callId);
          await callInstance.join({ create: true });

          if (session?.streamUserId) {
            try {
              const custom = callInstance.state.custom as
                | Record<string, unknown>
                | undefined;
              const joinedParticipants =
                (custom?.joinedParticipants as string[] | undefined) ?? [];
              if (!joinedParticipants.includes(session.streamUserId)) {
                await callInstance.update({
                  custom: {
                    joinedParticipants: [
                      ...joinedParticipants,
                      session.streamUserId
                    ]
                  }
                });
              }
            } catch {
              // Best effort
            }
          }

          if (!activeSession) {
            await createSession({
              classId,
              hostId: session!.userId as Id<"users">,
              streamCallId: callId
            });
          }
          setCall(callInstance);
        } catch (err) {
          teacherInitRef.current = false;
          toast.error("Failed to join call");
          console.error(err);
        } finally {
          setIsJoining(false);
        }
      };
      void run();
      return () => {
        call?.leave().catch(() => {});
      };
    }

    // Student: wait until the teacher has started a Convex session, then watch the call (no SFU join yet).
    if (activeSession === null) return;
    if (!session?.streamUserId) return;
    if (studentLobbyInitRef.current) return;
    studentLobbyInitRef.current = true;

    const runStudent = async () => {
      setIsJoining(true);
      try {
        const callInstance = client.call("default", callId);
        await callInstance.get();
        await requestLobbyAccess({
          sessionId: activeSession._id,
          streamUserId: session.streamUserId,
          displayName: session.displayName ?? "Student"
        });
        setCall(callInstance);
        setIsInLobby(true);
      } catch (err) {
        studentLobbyInitRef.current = false;
        toast.error("Could not request to join the classroom");
        console.error(err);
      } finally {
        setIsJoining(false);
      }
    };
    void runStudent();

    return () => {
      call?.leave().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, callId, isTeacher, activeSession]);

  /** Join must run from a user gesture (e.g. button); otherwise getUserMedia can fail with "prompting again is not allowed". */
  const handleStudentEnterClassroom = useCallback(async () => {
    if (!call || isTeacher) return;
    if (!myLobbyRequest || myLobbyRequest.status !== "admitted") return;
    if (studentJoinedAfterAdmitRef.current) return;
    studentJoinedAfterAdmitRef.current = true;
    setIsEnteringClassroom(true);
    try {
      await call.join();
      setIsInLobby(false);
    } catch (err) {
      studentJoinedAfterAdmitRef.current = false;
      toast.error("Failed to enter the classroom");
      console.error(err);
    } finally {
      setIsEnteringClassroom(false);
    }
  }, [call, isTeacher, myLobbyRequest]);

  useEffect(() => {
    if (!myLobbyRequest || myLobbyRequest.status !== "denied" || isTeacher)
      return;
    if (deniedDismissRef.current) return;
    deniedDismissRef.current = true;
    toast.error("The teacher did not admit you to this session");
    onLeave();
  }, [myLobbyRequest, isTeacher, onLeave]);

  // Student: listen for admission signal from the teacher
  useEffect(() => {
    if (!call || isTeacher) return;

    const myStreamUserId = session?.streamUserId;

    const markJoined = async (streamUserId: string) => {
      try {
        const custom = call.state.custom as Record<string, unknown> | undefined;
        const joinedParticipants =
          (custom?.joinedParticipants as string[] | undefined) ?? [];
        if (!joinedParticipants.includes(streamUserId)) {
          await call.update({
            custom: {
              joinedParticipants: [...joinedParticipants, streamUserId]
            }
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
        return;
      }
      // Fallback: permissions_updated (fires if call type restricts permissions by default)
      if (event.type === "call.permissions_updated") {
        if (myStreamUserId) {
          await markJoined(myStreamUserId);
        }
      }
    };

    call.on("all", handleEvent);
    return () => {
      call.off("all", handleEvent);
    };
  }, [call, isTeacher, client, session?.streamUserId]);

  const handleAdmit = async (userId: string) => {
    if (!call) return;
    const row = lobbyPending?.find((r) => r.streamUserId === userId);
    try {
      if (row) {
        await admitLobbyRequest({ requestId: row._id });
      }
      await call
        .grantPermissions(userId, ["send-audio", "send-video"])
        .catch(() => {});
      await call.sendCustomEvent({
        type: "student-admitted",
        streamUserId: userId
      });
      toast.success("User admitted");
    } catch {
      toast.error("Failed to admit user");
    }
  };

  const handleDeny = async (userId: string) => {
    if (!call) return;
    const row = lobbyPending?.find((r) => r.streamUserId === userId);
    try {
      if (row) {
        await denyLobbyRequest({ requestId: row._id });
      }
      await call.blockUser(userId);
      toast.success("User removed");
    } catch {
      toast.error("Failed to remove user");
    }
  };

  const handleEndForAll = async () => {
    if (activeSession) {
      await endSessionMutation({ sessionId: activeSession._id }).catch(
        () => {}
      );
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

  if (activeSession === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isJoining) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isTeacher && activeSession === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <p className="text-muted-foreground max-w-sm">
          Waiting for the teacher to start this class session. Try again in a
          moment.
        </p>
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
        lobbyPhase={
          myLobbyRequest?.status === "admitted" ? "admitted" : "waiting"
        }
        onEnterClassroom={handleStudentEnterClassroom}
        isEnteringClassroom={isEnteringClassroom}
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
          "/backgrounds/space.svg"
        ]}
        onError={(error) => {
          console.error("Background filter error:", error);
        }}
      >
        <ClassCallRoomInner
          isTeacher={isTeacher}
          className={className}
          pendingUsers={pendingUsers}
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
