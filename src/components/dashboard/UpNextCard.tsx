"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, formatDistanceToNow, isToday, isTomorrow, addMinutes } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, FileText, Clock, Calendar, ChevronRight } from "lucide-react";
import type { Id } from "@/../convex/_generated/dataModel";

interface UpcomingSession {
  sessionId: Id<"scheduledSessions">;
  classId: Id<"classes">;
  className: string;
  title: string;
  scheduledAt: number;
  durationMinutes: number;
}

interface UpcomingAssignment {
  _id: Id<"assignments">;
  classId: Id<"classes">;
  className: string;
  title: string;
  dueDateAt?: number;
}

interface UpNextCardProps {
  sessions: UpcomingSession[] | undefined;
  assignments: UpcomingAssignment[] | undefined;
  isLoading: boolean;
}

type UpcomingItem =
  | { type: "session"; data: UpcomingSession; time: number }
  | { type: "assignment"; data: UpcomingAssignment; time: number };

function getSessionStatus(session: UpcomingSession): "live" | "upcoming" | "ended" {
  const now = Date.now();
  const startTime = session.scheduledAt;
  const endTime = addMinutes(startTime, session.durationMinutes).getTime();

  if (now >= startTime && now <= endTime) return "live";
  if (now < startTime) return "upcoming";
  return "ended";
}

function formatTimeLabel(timestamp: number): string {
  if (isToday(timestamp)) {
    return `Today at ${format(timestamp, "h:mm a")}`;
  }
  if (isTomorrow(timestamp)) {
    return `Tomorrow at ${format(timestamp, "h:mm a")}`;
  }
  return format(timestamp, "EEE, MMM d 'at' h:mm a");
}

function formatDueDate(timestamp: number): string {
  if (isToday(timestamp)) {
    return "Due today";
  }
  if (isTomorrow(timestamp)) {
    return "Due tomorrow";
  }
  return `Due ${formatDistanceToNow(timestamp, { addSuffix: true })}`;
}

export function UpNextCard({ sessions, assignments, isLoading }: UpNextCardProps) {
  const items = useMemo<UpcomingItem[]>(() => {
    const combined: UpcomingItem[] = [];

    sessions?.forEach((session) => {
      const status = getSessionStatus(session);
      if (status !== "ended") {
        combined.push({
          type: "session",
          data: session,
          time: session.scheduledAt,
        });
      }
    });

    assignments?.forEach((assignment) => {
      combined.push({
        type: "assignment",
        data: assignment,
        time: assignment.dueDateAt || Date.now() + 365 * 24 * 60 * 60 * 1000,
      });
    });

    combined.sort((a, b) => a.time - b.time);

    return combined.slice(0, 5);
  }, [sessions, assignments]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Up Next
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No upcoming sessions or assignments
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Check your calendar for the full schedule
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Up Next
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          if (item.type === "session") {
            const session = item.data;
            const status = getSessionStatus(session);
            const isLive = status === "live";

            return (
              <div
                key={`session-${session.sessionId}`}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  isLive ? "bg-primary/10 border border-primary/20" : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isLive ? "bg-primary text-primary-foreground" : "bg-background"
                  }`}
                >
                  <Video className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{session.title}</p>
                    {isLive && (
                      <Badge variant="default" className="text-xs shrink-0 animate-pulse">
                        LIVE
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {session.className} {formatTimeLabel(session.scheduledAt)}
                  </p>
                </div>
                <Link href={`/class/${session.classId}`}>
                  <Button size="sm" variant={isLive ? "default" : "outline"} className="shrink-0">
                    {isLive ? "Join Now" : "View"}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            );
          }

          const assignment = item.data;
          return (
            <div
              key={`assignment-${assignment._id}`}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{assignment.title}</p>
                <p className="text-xs text-muted-foreground">
                  {assignment.className} {assignment.dueDateAt ? formatDueDate(assignment.dueDateAt) : "No due date"}
                </p>
              </div>
              <Link href={`/class/${assignment.classId}`}>
                <Button size="sm" variant="outline" className="shrink-0">
                  Open
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
