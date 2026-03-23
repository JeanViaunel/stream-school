"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  BookOpen,
  Users,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Award,
  AlertCircle,
  FileText,
  BarChart3,
} from "lucide-react";

interface GradebookAnalyticsProps {
  classId: Id<"classes">;
}

export function GradebookAnalytics({ classId }: GradebookAnalyticsProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<Id<"users"> | null>(null);
  
  const gradebook = useQuery(api.grades.getGradebookByClass, { classId });
  const gradeStats = useQuery(api.grades.getGradeStatistics, { classId });

  const isLoading = gradebook === undefined || gradeStats === undefined;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!gradebook || gradebook.assignments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={GraduationCap}
            title="No Grade Data Yet"
            description="Assignments need to be created and graded before analytics are available."
          />
        </CardContent>
      </Card>
    );
  }

  const { students, assignments, grades } = gradebook;

  // Calculate per-student stats
  const studentStats = students.map((student) => {
    const studentGrades = grades.filter((g) => g.studentId === student.id);
    const average = studentGrades.length > 0
      ? studentGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / studentGrades.length
      : null;

    const completedAssignments = studentGrades.length;
    const totalAssignments = assignments.length;
    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    return {
      ...student,
      average,
      completedAssignments,
      totalAssignments,
      completionRate,
    };
  });

  // Sort by average (descending)
  const sortedStudents = [...studentStats].sort((a, b) => {
    if (a.average === null && b.average === null) return 0;
    if (a.average === null) return 1;
    if (b.average === null) return -1;
    return b.average - a.average;
  });

  // Calculate class stats
  const studentsWithGrades = studentStats.filter((s) => s.average !== null);
  const classAverage = studentsWithGrades.length > 0
    ? studentsWithGrades.reduce((sum, s) => sum + (s.average || 0), 0) / studentsWithGrades.length
    : null;

  const passingStudents = studentsWithGrades.filter((s) => (s.average || 0) >= 60).length;
  const failingStudents = studentsWithGrades.filter((s) => (s.average || 0) < 60).length;

  return (
    <div className="space-y-6">
      {/* Class Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-xs text-muted-foreground">Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  classAverage !== null && classAverage >= 80 ? "text-emerald-600" :
                  classAverage !== null && classAverage >= 60 ? "text-yellow-600" : "text-red-600"
                )}>
                  {classAverage?.toFixed(1) ?? "—"}%
                </p>
                <p className="text-xs text-muted-foreground">Class Average</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {passingStudents}/{studentsWithGrades.length}
                </p>
                <p className="text-xs text-muted-foreground">Passing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="w-full justify-start mb-4">
          <TabsTrigger value="students">Student Performance</TabsTrigger>
          <TabsTrigger value="distribution">Grade Distribution</TabsTrigger>
          <TabsTrigger value="assignments">Assignment Averages</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Student Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Completion</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStudents.map((student, index) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.completedAssignments}/{student.totalAssignments} assignments
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-full max-w-[100px]">
                            <Progress 
                              value={student.completionRate} 
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {Math.round(student.completionRate)}%
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {student.average !== null ? (
                            <span className={cn(
                              "font-bold",
                              student.average >= 90 ? "text-emerald-600" :
                              student.average >= 80 ? "text-blue-600" :
                              student.average >= 70 ? "text-yellow-600" :
                              student.average >= 60 ? "text-orange-600" :
                              "text-red-600"
                            )}>
                              {student.average.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {student.average !== null ? (
                            <Badge className={cn(
                              student.average >= 90 ? "bg-emerald-100 text-emerald-700" :
                              student.average >= 80 ? "bg-blue-100 text-blue-700" :
                              student.average >= 70 ? "bg-yellow-100 text-yellow-700" :
                              student.average >= 60 ? "bg-orange-100 text-orange-700" :
                              "bg-red-100 text-red-700"
                            )}>
                              {student.average >= 90 ? "A" :
                               student.average >= 80 ? "B" :
                               student.average >= 70 ? "C" :
                               student.average >= 60 ? "D" : "F"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No Grades</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Grade Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 mb-6">
                {Object.entries(gradeStats?.gradeDistribution ?? { A: 0, B: 0, C: 0, D: 0, F: 0 }).map(([grade, count]) => {
                  const total = Object.values(gradeStats?.gradeDistribution ?? {}).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div
                      key={grade}
                      className={cn(
                        "text-center p-4 rounded-lg border-2",
                        grade === "A" && "bg-emerald-50 border-emerald-200",
                        grade === "B" && "bg-blue-50 border-blue-200",
                        grade === "C" && "bg-yellow-50 border-yellow-200",
                        grade === "D" && "bg-orange-50 border-orange-200",
                        grade === "F" && "bg-red-50 border-red-200"
                      )}
                    >
                      <p className={cn(
                        "text-3xl font-bold",
                        grade === "A" && "text-emerald-600",
                        grade === "B" && "text-blue-600",
                        grade === "C" && "text-yellow-600",
                        grade === "D" && "text-orange-600",
                        grade === "F" && "text-red-600"
                      )}>
                        {count}
                      </p>
                      <p className="text-sm font-medium mt-1">Grade {grade}</p>
                      {total > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {gradeStats?.highestGrade && gradeStats?.lowestGrade && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Highest Grade</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {gradeStats.highestGrade.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Lowest Grade</p>
                    <p className="text-3xl font-bold text-red-600">
                      {gradeStats.lowestGrade.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Assignment Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {assignments.map((assignment) => {
                    const assignmentGrades = grades.filter((g) => g.assignmentId === assignment.id);
                    const avg = assignmentGrades.length > 0
                      ? assignmentGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / assignmentGrades.length
                      : null;

                    return (
                      <div key={assignment.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{assignment.title}</h4>
                          <Badge variant={avg === null ? "secondary" : avg >= 70 ? "default" : "destructive"}>
                            {avg !== null ? `${avg.toFixed(1)}%` : "No grades"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{assignmentGrades.length} graded</span>
                          <span>{students.length - assignmentGrades.length} pending</span>
                        </div>
                        {avg !== null && (
                          <Progress 
                            value={avg} 
                            className={cn(
                              "h-2 mt-3",
                              avg >= 80 ? "bg-emerald-100" :
                              avg >= 70 ? "bg-yellow-100" :
                              "bg-red-100"
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
