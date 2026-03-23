"use client";

import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useGradeSkin } from "@/contexts/GradeSkinContext";
import { AdminClassQuickActions } from "@/components/class/AdminClassQuickActions";
import type { Id } from "@/../convex/_generated/dataModel";
import { Play, LayoutList, Users, MoreVertical, Archive } from "lucide-react";

interface Class {
  _id: string;
  name: string;
  subject: string;
  gradeLevel: number;
  streamChannelId: string;
  joinCode: string;
  teacherId: string;
  isArchived?: boolean;
  teacher?: {
    displayName: string;
    avatarUrl?: string;
  };
}

interface ClassHeaderProps {
  classData: Class;
  enrollmentCount: number;
  isActiveSession?: boolean;
  onStartSession?: () => void;
  onJoinSession?: () => void;
  onArchiveClass?: () => void;
}

export function ClassHeader({
  classData,
  enrollmentCount,
  isActiveSession = false,
  onStartSession,
  onJoinSession,
  onArchiveClass,
}: ClassHeaderProps) {
  const router = useRouter();
  const { session } = useAuth();
  const { gradeBand } = useGradeSkin();

  const isTeacher = session?.userId === classData.teacherId;
  const isAdmin = session?.role === "admin";
  const isArchived = classData.isArchived ?? false;

  const teacherMenu = isTeacher && !isAdmin && (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => router.push(`/class/${classData._id}/details`)}
        >
          <LayoutList className="mr-2 h-4 w-4" />
          Class details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onArchiveClass} className="text-destructive">
          <Archive className="mr-2 h-4 w-4" />
          Archive Class
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const adminMenu = isAdmin && (
    <AdminClassQuickActions
      classId={classData._id as Id<"classes">}
      currentTeacherId={classData.teacherId as Id<"users">}
      isArchived={isArchived}
      onArchiveClass={onArchiveClass}
    />
  );

  // Primary band: simplified header
  if (gradeBand === "primary") {
    return (
      <header className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <span className="text-2xl font-bold text-primary">
                {classData.name.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{classData.name}</h1>
              <p className="text-sm text-muted-foreground truncate">
                {classData.subject}
              </p>
              {classData.teacher && (
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {classData.teacher.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium text-foreground">
                    {classData.teacher.displayName}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isTeacher ? (
              <Button
                size="lg"
                className="h-14 rounded-xl px-6"
                onClick={onStartSession}
              >
                <Play className="mr-2 h-6 w-6" />
                Start
              </Button>
            ) : isActiveSession ? (
              <Button
                size="lg"
                className="h-14 rounded-xl px-6"
                onClick={onJoinSession}
              >
                <Play className="mr-2 h-6 w-6" />
                Join
              </Button>
            ) : null}
            {teacherMenu}
            {adminMenu}
          </div>
        </div>
      </header>
    );
  }

  // Middle and High bands: full header
  return (
    <header className="border-b border-border bg-card p-4 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5">
            <span className="text-2xl font-bold text-primary">
              {classData.name.charAt(0)}
            </span>
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-xl font-bold">{classData.name}</h1>
              <Badge variant="secondary">Grade {classData.gradeLevel}</Badge>
              {isActiveSession && (
                <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
                  <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                  Live
                </Badge>
              )}
              {classData.teacher && (
                <div className="flex items-center gap-2 border-l border-border pl-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">
                      {classData.teacher.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {classData.teacher.displayName}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="capitalize">{classData.subject}</span>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {enrollmentCount} students
              </div>
            </div>

            {isTeacher && gradeBand === "high" && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">Join code:</span>
                <code className="font-mono font-semibold text-primary">
                  {classData.joinCode}
                </code>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isTeacher ? (
            <>
              <Button onClick={onStartSession} className="gap-2">
                <Play className="h-4 w-4" />
                {isActiveSession ? "Rejoin Session" : "Start Session"}
              </Button>
              {teacherMenu}
              {adminMenu}
            </>
          ) : (
            <>
              {isActiveSession ? (
                <Button onClick={onJoinSession} className="gap-2">
                  <Play className="h-4 w-4" />
                  Join Session
                </Button>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  No active session
                </Badge>
              )}
              {adminMenu}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
