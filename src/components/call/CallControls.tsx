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
        "group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        danger
          ? "bg-red-500/90 hover:bg-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:shadow-[0_0_28px_rgba(239,68,68,0.5)]"
          : active
            ? "bg-white/12 hover:bg-white/18 text-white border border-white/8"
            : "bg-white/5 hover:bg-white/10 text-white/35 border border-white/5"
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
    try { await call?.camera.disable(); } catch {}
    try { await call?.microphone.disable(); } catch {}
    [localParticipant?.videoStream, localParticipant?.audioStream].forEach(
      (stream) => stream?.getTracks().forEach((track) => track.stop())
    );
    await call?.leave();
    onLeave();
  }

  async function addParticipant(userId: string) {
    await call?.updateCallMembers({ update_members: [{ user_id: userId }] });
    setShowAddParticipant(false);
  }

  return (
    <div className="shrink-0 flex items-center justify-center gap-2.5 px-6 py-5"
      style={{ background: "oklch(0.072 0.022 268 / 95%)", borderTop: "1px solid oklch(1 0 0 / 7%)" }}>

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

      {/* Divider */}
      <div className="h-8 w-px bg-white/10 mx-1" />

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
