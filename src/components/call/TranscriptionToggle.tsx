"use client";

import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Captions, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TranscriptionToggleProps {
  isTeacher: boolean;
}

export function TranscriptionToggle({ isTeacher }: TranscriptionToggleProps) {
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

  // Show indicator if auto-on
  if (transcriptionMode === "auto-on") {
    return (
      <div className="absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 backdrop-blur-md px-3 py-2">
          <Captions className="h-4 w-4 text-green-400" />
          <span className="text-sm text-white/80">Transcription On</span>
        </div>
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

  return (
    <div className="absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
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
    </div>
  );
}
