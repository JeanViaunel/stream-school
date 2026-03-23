"use client";

import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Captions, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TranscriptionToggleProps {
  isTeacher: boolean;
  variant?: "button" | "icon";
}

export function TranscriptionToggle({ isTeacher, variant = "icon" }: TranscriptionToggleProps) {
  const call = useCall();
  const { useCallSettings, useIsCallTranscribingInProgress } = useCallStateHooks();
  const settings = useCallSettings();
  const isTranscribing = useIsCallTranscribingInProgress();
  const [isLoading, setIsLoading] = useState(false);

  // Only show for teachers
  if (!isTeacher) return null;

  const transcriptionMode = settings?.transcription?.mode;

  // Don't render if transcription is disabled
  if (transcriptionMode === "disabled") {
    return null;
  }

  // Show indicator if auto-on (rendered separately by parent)
  if (transcriptionMode === "auto-on") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 backdrop-blur-md px-3 py-2">
        <Captions className="h-4 w-4 text-green-400" />
        <span className="text-sm text-white/80">Transcription On</span>
      </div>
    );
  }

  // Available mode - show toggle button
  async function toggleTranscription() {
    if (!call) return;

    setIsLoading(true);
    try {
      if (isTranscribing) {
        await call.stopTranscription();
        toast.success("Transcription stopped");
      } else {
        await call.startTranscription();
        toast.success("Transcription started");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error("Failed to toggle transcription");
    } finally {
      setIsLoading(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTranscription}
        disabled={isLoading}
        aria-pressed={isTranscribing}
        aria-label={isTranscribing ? "Stop transcription" : "Start transcription"}
        className={cn(
          "group relative flex h-14 w-14 items-center justify-center rounded-2xl",
          "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          isTranscribing
            ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 hover:scale-110"
            : "bg-white/12 hover:bg-white/18 text-white border border-white/10 hover:border-white/20 hover:scale-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Captions className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
        )}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="gap-2"
      onClick={toggleTranscription}
      disabled={isLoading}
      aria-pressed={isTranscribing}
      aria-label={isTranscribing ? "Stop transcription" : "Start transcription"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Captions className={`h-4 w-4 ${isTranscribing ? "text-green-400" : ""}`} />
      )}
      {isTranscribing ? "Stop Transcription" : "Start Transcription"}
    </Button>
  );
}
