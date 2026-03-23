"use client";

import { useCall, useCallStateHooks, OwnCapability } from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Captions, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ToggleClosedCaptionsProps {
  className?: string;
  variant?: "default" | "icon";
}

export function ToggleClosedCaptions({ className, variant = "default" }: ToggleClosedCaptionsProps) {
  const call = useCall();
  const { useIsCallCaptioningInProgress, useHasPermissions } = useCallStateHooks();
  const isCaptioningInProgress = useIsCallCaptioningInProgress();
  const canToggleClosedCaptions = useHasPermissions(
    OwnCapability.START_CLOSED_CAPTIONS_CALL,
    OwnCapability.STOP_CLOSED_CAPTIONS_CALL
  );
  const [isLoading, setIsLoading] = useState(false);

  async function toggleClosedCaptions() {
    if (!call) return;

    setIsLoading(true);
    try {
      if (isCaptioningInProgress) {
        await call.stopClosedCaptions();
        toast.success("Closed captions stopped");
      } else {
        await call.startClosedCaptions();
        toast.success("Closed captions started");
      }
    } catch (error) {
      console.error("Closed captions error:", error);
      toast.error("Failed to toggle closed captions");
    } finally {
      setIsLoading(false);
    }
  }

  // Icon variant - compact button
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleClosedCaptions}
        disabled={isLoading || !canToggleClosedCaptions}
        title={isCaptioningInProgress ? "Stop closed captions" : "Start closed captions"}
        className={cn(
          "group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          isCaptioningInProgress
            ? "bg-green-500/20 text-green-400 border border-green-500/30"
            : "bg-white/12 hover:bg-white/18 text-white border border-white/8",
          (!canToggleClosedCaptions || isLoading) && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Captions className="h-5 w-5" />
        )}
      </button>
    );
  }

  // Default variant - full button with text
  return (
    <Button
      type="button"
      variant={isCaptioningInProgress ? "default" : "secondary"}
      size="sm"
      className={cn("gap-2", className)}
      onClick={toggleClosedCaptions}
      disabled={isLoading || !canToggleClosedCaptions}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Captions className="h-4 w-4" />
      )}
      {isCaptioningInProgress ? "Stop CC" : "Start CC"}
    </Button>
  );
}
