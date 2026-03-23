"use client";

import { useCallStateHooks } from "@stream-io/video-react-sdk";
import { cn } from "@/lib/utils";

interface ClosedCaptionsProps {
  className?: string;
}

export function ClosedCaptions({ className }: ClosedCaptionsProps) {
  const { useCallClosedCaptions, useIsCallCaptioningInProgress } = useCallStateHooks();
  const captions = useCallClosedCaptions();
  const isCaptioningInProgress = useIsCallCaptioningInProgress();

  // Don't show if captions are not active
  if (!isCaptioningInProgress || captions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-24 left-1/2 z-30 -translate-x-1/2",
        "max-w-2xl w-full px-4",
        className
      )}
    >
      <div className="space-y-2">
        {captions.map(({ user, text, start_time }) => (
          <div
            key={`${user.id}-${start_time}`}
            className={cn(
              "rounded-lg px-4 py-2",
              "bg-black/70 backdrop-blur-sm",
              "border border-white/10",
              "animate-in fade-in slide-in-from-bottom-2 duration-300"
            )}
          >
            <span className="font-medium text-green-400">{user.name || user.id}: </span>
            <span className="text-white">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
