"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Video } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateMeetingModal({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const createMeeting = useMutation(api.meetings.createMeeting);

  const canCreate =
    session?.role === "teacher" ||
    session?.role === "co_teacher" ||
    session?.role === "admin";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!canCreate) {
      toast.error("Not authorized to create meetings");
      onOpenChange(false);
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    setIsLoading(true);
    try {
      const scheduled = scheduledAt
        ? new Date(scheduledAt).getTime()
        : undefined;

      const result = await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: scheduled,
      });

      toast.success("Meeting created!");

      if (!scheduled) {
        router.push(`/call/${result.streamCallId}`);
      } else {
        onOpenChange(false);
        router.push("/meetings");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create meeting");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setTitle("");
      setDescription("");
      setScheduledAt("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Video className="h-5 w-5" />
            New Meeting
          </DialogTitle>
        </DialogHeader>

        {!canCreate && (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to create meetings.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="meeting-title">Title</Label>
            <Input
              id="meeting-title"
              placeholder="e.g., Staff meeting, Parent–teacher conference"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading || !canCreate}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-description">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="meeting-description"
              placeholder="What is this meeting about?"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading || !canCreate}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-scheduled">
              Scheduled time{" "}
              <span className="text-muted-foreground font-normal">
                (leave blank to start now)
              </span>
            </Label>
            <Input
              id="meeting-scheduled"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              disabled={isLoading || !canCreate}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Button>

            <Button type="submit" disabled={isLoading || !canCreate} className="gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {scheduledAt ? "Scheduling…" : "Starting…"}
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  {scheduledAt ? "Schedule Meeting" : "Start Now"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
