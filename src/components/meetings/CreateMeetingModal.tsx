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
import { cn } from "@/lib/utils";
import { Loader2, Video, Calendar, Zap } from "lucide-react";

type Mode = "instant" | "scheduled";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateMeetingModal({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("instant");
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

    if (mode === "scheduled") {
      if (!title.trim()) {
        toast.error("Please enter a meeting title");
        return;
      }
      if (!scheduledAt) {
        toast.error("Please select a date and time");
        return;
      }
    }

    setIsLoading(true);
    try {
      const resolvedTitle =
        mode === "instant"
          ? title.trim() ||
            `Quick meeting · ${new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
          : title.trim();

      const scheduled =
        mode === "scheduled" ? new Date(scheduledAt).getTime() : undefined;

      const result = await createMeeting({
        title: resolvedTitle,
        description: description.trim() || undefined,
        scheduledAt: scheduled,
      });

      if (mode === "instant") {
        toast.success("Starting meeting…");
        router.push(`/call/${result.streamCallId}`);
      } else {
        toast.success("Meeting scheduled!");
        handleClose();
        router.push("/meetings");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create meeting",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setMode("instant");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
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

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-border p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode("instant")}
            disabled={isLoading}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mode === "instant"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Instant
          </button>
          <button
            type="button"
            onClick={() => setMode("scheduled")}
            disabled={isLoading}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mode === "scheduled"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            Schedule
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title — optional for instant, required for scheduled */}
          <div className="space-y-2">
            <Label htmlFor="meeting-title">
              Title{" "}
              {mode === "instant" && (
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              )}
            </Label>
            <Input
              id="meeting-title"
              placeholder={
                mode === "instant"
                  ? "Leave blank for auto-title"
                  : "e.g., Staff meeting, Parent–teacher conference"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading || !canCreate}
            />
          </div>

          {/* Scheduled-only fields */}
          {mode === "scheduled" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="meeting-description">
                  Description{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="meeting-description"
                  placeholder="What is this meeting about?"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading || !canCreate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting-scheduled">Date &amp; time</Label>
                <Input
                  id="meeting-scheduled"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  disabled={isLoading || !canCreate}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isLoading || !canCreate}
              className="flex-1 gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "instant" ? "Starting…" : "Scheduling…"}
                </>
              ) : mode === "instant" ? (
                <>
                  <Zap className="h-4 w-4" />
                  Start Now
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Schedule
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
