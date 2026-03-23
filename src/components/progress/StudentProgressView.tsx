"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "./ProgressBar";
import { MilestoneProgress } from "./MilestoneBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Target, TrendingUp, BookOpen, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressSummary {
  classId: string;
  className: string;
  overallProgress: number;
  assignmentProgress: number;
  attendanceProgress: number;
  completedMilestones: number;
  totalMilestones: number;
}

export function StudentProgressView() {
  const progressSummary = useQuery(api.progress.getMyProgressSummary) as ProgressSummary[] | undefined;

  if (!progressSummary) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-[400px] bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (progressSummary.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            My Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Target}
            title="No classes enrolled"
            description="Join a class to start tracking your progress"
          />
        </CardContent>
      </Card>
    );
  }

  // Calculate overall stats
  const overallProgress = progressSummary.reduce((sum: number, p: ProgressSummary) => sum + p.overallProgress, 0) / progressSummary.length;
  const totalMilestones = progressSummary.reduce((sum: number, p: ProgressSummary) => sum + p.totalMilestones, 0);
  const completedMilestones = progressSummary.reduce((sum: number, p: ProgressSummary) => sum + p.completedMilestones, 0);

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Classes Enrolled</span>
              </div>
              <p className="text-3xl font-bold">{progressSummary.length}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Average Progress</span>
              </div>
              <p className={cn(
                "text-3xl font-bold",
                overallProgress >= 80 && "text-emerald-600",
                overallProgress >= 60 && overallProgress < 80 && "text-yellow-600",
                overallProgress < 60 && "text-red-600"
              )}>
                {Math.round(overallProgress)}%
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Award className="w-4 h-4" />
                <span className="text-sm">Milestones</span>
              </div>
              <MilestoneProgress 
                completed={completedMilestones} 
                total={totalMilestones} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Progress Cards */}
      <div className="grid gap-4">
        {progressSummary.map((classProgress: ProgressSummary) => (
          <Card key={classProgress.classId} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{classProgress.className}</CardTitle>
                <div className="flex items-center gap-3">
                  <MilestoneProgress 
                    completed={classProgress.completedMilestones} 
                    total={classProgress.totalMilestones}
                    size="sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Overall Progress */}
                <ProgressBar
                  value={classProgress.overallProgress}
                  label="Overall Progress"
                  size="lg"
                  variant="color-coded"
                />

                {/* Detailed Progress */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <ProgressBar
                    value={classProgress.assignmentProgress}
                    label="Assignment Completion"
                    size="sm"
                    variant="color-coded"
                  />
                  <ProgressBar
                    value={classProgress.attendanceProgress}
                    label="Session Attendance"
                    size="sm"
                    variant="color-coded"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
