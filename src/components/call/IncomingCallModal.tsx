"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCalls,
  CallingState,
  StreamCall,
  useCallStateHooks,
  VideoPreview,
  Avatar,
  AcceptCallButton,
  CancelCallButton,
  type Call,
  type UserResponse
} from "@stream-io/video-react-sdk";
import { PhoneOff } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { startRingtone } from "@/lib/settings";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Call calling state label component
const CALLING_STATE_TO_LABEL: Partial<Record<CallingState, string>> = {
  [CallingState.JOINING]: "Joining...",
  [CallingState.RINGING]: "Ringing...",
  [CallingState.RECONNECTING]: "Re-connecting...",
  [CallingState.RECONNECTING_FAILED]: "Connection Failed",
  [CallingState.OFFLINE]: "No internet connection",
  [CallingState.IDLE]: "",
  [CallingState.UNKNOWN]: "",
  [CallingState.JOINED]: "Joined",
  [CallingState.LEFT]: "Left call"
};

const CallCallingStateLabel = () => {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const callingStateLabel = CALLING_STATE_TO_LABEL[callingState];

  return callingStateLabel ? (
    <div className="text-center">
      <span className="text-sm uppercase tracking-[0.15em] text-purple-400 font-medium">
        {callingStateLabel}
      </span>
    </div>
  ) : null;
};

// Custom toggle buttons for ringing call panel
const RingingCallToggleAudio = () => {
  const { useMicrophoneState } = useCallStateHooks();
  const { microphone, isMute } = useMicrophoneState();

  return (
    <button
      onClick={() => microphone.toggle()}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full transition-colors border",
        isMute
          ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
          : "bg-white/10 text-white border-white/10 hover:bg-white/20"
      )}
    >
      {isMute ? (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      )}
    </button>
  );
};

