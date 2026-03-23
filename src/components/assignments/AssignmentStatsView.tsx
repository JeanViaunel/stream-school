"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  GraduationCap,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Edit3,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";

interface AssignmentStatsViewProps {
  assignmentId: Id<"assignments">;
  classId: Id<"classes">;
  onClose: () => void;
}

interface StudentSubmission {
  studentId: Id<"users">;
  name: string;
  status: "submitted" | "not_submitted" | "late";
  submittedAt?: number;
  grade?: {
    score: number;
    maxScore: number;
  };
}

export function AssignmentStatsView({
  assignmentId,
  classId,
  onClose,
}: AssignmentStatsViewProps) {
  const assignment = useQuery(api.assignments.getAssignmentById, {
    assignmentId,
  });
  const completionStats = useQuery(
    api.assignments.getAssignmentCompletionStats,
    { assignmentId }
  );
  const studentsWithoutGrades = useQuery(api.grades.getStudentsWithoutGrades, {
    assignmentId,
  });
  const gradeStats = useQuery(api.grades.getGradeStatistics, { classId });

  const isLoading =
    assignment === undefined ||
    completionStats === undefined ||
    studentsWithoutGrades === undefined ||
    gradeStats === undefined;

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!assignment) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assignment Not Found</DialogTitle>
            <DialogDescription>
              The assignment you are looking for does not exist or you do not
              have permission to view it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getStatusBadge = () => {
    if (!assignment.isPublished) {
      return <Badge variant="secondary">Draft</Badge>;
    }

    if (assignment.dueDateAt) {
      if (isPast(assignment.dueDateAt) && !isToday(assignment.dueDateAt)) {
        return <Badge variant="destructive">Overdue</Badge>;
      }
      if (isToday(assignment.dueDateAt)) {
        return <Badge variant="default">Due Today</Badge>;
      }
    }

    return <Badge variant="default">Published</Badge>;
  };

  const formatDueDate = (timestamp?: number) => {
    if (!timestamp) return "No due date";
    if (isToday(timestamp)) return "Due today";
    return `Due ${format(timestamp, "MMM d, yyyy")}`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "—";
    return format(timestamp, "MMM d, yyyy h:mm a");
  };

  const getGradeLetter = (percentage: number): string => {
    if (percentage >= 90) return "A";
    if (percentage >= 80) return "B";
    if (percentage >= 70) return "C";
    if (percentage >= 60) return "D";
    return "F";
  };

  const getGradeColor = (percentage: number): string => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 80) return "bg-blue-500";
    if (percentage >= 70) return "bg-yellow-500";
    if (percentage >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  // Build student submissions list
  const studentSubmissions: StudentSubmission[] = [];

  if (completionStats) {
    // Students who haven't submitted
    // Note: We'd need to fetch student details here - for now showing IDs
    // In a real implementation, we'd fetch student names from the users table
  }

  const hasGrades = completionStats?.averageScore !== undefined;
  const hasSubmissions = (completionStats?.submittedCount ?? 0) > 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DialogTitle className="text-xl">{assignment.title}</DialogTitle>
                {getStatusBadge()}
              </div>
              <DialogDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDueDate(assignment.dueDateAt)}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {assignment.questions.length} question
                  {assignment.questions.length !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  {assignment.type === "multiple_choice" ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Multiple Choice
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-3.5 w-3.5" />
                      Short Answer
                    </>
                  )}
                </span>
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Stats Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {completionStats?.totalStudents ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {completionStats?.submittedCount ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={completionStats?.submissionRate ?? 0}>
                    <ProgressLabel className="sr-only">Submission Rate</ProgressLabel>
                    <ProgressValue />
                  </Progress>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(completionStats?.submissionRate ?? 0)}% submission rate
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {(completionStats?.totalStudents ?? 0) -
                        (completionStats?.submittedCount ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Not Submitted</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {completionStats?.lateSubmissions ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Late Submissions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="grades">
                Grades
                {hasGrades && (
                  <Badge variant="secondary" className="ml-2">
                    {completionStats?.averageScore?.toFixed(1)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="students">Student List</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Grade Distribution Chart */}
              {hasGrades && completionStats?.gradeDistribution ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Grade Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {completionStats.gradeDistribution.map((item) => {
                        const maxCount = Math.max(
                          ...completionStats.gradeDistribution.map((d) => d.count)
                        );
                        const percentage =
                          maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        return (
                          <div key={item.range} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{item.range}%</span>
                              <span className="text-muted-foreground">
                                {item.count} student{item.count !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  item.range === "90-100"
                                    ? "bg-green-500"
                                    : item.range === "80-89"
                                    ? "bg-blue-500"
                                    : item.range === "70-79"
                                    ? "bg-yellow-500"
                                    : item.range === "60-69"
                                    ? "bg-orange-500"
                                    : "bg-red-500"
                                )}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Grade Stats Summary */}
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          Average Score
                        </p>
                        <p className="text-2xl font-bold">
                          {completionStats.averageScore?.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center border-l">
                        <p className="text-sm text-muted-foreground mb-1">
                          Highest
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {gradeStats?.highestGrade ?? "—"}%
                        </p>
                      </div>
                      <div className="text-center border-l">
                        <p className="text-sm text-muted-foreground mb-1">
                          Lowest
                        </p>
                        <p className="text-2xl font-bold text-red-600">
                          {gradeStats?.lowestGrade ?? "—"}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : hasSubmissions ? (
                <Card>
                  <CardContent className="p-8">
                    <EmptyState
                      icon={GraduationCap}
                      title="No Grades Yet"
                      description="Students have submitted their assignments but haven't been graded yet."
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8">
                    <EmptyState
                      icon={FileText}
                      title="No Submissions Yet"
                      description="No students have submitted this assignment."
                    />
                  </CardContent>
                </Card>
              )}

              {/* Ungraded Submissions Alert */}
              {studentsWithoutGrades && studentsWithoutGrades.length > 0 && (
                <Card className="border-orange-500/20 bg-orange-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {studentsWithoutGrades.length} submission
                          {studentsWithoutGrades.length !== 1 ? "s" : ""} need
                          grading
                        </p>
                        <p className="text-sm text-muted-foreground">
                          These students have submitted but haven't received a
                          grade yet.
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Grade Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="grades" className="space-y-4">
              {hasGrades ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Grade Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {Object.entries(gradeStats?.gradeDistribution ?? {}).map(
                        ([grade, count]) => (
                          <div
                            key={grade}
                            className="text-center p-4 rounded-lg bg-muted"
                          >
                            <p
                              className={cn(
                                "text-3xl font-bold mb-1",
                                grade === "A"
                                  ? "text-green-600"
                                  : grade === "B"
                                  ? "text-blue-600"
                                  : grade === "C"
                                  ? "text-yellow-600"
                                  : grade === "D"
                                  ? "text-orange-600"
                                  : "text-red-600"
                              )}
                            >
                              {count}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Grade {grade}
                            </p>
                          </div>
                        )
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">
                        Detailed Distribution
                      </h4>
                      {completionStats?.gradeDistribution.map((item) => {
                        const total = completionStats.submittedCount || 1;
                        const percentage = (item.count / total) * 100;
                        return (
                          <div
                            key={item.range}
                            className="flex items-center gap-4"
                          >
                            <span className="w-16 text-sm font-medium">
                              {item.range}%
                            </span>
                            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                              <div
                                className={cn(
                                  "h-full rounded-full flex items-center justify-end pr-2 transition-all",
                                  item.range === "90-100"
                                    ? "bg-green-500"
                                    : item.range === "80-89"
                                    ? "bg-blue-500"
                                    : item.range === "70-79"
                                    ? "bg-yellow-500"
                                    : item.range === "60-69"
                                    ? "bg-orange-500"
                                    : "bg-red-500"
                                )}
                                style={{ width: `${Math.max(percentage, 5)}%` }}
                              >
                                {percentage > 15 && (
                                  <span className="text-xs text-white font-medium">
                                    {Math.round(percentage)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="w-12 text-sm text-muted-foreground text-right">
                              {item.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8">
                    <EmptyState
                      icon={BarChart3}
                      title="No Grade Data"
                      description="Grade statistics will appear once assignments have been graded."
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="students">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Student Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  {!hasSubmissions ? (
                    <EmptyState
                      icon={Users}
                      title="No Submissions Yet"
                      description="Students haven't submitted this assignment."
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Students with submissions needing grading */}
                        {studentsWithoutGrades?.map((student) => (
                          <TableRow key={student.studentId}>
                            <TableCell className="font-medium">
                              {student.name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-orange-600 border-orange-600"
                              >
                                Needs Grading
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(student.submittedAt)}
                            </TableCell>
                            <TableCell>—</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm">Grade</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function for class merging
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
