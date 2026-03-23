"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { toast } from "sonner";
import {
  Video,
  Plus,
  Calendar,
  Clock,
  User,
  Play,
  StopCircle,
} from "lucide-react";

function statusBadge(status: "scheduled" | "active" | "ended") {
  if (status === "active")
    return (
      <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30 gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
        Live
      </Badge>
    );
  if (status === "scheduled")
    return <Badge variant="secondary">Scheduled</Badge>;
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Ended
    </Badge>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MeetingsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const isAdmin = session?.role === "admin";
  const isTeacher =
    session?.role === "teacher" || session?.role === "co_teacher";
  const canAccess = isAdmin || isTeacher;

  const myMeetings = useQuery(
    api.meetings.getMyMeetings,
    isTeacher ? {} : "skip",
  );

  const orgMeetings = useQuery(
    api.meetings.getAllMeetingsByOrg,
    isAdmin ? {} : "skip",
  );

  const endMeeting = useMutation(api.meetings.endMeeting);

  const meetings = isAdmin ? orgMeetings : myMeetings;

  const handleJoin = (streamCallId: string) => {
    router.push(`/call/${streamCallId}`);
  };

  const handleEnd = async (meetingId: Id<"meetings">) => {
    try {
      await endMeeting({ meetingId });
      toast.success("Meeting ended");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end meeting");
    }
  };

  if (!session) return null;

  if (!canAccess) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Meetings are only available for teachers and admins.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Video className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">Meetings</h1>
          </div>
          <p className="text-muted-foreground">
            {isAdmin
              ? "All meetings in your organization"
              : "Your meetings — start one now or schedule for later"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Meeting
        </Button>
      </header>

      {meetings === undefined && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      )}

      {meetings !== undefined && meetings.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Video className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No meetings yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first meeting to get started
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Meeting
            </Button>
          </CardContent>
        </Card>
      )}

      {meetings !== undefined && meetings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {meetings.map((meeting) => (
            <Card
              key={meeting._id}
              className="flex flex-col hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">
                    {meeting.title}
                  </CardTitle>
                  {statusBadge(meeting.status)}
                </div>
                {meeting.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {meeting.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {meeting.hostDisplayName && isAdmin && (
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>{meeting.hostDisplayName}</span>
                    </div>
                  )}
                  {meeting.scheduledAt && meeting.status === "scheduled" && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDate(meeting.scheduledAt)}</span>
                    </div>
                  )}
                  {meeting.startedAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>Started {formatDate(meeting.startedAt)}</span>
                    </div>
                  )}
                  {meeting.endedAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>Ended {formatDate(meeting.endedAt)}</span>
                    </div>
                  )}
                </div>

                {meeting.status !== "ended" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleJoin(meeting.streamCallId)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      {meeting.status === "active" ? "Join" : "Start"}
                    </Button>
                    {(meeting.hostId === session.userId || isAdmin) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={() => handleEnd(meeting._id)}
                      >
                        <StopCircle className="h-3.5 w-3.5" />
                        End
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateMeetingModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
