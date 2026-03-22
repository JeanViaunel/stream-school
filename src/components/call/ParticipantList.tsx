"use client";

import { useState, useEffect, useRef } from "react";
import { useCallStateHooks, type Call } from "@stream-io/video-react-sdk";
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
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VolumeIndicator } from "./VolumeVisualizer";

interface ParticipantListProps {
  isOpen: boolean;
  onClose: () => void;
  isHost?: boolean;
}

export function ParticipantList({ isOpen, onClose, isHost = false }: ParticipantListProps) {
  const { useParticipants, useLocalParticipant } = useCallStateHooks();
  // useParticipants() already includes the local participant
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();
  const [speakingVolumes, setSpeakingVolumes] = useState<Record<string, number>>({});
  const [pinnedParticipants, setPinnedParticipants] = useState<Set<string>>(new Set());

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

  const allParticipants = participants;

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
              {allParticipants.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto h-[calc(100%-65px)] scrollbar-thin p-2 space-y-1">
          {allParticipants.map((participant, index) => {
            const isLocal = participant.sessionId === localParticipant?.sessionId;
            const isSpeaking = participant.isSpeaking;
            const isPinned = pinnedParticipants.has(participant.sessionId);
            const isScreenSharing = participant.screenShareStream;
            const volume = speakingVolumes[participant.sessionId] || 0;

            return (
              <div
                key={participant.sessionId}
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
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white/80">
                      {(participant.name || participant.userId || "U").slice(0, 2).toUpperCase()}
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
                      <span className="text-[10px] text-white/40 bg-white/10 px-1.5 rounded">You</span>
                    )}
                    {isScreenSharing && (
                      <Monitor className="h-3 w-3 text-purple-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {isSpeaking && (
                      <VolumeIndicator level={volume} className="h-2" />
                    )}
                    <span className="text-xs text-white/40">
                      {isSpeaking ? "Speaking" : isScreenSharing ? "Sharing screen" : "Muted"}
                    </span>
                  </div>
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
                      <DropdownMenuContent align="end" className="glass-strong border-white/10">
                        <DropdownMenuItem className="text-white/80 hover:text-white hover:bg-white/10">
                          <MicOff className="h-4 w-4 mr-2" />
                          Mute for all
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <X className="h-4 w-4 mr-2" />
                          Remove from call
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
