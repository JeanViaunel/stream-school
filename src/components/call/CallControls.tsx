"use client";

import { useState } from "react";
import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, UserPlus } from "lucide-react";
import { UserSearchModal } from "@/components/chat/UserSearchModal";
import { cn } from "@/lib/utils";

function ControlButton({
  onClick,
  active = true,
  danger = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        danger
          ? "bg-red-500 hover:bg-red-400 text-white"
          : active
            ? "bg-white/12 hover:bg-white/20 text-white"
            : "bg-white/6 hover:bg-white/12 text-white/40"
      )}
    >
      {children}
    </button>
  );
}

interface CallControlsProps {
  onLeave: () => void;
}

export function CallControls({ onLeave }: CallControlsProps) {
  const call = useCall();
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  const isMicOn = !!localParticipant?.audioStream;
  const isCamOn = !!localParticipant?.videoStream;

  async function handleLeave() {
    await call?.leave();
    onLeave();
  }

  async function addParticipant(userId: string) {
    await call?.updateCallMembers({ update_members: [{ user_id: userId }] });
    setShowAddParticipant(false);
  }

  return (
    <div className="shrink-0 flex items-center justify-center gap-3 px-6 py-4 bg-zinc-950/95 border-t border-white/8 backdrop-blur-sm">
      <ControlButton
        onClick={() => call?.microphone.toggle()}
        active={isMicOn}
        title={isMicOn ? "Mute microphone" : "Unmute microphone"}
      >
        {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </ControlButton>

      <ControlButton
        onClick={() => call?.camera.toggle()}
        active={isCamOn}
        title={isCamOn ? "Turn off camera" : "Turn on camera"}
      >
        {isCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </ControlButton>

      <ControlButton
        onClick={() => call?.screenShare.toggle()}
        title="Share screen"
      >
        <Monitor className="h-5 w-5" />
      </ControlButton>

      <ControlButton
        onClick={() => setShowAddParticipant(true)}
        title="Add participant"
      >
        <UserPlus className="h-5 w-5" />
      </ControlButton>

      <div className="w-px h-8 bg-white/12 mx-1" />

      <ControlButton onClick={handleLeave} danger title="Leave call">
        <PhoneOff className="h-5 w-5" />
      </ControlButton>

      {showAddParticipant && (
        <UserSearchModal
          onSelect={addParticipant}
          onClose={() => setShowAddParticipant(false)}
        />
      )}
    </div>
  );
}
