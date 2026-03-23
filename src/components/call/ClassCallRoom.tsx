"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  StreamCall,
  SpeakerLayout,
  useStreamVideoClient,
  useCall,
  Call,
} from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Lobby } from "./Lobby";
import { LobbyAdmitter } from "./LobbyAdmitter";
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
    <div className="absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
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

interface ClassCallRoomProps {
  callId: string;
  className: string;
  teacherName: string;
  teacherId: string;
  onLeave: () => void;
}

interface PendingUser {
  id: string;
  name: string;
  streamUserId: string;
}

export function ClassCallRoom({
  callId,
  className,
  teacherName,
  teacherId,
  onLeave,
}: ClassCallRoomProps) {
  const { session } = useAuth();
  const { gradeBand } = useGradeSkin();
  const isPrimaryBand = gradeBand === "primary";
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
          // Teacher joins with create: true
          await callInstance.join({ create: true });
        } else {
          // Student joins (will be placed in lobby)
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
        call.leave();
      }
    };
  }, [client, callId, isTeacher]);

  // Listen for call events
  useEffect(() => {
    if (!call) return;

    const handleEvent = (event: { type: string; user?: { id: string; name?: string } }) => {
      if (event.type === "call.session_participant_joined") {
        // Add to pending users if in lobby
        const user = event.user;
        if (isTeacher && user) {
          setPendingUsers((prev) => [
            ...prev,
            {
              id: user.id,
              name: user.name || user.id,
              streamUserId: user.id,
            },
          ]);
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
      // Grant permissions to user
      await call.grantPermissions(userId, ["send-audio", "send-video"]);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User admitted");
    } catch (err) {
      toast.error("Failed to admit user");
    }
  };

  const handleDeny = async (userId: string) => {
    if (!call) return;
    try {
      await call.blockUser(userId);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User removed");
    } catch (err) {
      toast.error("Failed to remove user");
    }
  };

  const handleMuteAll = async () => {
    if (!call) return;
    try {
      await call.muteAllUsers("audio");
      toast.success("All participants muted");
    } catch (err) {
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

  // Show lobby for students waiting to be admitted
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
    <div className="relative h-full">
      <StreamCall call={call}>
        <div className="flex h-full">
          <div className="relative flex-1">
            <SpeakerLayout />

            {/* EDU-T59: primary band — simplified call chrome (no bulk mute; CC remains for accessibility) */}
            {isTeacher && !isPrimaryBand && (
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleMuteAll}
                  className="flex items-center gap-2"
                >
                  <MicOff className="h-4 w-4" />
                  Mute All
                </Button>
              </div>
            )}
            <TranscriptionControls isTeacher={isTeacher} />
          </div>

          {/* Teacher sidebar with lobby */}
          {isTeacher && (
            <div className="absolute right-4 top-4 z-10">
              <LobbyAdmitter
                pendingUsers={pendingUsers}
                onAdmit={handleAdmit}
                onDeny={handleDeny}
              />
            </div>
          )}
        </div>
      </StreamCall>
    </div>
  );
}
