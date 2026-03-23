"use client";

import {
  useCall,
  useCallStateHooks,
  RecordingInProgressNotification,
  RecordCallButton,
} from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Circle } from "lucide-react";
import { toast } from "sonner";

interface RecordingBannerProps {
  isTeacher: boolean;
}

export function RecordingBanner({ isTeacher }: RecordingBannerProps) {
  const call = useCall();
  const { useIsCallRecordingInProgress } = useCallStateHooks();
  const isRecording = useIsCallRecordingInProgress();

  if (!isTeacher) return null;

  async function handleStopRecording() {
    if (!call) return;
    try {
      await call.stopRecording();
      toast.success("Recording stopped");
    } catch {
      toast.error("Failed to stop recording");
    }
  }

  if (isRecording) {
    return (
      <RecordingInProgressNotification text="Recording in progress...">
        <div className="flex items-center gap-2">
          <Circle className="h-3 w-3 fill-red-500 text-red-500 animate-pulse" />
          <span className="text-sm font-medium text-red-500">Recording</span>
          <Button variant="ghost" size="sm" onClick={handleStopRecording}>
            Stop
          </Button>
        </div>
      </RecordingInProgressNotification>
    );
  }

  return <RecordCallButton />;
}
