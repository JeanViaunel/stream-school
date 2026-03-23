"use client";

import Link from "next/link";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, FileText, Users, Clock, ChevronRight, BookOpen } from "lucide-react";
import type { Id } from "@/../convex/_generated/dataModel";

interface UpcomingSession {
  _id: Id<"scheduledSessions">;
  title: string;
  description?: string;
  scheduledAt: number;
  durationMinutes: number;
}

interface Assignment {
  _id: Id<"assignments">;
  title: string;
  dueDateAt?: number;
  isPublished: boolean;
  createdAt: number;
}

interface ClassOverviewProps {
  classId: Id<"classes">;
  className: string;
  teacherName?: string;
  upcomingSessions: UpcomingSession[] | undefined;
  assignments: Assignment[] | undefined;
  enrollmentCount: number;
  isLoading: boolean;
}

function formatSessionTime(timestamp: number): string {
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

export function ClassOverview({
  classId,
  className,
  teacherName,
  upcomingSessions,
  assignments,
  enrollmentCount,
  isLoading,
}: ClassOverviewProps) {
  const nextSession = upcomingSessions?.[0];
  const recentAssignments = assignments?.slice(0, 3) || [];

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-auto">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{enrollmentCount}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{assignments?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Assignments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Session Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Next Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextSession ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium">{nextSession.title}</p>
                {nextSession.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {nextSession.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatSessionTime(nextSession.scheduledAt)}
                  <span className="text-xs">
                    ({nextSession.durationMinutes} min)
                  </span>
                </div>
              </div>
              <Link href={`/class/${classId}/session/${nextSession._id}`}>
                <Button className="w-full">
                  Join Session
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Video className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No upcoming sessions scheduled
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Assignments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recent Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAssignments.length > 0 ? (
            <div className="space-y-2">
              {recentAssignments.map((assignment) => (
                <div
                  key={assignment._id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {assignment.title}
                    </p>
                    {assignment.dueDateAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatDueDate(assignment.dueDateAt)}
                      </p>
                    )}
                  </div>
                  {assignment.dueDateAt && isToday(assignment.dueDateAt) && (
                    <Badge variant="destructive" className="text-xs shrink-0">
                      Due Today
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No assignments yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Sessions Preview */}
      {upcomingSessions && upcomingSessions.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingSessions.slice(1, 4).map((session) => (
                <div
                  key={session._id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSessionTime(session.scheduledAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
