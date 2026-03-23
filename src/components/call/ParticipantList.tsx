"use client";

import { useState, useEffect, useRef } from "react";
import { useCallStateHooks, type Call } from "@stream-io/video-react-sdk";
import { toast } from "sonner";
import {
  Users,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Crown,
  MoreVertical,
  Pin,
  Volume2,
  VolumeX
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { VolumeIndicator } from "./VolumeVisualizer";

// SFU TrackType enum values (AUDIO = 1, VIDEO = 2) — not re-exported by the React SDK
const TRACK_AUDIO = 1;
const TRACK_VIDEO = 2;

interface ParticipantListProps {
  isOpen: boolean;
  onClose: () => void;
  isHost?: boolean;
  call?: Call;
}

export function ParticipantList({
  isOpen,
  onClose,
  isHost = false,
  call,
}: ParticipantListProps) {
  const { useParticipants, useLocalParticipant } = useCallStateHooks();
  // useParticipants() already includes the local participant
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();
  const [speakingVolumes, setSpeakingVolumes] = useState<
    Record<string, number>
  >({});
  const [pinnedParticipants, setPinnedParticipants] = useState<Set<string>>(
    new Set()
  );
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  // Track speaking volumes
  useEffect(() => {
    const interval = setInterval(() => {
      const volumes: Record<string, number> = {};
      participants.forEach((p) => {
        if (p.isSpeaking) {
          volumes[p.sessionId] = Math.random() * 60 + 40;
        }
      });
      setSpeakingVolumes(volumes);
    }, 100);
    return () => clearInterval(interval);
  }, [participants]);

  // Auto-scroll to the first speaking participant
  useEffect(() => {
    const speakingId = Object.keys(speakingVolumes)[0];
    if (!speakingId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-session="${speakingId}"]`
    );
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [speakingVolumes]);

  const hostUserId = call?.state.createdBy?.id;

  const handleMute = async (sessionId: string, userId: string, name: string) => {
    const key = `${sessionId}:mute`;
    setLoadingActions((prev) => new Set(prev).add(key));
    try {
      await call?.muteUser(userId, "audio");
      toast.success(`${name || userId} muted`);
    } catch {
      toast.error("Failed to mute");
    } finally {
      setLoadingActions((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleRemove = async (sessionId: string, userId: string) => {
    const key = `${sessionId}:remove`;
    setLoadingActions((prev) => new Set(prev).add(key));
    try {
      await call?.blockUser(userId);
      toast.success("Removed from call");
    } catch {
      toast.error("Failed to remove");
    } finally {
      setLoadingActions((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handlePin = (sessionId: string) => {
    setPinnedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 w-80 z-50 glass-strong border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-white/60" />
            <h3 className="font-semibold text-white">Participants</h3>
            <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
              {participants.length}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            aria-label="Close participants list"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* List */}
        <div
          ref={listRef}
          role="list"
          className="overflow-y-auto h-[calc(100%-65px)] scrollbar-thin p-2 space-y-1"
        >
          {participants.map((participant, index) => {
            const isLocal =
              participant.sessionId === localParticipant?.sessionId;
            const isSpeaking = participant.isSpeaking;
            const isPinned = pinnedParticipants.has(participant.sessionId);
            const isScreenSharing = !!participant.screenShareStream;
            const volume = speakingVolumes[participant.sessionId] || 0;
            const hasMic = (participant.publishedTracks as number[]).includes(TRACK_AUDIO);
            const hasCamera = (participant.publishedTracks as number[]).includes(TRACK_VIDEO);
            const isCallHost =
              (isLocal && isHost) ||
              (!!hostUserId && participant.userId === hostUserId);
            const isMuting = loadingActions.has(`${participant.sessionId}:mute`);
            const isRemoving = loadingActions.has(`${participant.sessionId}:remove`);

            return (
              <div
                key={participant.sessionId}
                role="listitem"
                data-session={participant.sessionId}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                  isSpeaking
                    ? "bg-white/10 border border-white/10"
                    : "hover:bg-white/5"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-linear-to-br from-purple-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white/80">
                      {(participant.name || participant.userId || "U")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  {isSpeaking && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white truncate">
                      {participant.name || participant.userId || "Unknown"}
                    </span>
                    {isLocal && (
                      <span className="text-[10px] text-white/40 bg-white/10 px-1.5 rounded">
                        You
                      </span>
                    )}
                    {isCallHost && (
                      <Crown className="h-3 w-3 text-amber-400 shrink-0" aria-label="Host" />
                    )}
                    {isScreenSharing && (
                      <Monitor className="h-3 w-3 text-purple-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isSpeaking ? (
                      <Volume2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    ) : (
                      <VolumeX className="h-3 w-3 text-white/30 shrink-0" />
                    )}
                    {isSpeaking && (
                      <VolumeIndicator level={volume} className="h-2" />
                    )}
                    <span className="text-xs text-white/40">
                      {isSpeaking
                        ? "Speaking"
                        : isScreenSharing
                          ? "Sharing screen"
                          : "Muted"}
                    </span>
                  </div>
                </div>

                {/* Mic / camera status */}
                <div className="flex items-center gap-1 shrink-0">
                  {hasMic ? (
                    <Mic className="h-3.5 w-3.5 text-white/40" />
                  ) : (
                    <MicOff className="h-3.5 w-3.5 text-red-400" />
                  )}
                  {hasCamera ? (
                    <Video className="h-3.5 w-3.5 text-white/40" />
                  ) : (
                    <VideoOff className="h-3.5 w-3.5 text-red-400" />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handlePin(participant.sessionId)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isPinned
                        ? "text-purple-400 bg-purple-500/20"
                        : "text-white/40 hover:text-white hover:bg-white/10"
                    )}
                    title={isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>

                  {isHost && !isLocal && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="glass-strong border-white/10"
                      >
                        <DropdownMenuItem
                          className="text-white/80 hover:text-white hover:bg-white/10"
                          disabled={isMuting}
                          onClick={() => handleMute(participant.sessionId, participant.userId, participant.name ?? "")}
                        >
                          <MicOff className="h-4 w-4 mr-2" />
                          {isMuting ? "Muting…" : "Mute for all"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          disabled={isRemoving}
                          onClick={() => handleRemove(participant.sessionId, participant.userId)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          {isRemoving ? "Removing…" : "Remove from call"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
