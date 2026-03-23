"use client";

import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Gradebook } from "@/components/gradebook/Gradebook";
import { ClassOverview } from "./ClassOverview";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ExternalLink, Video, LayoutDashboard, MessageSquare, GraduationCap, Calendar } from "lucide-react";

interface ClassroomTabsProps {
  classId: Id<"classes">;
  teacherId: Id<"users">;
  chatPanel: ReactNode;
  className?: string;
  teacherDisplayName?: string;
  enrollmentCount?: number;
}

export function ClassroomTabs({ classId, teacherId, chatPanel, className = "Class", teacherDisplayName, enrollmentCount = 0 }: ClassroomTabsProps) {
  const { session } = useAuth();
  const sessions = useQuery(api.sessions.getSessionsByClass, { classId });
  const myGrades = useQuery(
    api.grades.getMyGrades,
    session?.role === "student" ? { classId } : "skip"
  );
  
  // Get upcoming scheduled sessions
  const scheduledSessions = useQuery(
    api.schedule.getSessionsByClass,
    { classId }
  );
  
  // Get assignments for this class
  const assignments = useQuery(
    api.assignments.getAssignmentsByClass,
    { classId }
  );

  const isTeacherOrAdmin =
    session?.userId === teacherId ||
    session?.role === "admin";
    
  const isStudent = session?.role === "student";

  if (!session) {
    return null;
  }
  
  // Filter upcoming sessions (not ended)
  const now = Date.now();
  const upcomingSessions = scheduledSessions?.filter(
    s => s.scheduledAt + (s.durationMinutes * 60 * 1000) > now
  ) || [];

  return (
    <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
      <div className="border-t border-border bg-card px-4 pt-3">
        <TabsList className="w-full justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="overview" className="rounded-md px-3 flex items-center gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-md px-3 flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="grades" className="rounded-md px-3 flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">{isTeacherOrAdmin ? "Gradebook" : "Grades"}</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="rounded-md px-3 flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Sessions</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="overview"
        className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
      >
        <ClassOverview
          classId={classId}
          className={className}
          teacherName={teacherDisplayName}
          upcomingSessions={upcomingSessions}
          assignments={assignments || []}
          enrollmentCount={enrollmentCount}
          isLoading={scheduledSessions === undefined || assignments === undefined}
        />
      </TabsContent>

      <TabsContent
        value="chat"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        {chatPanel}
      </TabsContent>

      <TabsContent
        value="grades"
        className="mt-0 flex-1 overflow-auto p-4 data-[state=inactive]:hidden"
      >
        {isTeacherOrAdmin ? (
          <Gradebook classId={classId} />
        ) : session.role === "student" && myGrades ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My grades</CardTitle>
              {myGrades.overallAverage !== null && (
                <Badge variant="secondary">Overall {myGrades.overallAverage}%</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {myGrades.grades.length === 0 ? (
                <p className="text-sm text-muted-foreground">No grades yet for this class.</p>
              ) : (
                <ul className="space-y-3">
                  {myGrades.grades.map((g) => (
                    <li
                      key={g._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="font-medium">{g.assignmentTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          Graded {format(g.gradedAt, "PPP")}
                        </p>
                        {g.feedback && (
                          <p className="mt-1 text-sm text-muted-foreground">{g.feedback}</p>
                        )}
                      </div>
                      <Badge>
                        {g.score}/{g.maxScore}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Grades are not available for your role.</p>
        )}
      </TabsContent>

      <TabsContent
        value="sessions"
        className="mt-0 flex-1 overflow-auto p-4 data-[state=inactive]:hidden"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Past sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions === undefined ? (
              <p className="text-sm text-muted-foreground">Loading sessions…</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <li
                    key={s._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {format(s.startedAt, "PPP p")}
                      </p>
                      {s.endedAt && (
                        <p className="text-xs text-muted-foreground">
                          Ended {format(s.endedAt, "p")}
                        </p>
                      )}
                    </div>
                    {s.recordingUrl ? (
                      <a
                        href={s.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "inline-flex",
                        )}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Recording
                      </a>
                    ) : (
                      <Badge variant="outline">No recording</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
