"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
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
import { 
  Play, 
  Settings, 
  Users, 
  MoreVertical,
  LogOut,
  Archive
} from "lucide-react";

interface Class {
  _id: string;
  name: string;
  subject: string;
  gradeLevel: number;
  streamChannelId: string;
  joinCode: string;
  teacherId: string;
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
  const { session } = useAuth();
  const { gradeBand } = useGradeSkin();
  
  const isTeacher = session?.userId === classData.teacherId;
  const isAdmin = session?.role === "school_admin" || session?.role === "platform_admin";

  // Primary band: simplified header
  if (gradeBand === "primary") {
    return (
      <header className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {classData.name.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold">{classData.name}</h1>
              <p className="text-sm text-muted-foreground">
                {classData.subject}
              </p>
            </div>
          </div>

          {isTeacher ? (
            <Button 
              size="lg" 
              className="h-14 px-6 rounded-xl"
              onClick={onStartSession}
            >
              <Play className="w-6 h-6 mr-2" />
              Start
            </Button>
          ) : isActiveSession ? (
            <Button 
              size="lg" 
              className="h-14 px-6 rounded-xl"
              onClick={onJoinSession}
            >
              <Play className="w-6 h-6 mr-2" />
              Join
            </Button>
          ) : null}
        </div>
      </header>
    );
  }

  // Middle and High bands: full header
  return (
    <header className="border-b border-border bg-card p-4 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Class icon/avatar */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-primary">
              {classData.name.charAt(0)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold">{classData.name}</h1>
              <Badge variant="secondary">Grade {classData.gradeLevel}</Badge>
              {isActiveSession && (
                <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="capitalize">{classData.subject}</span>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {enrollmentCount} students
              </div>
              {classData.teacher && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-xs">
                        {classData.teacher.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {classData.teacher.displayName}
                  </div>
                </>
              )}
            </div>

            {/* Join code for teachers */}
            {isTeacher && gradeBand === "high" && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
                <span className="text-muted-foreground">Join code:</span>
                <code className="font-mono font-semibold text-primary">
                  {classData.joinCode}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isTeacher ? (
            <>
              <Button 
                onClick={onStartSession}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                {isActiveSession ? "Rejoin Session" : "Start Session"}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.location.href = `/class/${classData._id}/settings`}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onArchiveClass} className="text-destructive">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Class
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {isActiveSession ? (
                <Button onClick={onJoinSession} className="gap-2">
                  <Play className="w-4 h-4" />
                  Join Session
                </Button>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  No active session
                </Badge>
              )}

              {(isAdmin || isTeacher) && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.location.href = `/class/${classData._id}/settings`}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