const RingingCallToggleVideo = () => {
  const { useCameraState } = useCallStateHooks();
  const { camera, isMute } = useCameraState();

  return (
    <button
      onClick={() => camera.toggle()}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full transition-colors border",
        isMute
          ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
          : "bg-white/10 text-white border-white/10 hover:bg-white/20"
      )}
    >
      {isMute ? (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
};

// Component to display call members (caller for incoming, called users for outgoing)
const CallMembers = ({
  members,
  isOutgoing
}: {
  members: UserResponse[];
  isOutgoing: boolean;
}) => {
  if (members.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex -space-x-4">
        {members.slice(0, 3).map((member) => (
          <div key={member.id} className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-purple-500/30 to-indigo-500/30 border-2 border-purple-500/40 shadow-2xl shadow-purple-500/20 overflow-hidden">
              {member.image ? (
                <Image
                  src={member.image}
                  alt={member.name || member.id}
                  className="h-full w-full object-cover"
                  width={96}
                  height={96}
                />
              ) : (
                <Avatar
                  name={member.name || member.id}
                  imageSrc={member.image}
                  style={{ width: 96, height: 96 }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="text-center">
        <h2
          className="text-2xl font-bold text-white mb-1"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          {members.length === 1
            ? members[0]?.name || members[0]?.id || "Unknown"
            : `${members.length} people`}
        </h2>
        <p className="text-white/50">
          {isOutgoing ? "Calling..." : "is calling you"}
        </p>
      </div>
    </div>
  );
};

// Custom Ringing Call Panel using Stream SDK components
function RingingCallPanel({ call }: { call: Call }) {
  const router = useRouter();
  const {
    useCallCallingState,
    useCallMembers,
    useCallCreatedBy,
    useCameraState
  } = useCallStateHooks();
  const callingState = useCallCallingState();
  const members = useCallMembers();
  const creator = useCallCreatedBy();
  const { camera, isMute: isCameraMute } = useCameraState();
  const [countdown, setCountdown] = useState(30);
  const { settings } = useSettings();
  const stopRingtoneRef = useRef<(() => void) | null>(null);

  const isOutgoing = call.isCreatedByMe;
  const isJoining = callingState === CallingState.JOINING;

  const handleDecline = useCallback(async () => {
    const reason = isOutgoing ? "cancel" : "decline";
    await call.leave({ reject: true, reason });
  }, [call, isOutgoing]);

  // Enable camera by default for ring calls
  useEffect(() => {
    camera.enable().catch(() => {});
  }, [camera]);

  // Start / stop ringtone based on callSounds setting and ringing state
  useEffect(() => {
    if (
      settings.callSounds &&
      callingState === CallingState.RINGING &&
      !isOutgoing
    ) {
      stopRingtoneRef.current = startRingtone();
    }
    return () => {
      stopRingtoneRef.current?.();
      stopRingtoneRef.current = null;
    };
  }, [settings.callSounds, callingState, isOutgoing]);

  // Auto-decline countdown
  useEffect(() => {
    if (callingState !== CallingState.RINGING) return;
    if (countdown <= 0) {
      handleDecline();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, callingState, handleDecline]);

  if (
    callingState !== CallingState.RINGING &&
    callingState !== CallingState.JOINING
  ) {
    return null;
  }

  // Determine members to show
  let membersToShow: UserResponse[] = [];
  if (isOutgoing) {
    // Show called users for outgoing call
    membersToShow =
      members
        ?.slice(0, 3)
        .map(({ user }) => user)
        .filter((u): u is UserResponse => !!u) || [];
  } else if (creator) {
    // Show caller for incoming call
    membersToShow = [creator];
  }

  const handleAccept = async () => {
    await call.join();
    router.push(`/call/${call.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
        {/* Video Preview or Member Avatars */}
        <div className="flex justify-center mb-8">
          {isCameraMute ? (
            <CallMembers members={membersToShow} isOutgoing={isOutgoing} />
          ) : (
            <div className="relative">
              {/* Video Preview */}
              <div className="relative w-64 h-48 rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                <VideoPreview
                  mirror={true}
                  DisabledVideoPreview={() => (
                    <CallMembers
                      members={membersToShow}
                      isOutgoing={isOutgoing}
                    />
                  )}
                />
              </div>

              {/* Calling label overlay */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                <CallCallingStateLabel />
              </div>
            </div>
          )}
        </div>

        {/* Show calling state when video is muted */}
        {isCameraMute && (
          <div className="mb-6">
            <CallCallingStateLabel />
          </div>
        )}

        {/* Incoming/Outgoing label */}
        <div className="text-center mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-purple-400 font-medium mb-2">
            {isOutgoing ? "Outgoing Video Call" : "Incoming Video Call"}
          </p>
        </div>

        {/* Countdown ring (only for incoming calls) */}
        {!isOutgoing && (
          <div className="flex justify-center mb-10">
            <div className="relative">
              <svg className="h-16 w-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  className="text-white/10"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - countdown / 30)}
                  className="text-purple-400 transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-mono font-semibold text-white">
                  {countdown}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6">
          {/* Toggle controls */}
          <div className="flex items-center gap-3">
            <RingingCallToggleAudio />
            <RingingCallToggleVideo />
          </div>

          {/* Accept/Decline buttons */}
          {isOutgoing ? (
            /* Outgoing call - Cancel button only */
            <CancelCallButton onClick={handleDecline} disabled={isJoining} />
          ) : (
            /* Incoming call - Accept and Decline buttons */
            <div className="flex items-center gap-6">
              {/* Decline */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleDecline}
                  disabled={isJoining}
                  className={cn(
                    "group relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200",
                    isJoining
                      ? "bg-gray-500/50 cursor-not-allowed"
                      : "bg-linear-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30 hover:scale-110 hover:shadow-red-500/50"
                  )}
                >
                  <PhoneOff className="h-7 w-7 text-white transition-transform duration-200 group-hover:rotate-12" />
                </button>
                <span className="text-xs font-medium text-white/60">
                  Decline
                </span>
              </div>

              {/* Accept */}
              <AcceptCallButton onClick={handleAccept} disabled={isJoining} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function IncomingCallModal() {
  const calls = useCalls();
  const { session } = useAuth();
  const isAdmin = session?.role === "admin";

  const ringingCalls = calls.filter((call) => {
    if (!call.ringing || call.isCreatedByMe) return false;
    // Admins cannot join classroom sessions — silently decline the ring.
    if (isAdmin && call.type === "classroom") return false;
    return true;
  });

  // Auto-decline classroom rings directed at admins so the call state clears properly.
  useEffect(() => {
    if (!isAdmin) return;
    calls.forEach((call) => {
      if (call.ringing && !call.isCreatedByMe && call.type === "classroom") {
        call.leave({ reject: true, reason: "decline" }).catch(() => {});
      }
    });
  }, [calls, isAdmin]);

  return (
    <>
      {ringingCalls.map((call) => (
        <StreamCall call={call} key={call.cid}>
          <RingingCallPanel call={call} />
        </StreamCall>
      ))}
    </>
  );
}
