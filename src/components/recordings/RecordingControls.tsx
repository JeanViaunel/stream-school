"use client";

import { useState } from "react";
import { useCall } from "@stream-io/video-react-sdk";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Circle } from "lucide-react";
import { toast } from "sonner";

interface RecordingControlsProps {
  isTeacher: boolean;
  sessionId?: Id<"sessions">;
}

export function RecordingControls({ isTeacher, sessionId }: RecordingControlsProps) {
  const call = useCall();
  const [isRecording, setIsRecording] = useState(false);
  const [open, setOpen] = useState(false);
  const markRecordingStarted = useMutation(api.recordings.markRecordingStarted);
  const markRecordingEnded = useMutation(api.recordings.markRecordingEnded);

  if (!isTeacher) return null;

  async function handleStartRecording() {
    if (!call) return;
    try {
      await call.startRecording();
      setIsRecording(true);
      
      // Mark recording as started in our database
      if (sessionId) {
        await markRecordingStarted({ sessionId });
      }
      
      toast.success("Recording started");
    } catch {
      toast.error("Failed to start recording");
    }
    setOpen(false);
  }

  async function handleStopRecording() {
    if (!call) return;
    try {
      await call.stopRecording();
      setIsRecording(false);
      
      // Mark recording as ended in our database
      if (sessionId) {
        await markRecordingEnded({ sessionId });
      }
      
      toast.success("Recording stopped - processing video...");
    } catch {
      toast.error("Failed to stop recording");
    }
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <Circle className="h-3 w-3 fill-red-500 text-red-500 animate-pulse" />
        <span className="text-sm font-medium text-red-500">Recording</span>
        <Button variant="ghost" size="sm" onClick={handleStopRecording}>
          Stop
        </Button>
      </div>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        type="button"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Circle className="h-3 w-3 mr-2" />
        Record
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Record this session?</AlertDialogTitle>
          <AlertDialogDescription>
            All participants will be notified that this session is being recorded.
            Recordings are stored securely and are only accessible to teachers and admins.
            By proceeding you confirm that all required consents have been obtained.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleStartRecording}>
            Start Recording
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
