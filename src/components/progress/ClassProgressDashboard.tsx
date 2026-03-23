"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "./ProgressBar";
import { MilestoneProgress } from "./MilestoneBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/EmptyState";
import { Calculator, Search, RefreshCw, Users, TrendingUp, Award } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClassProgressDashboardProps {
  classId: Id<"classes">;
}

interface StudentProgress {
  studentId: Id<"users">;
  displayName: string;
  overallProgress: number;
  assignmentProgress: number;
  attendanceProgress: number;
  completedMilestones: number;
  totalMilestones: number;
}

export function ClassProgressDashboard({ classId }: ClassProgressDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  const studentProgress = useQuery(api.progress.getClassProgressOverview, { classId }) as StudentProgress[] | undefined;
  const recalculateProgress = useMutation(api.progress.recalculateAllClassProgress);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await recalculateProgress({ classId });
      toast.success("Progress recalculated for all students");
    } catch (error) {
      toast.error("Failed to recalculate progress");
    } finally {
      setIsRecalculating(false);
    }
  };

  if (!studentProgress) {
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

  if (studentProgress.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Class Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Users}
            title="No students enrolled"
            description="Students need to be enrolled to track their progress"
          />
        </CardContent>
      </Card>
    );
  }

  // Filter students by search term
  const filteredStudents = studentProgress.filter((student: StudentProgress) =>
    student.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate class averages
  const classAverage = studentProgress.reduce((sum: number, s: StudentProgress) => sum + s.overallProgress, 0) / studentProgress.length;
  const assignmentAverage = studentProgress.reduce((sum: number, s: StudentProgress) => sum + s.assignmentProgress, 0) / studentProgress.length;
  const attendanceAverage = studentProgress.reduce((sum: number, s: StudentProgress) => sum + s.attendanceProgress, 0) / studentProgress.length;

  return (
    <div className="space-y-6">
      {/* Class Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Class Overview
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={isRecalculating}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRecalculating && "animate-spin")} />
              Recalculate All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm">Students</span>
              </div>
              <p className="text-3xl font-bold">{studentProgress.length}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Avg Progress</span>
              </div>
              <p className={cn(
                "text-3xl font-bold",
                classAverage >= 80 && "text-emerald-600",
                classAverage >= 60 && classAverage < 80 && "text-yellow-600",
                classAverage < 60 && "text-red-600"
              )}>
                {Math.round(classAverage)}%
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calculator className="w-4 h-4" />
                <span className="text-sm">Avg Assignments</span>
              </div>
              <p className="text-2xl font-semibold">{Math.round(assignmentAverage)}%</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Award className="w-4 h-4" />
                <span className="text-sm">Avg Attendance</span>
              </div>
              <p className="text-2xl font-semibold">{Math.round(attendanceAverage)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Progress Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Student Progress
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Student</TableHead>
                  <TableHead className="text-center">Overall</TableHead>
                  <TableHead className="text-center">Assignments</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead className="text-center">Milestones</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student: StudentProgress) => (
                  <TableRow key={student.studentId}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {student.displayName}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge 
                          variant={student.overallProgress >= 80 ? "default" : student.overallProgress >= 60 ? "secondary" : "destructive"}
                          className={cn(
                            student.overallProgress >= 80 && "bg-emerald-500 hover:bg-emerald-600",
                            student.overallProgress >= 60 && student.overallProgress < 80 && "bg-yellow-500 hover:bg-yellow-600 text-yellow-950",
                            student.overallProgress < 60 && "bg-red-500 hover:bg-red-600"
                          )}
                        >
                          {Math.round(student.overallProgress)}%
                        </Badge>
                        <ProgressBar 
                          value={student.overallProgress} 
                          size="sm" 
                          showPercentage={false}
                          className="w-20"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "font-medium",
                        student.assignmentProgress >= 80 && "text-emerald-600",
                        student.assignmentProgress >= 60 && student.assignmentProgress < 80 && "text-yellow-600",
                        student.assignmentProgress < 60 && "text-red-600"
                      )}>
                        {Math.round(student.assignmentProgress)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "font-medium",
                        student.attendanceProgress >= 80 && "text-emerald-600",
                        student.attendanceProgress >= 60 && student.attendanceProgress < 80 && "text-yellow-600",
                        student.attendanceProgress < 60 && "text-red-600"
                      )}>
                        {Math.round(student.attendanceProgress)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <MilestoneProgress
                        completed={student.completedMilestones}
                        total={student.totalMilestones}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {student.overallProgress >= 80 ? (
                        <Badge className="bg-emerald-500">Excellent</Badge>
                      ) : student.overallProgress >= 60 ? (
                        <Badge variant="secondary">Good</Badge>
                      ) : (
                        <Badge variant="destructive">At Risk</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
