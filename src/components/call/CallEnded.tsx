"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Users, Phone, RotateCcw, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CallEndedProps {
  duration: number;
  participantCount: number;
  dataUsage?: { sent: number; received: number };
  recordingAvailable?: boolean;
  canRejoin?: boolean;
  onRejoin: () => void;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function CallEnded({
  duration,
  participantCount,
  dataUsage,
  recordingAvailable,
  canRejoin = true,
  onRejoin,
  onClose,
}: CallEndedProps) {
  const [countdown, setCountdown] = useState(10);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (countdown <= 0) {
      onClose();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
              <Phone className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <h2 
          className="text-3xl font-bold text-center text-white mb-2"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Call Ended
        </h2>
        <p className="text-center text-white/50 mb-8">Thanks for using Stream School</p>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-white/40">Duration</p>
                <p className="text-lg font-mono font-semibold text-white">
                  {formatDuration(duration)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-white/40">Participants</p>
                <p className="text-lg font-mono font-semibold text-white">
                  {participantCount}
                </p>
              </div>
            </div>
          </div>

          {dataUsage && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-white/40 mb-2">Data Usage</p>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Sent</span>
                <span className="font-mono text-white">{formatBytes(dataUsage.sent)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-white/60">Received</span>
                <span className="font-mono text-white">{formatBytes(dataUsage.received)}</span>
              </div>
            </div>
          )}

          {recordingAvailable && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm text-amber-200">Recording available in your library</span>
            </div>
          )}
        </div>

        <div className="mb-6">
          <p className="text-center text-sm text-white/50 mb-3">How was your call quality?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-6 w-6 transition-colors",
                    star <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-white/20 hover:text-white/40"
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className={cn(
              "h-12 border-white/10 bg-white/5 text-white hover:bg-white/10",
              canRejoin ? "flex-1" : "w-full"
            )}
          >
            <X className="h-4 w-4 mr-2" />
            Close ({countdown}s)
          </Button>
          {canRejoin && (
            <Button
              onClick={onRejoin}
              className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rejoin
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
