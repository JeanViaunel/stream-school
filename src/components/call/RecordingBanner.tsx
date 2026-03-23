"use client";

import { useState } from "react";
import { useCall } from "@stream-io/video-react-sdk";
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

interface RecordingBannerProps {
  isTeacher: boolean;
}

export function RecordingBanner({ isTeacher }: RecordingBannerProps) {
  const call = useCall();
  const [isRecording, setIsRecording] = useState(false);
  const [open, setOpen] = useState(false);

  if (!isTeacher) return null;

  async function handleStartRecording() {
    if (!call) return;
    try {
      await call.startRecording();
      setIsRecording(true);
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
      toast.success("Recording stopped");
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
