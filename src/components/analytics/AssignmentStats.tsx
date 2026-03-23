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
import { ScoreDistribution, ScoreDistributionCompact } from "./ScoreDistribution";
import { SubmissionTimeline, SubmissionTimelineCompact } from "./SubmissionTimeline";
import { QuestionAnalysis, QuestionAnalysisCompact } from "./QuestionAnalysis";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import {
  BarChart3,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  X,
  Calendar,
  Edit3,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Minus,
  List,
  HelpCircle,
} from "lucide-react";

interface AssignmentStatsProps {
  assignmentId: Id<"assignments">;
  classId: Id<"classes">;
  onClose: () => void;
}

export function AssignmentStats({
  assignmentId,
  classId,
  onClose,
}: AssignmentStatsProps) {
  const assignment = useQuery(api.assignments.getAssignmentById, {
    assignmentId,
  });
  const stats = useQuery(api.analytics.getAssignmentStats, {
    assignmentId,
  });

  const isLoading = assignment === undefined || stats === undefined;

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
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

  if (!assignment || !stats) {
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

  const hasGrades = stats.averageScore !== undefined;
  const hasSubmissions = stats.submittedCount > 0;
  const hasQuestionAnalysis = stats.questionAnalysis.length > 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DialogTitle className="text-xl">{assignment.title}</DialogTitle>
                {getStatusBadge()}
              </div>
              <DialogDescription className="flex items-center gap-4 text-sm flex-wrap">
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
          {/* Quick Stats Overview */}
          <ScoreDistributionCompact
            totalStudents={stats.totalStudents}
            submittedCount={stats.submittedCount}
            submissionRate={stats.submissionRate}
            averageScore={stats.averageScore}
            lateSubmissions={stats.lateSubmissions}
          />

          <Tabs defaultValue="overview" className="w-full mt-6">
            <TabsList className="w-full justify-start mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="grades">Grades</TabsTrigger>
              <TabsTrigger value="questions">
                Questions
                {hasQuestionAnalysis && (
                  <Badge variant="secondary" className="ml-2">
                    {stats.questionAnalysis.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Score Distribution */}
              <ScoreDistribution
                distribution={stats.scoreDistribution}
                gradeRanges={stats.gradeRanges}
                averageScore={stats.averageScore}
                medianScore={stats.medianScore}
                standardDeviation={stats.standardDeviation}
                minScore={stats.minScore}
                maxScore={stats.maxScore}
                totalStudents={stats.totalStudents}
              />

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasQuestionAnalysis && (
                  <QuestionAnalysisCompact
                    averageCorrectRate={
                      stats.questionAnalysis.reduce((sum, q) => sum + q.correctPercentage, 0) /
                      stats.questionAnalysis.length
                    }
                    hardestQuestion={stats.questionAnalysis.sort((a, b) => a.correctPercentage - b.correctPercentage)[0]?.questionText}
                    easiestQuestion={stats.questionAnalysis.sort((a, b) => b.correctPercentage - a.correctPercentage)[0]?.questionText}
                  />
                )}

                <SubmissionTimelineCompact
                  submissionCount={stats.submittedCount}
                  dueDateAt={assignment.dueDateAt}
                  lastSubmissionAt={stats.submissionTimeline[stats.submissionTimeline.length - 1]?.date ? new Date(stats.submissionTimeline[stats.submissionTimeline.length - 1].date).getTime() : undefined}
                />
              </div>
            </TabsContent>

            <TabsContent value="grades" className="space-y-6">
              <ScoreDistribution
                distribution={stats.scoreDistribution}
                gradeRanges={stats.gradeRanges}
                averageScore={stats.averageScore}
                medianScore={stats.medianScore}
                standardDeviation={stats.standardDeviation}
                minScore={stats.minScore}
                maxScore={stats.maxScore}
                totalStudents={stats.totalStudents}
              />

              {!hasGrades && (
                <Card>
                  <CardContent className="p-8">
                    <EmptyState
                      icon={GraduationCap}
                      title="No Grades Yet"
                      description="Students have submitted their assignments but haven't been graded yet."
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="questions" className="space-y-6">
              <QuestionAnalysis
                questionAnalysis={stats.questionAnalysis}
                totalStudents={stats.totalStudents}
              />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <SubmissionTimeline
                timeline={stats.submissionTimeline}
                dueDateAt={assignment.dueDateAt}
                totalSubmissions={stats.submittedCount}
              />
            </TabsContent>

            <TabsContent value="students" className="space-y-6">
              <StudentList
                students={stats.studentDetails}
                totalStudents={stats.totalStudents}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StudentListProps {
  students: {
    studentId: Id<"users">;
    name: string;
    submittedAt?: number;
    isLate: boolean;
    score?: number;
    maxScore: number;
    grade?: string;
    status: "not_submitted" | "submitted" | "graded";
  }[];
  totalStudents: number;
}

function StudentList({ students, totalStudents }: StudentListProps) {
  const getStatusBadge = (status: string, isLate: boolean) => {
    switch (status) {
      case "graded":
        return <Badge className="bg-emerald-100 text-emerald-700">Graded</Badge>;
      case "submitted":
        return isLate ? (
          <Badge variant="destructive">Late</Badge>
        ) : (
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            Submitted
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Not Submitted
          </Badge>
        );
    }
  };

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case "A":
        return "text-emerald-600";
      case "B":
        return "text-blue-600";
      case "C":
        return "text-yellow-600";
      case "D":
        return "text-orange-600";
      case "F":
        return "text-red-600";
      default:
        return "";
    }
  };

  const submittedCount = students.filter((s) => s.status !== "not_submitted").length;
  const gradedCount = students.filter((s) => s.status === "graded").length;
  const lateCount = students.filter((s) => s.isLate).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <List className="h-4 w-4" />
          Student Submissions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xl font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xl font-bold text-blue-600">{submittedCount}</p>
            <p className="text-xs text-blue-600/70">Submitted</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <p className="text-xl font-bold text-emerald-600">{gradedCount}</p>
            <p className="text-xs text-emerald-600/70">Graded</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-xl font-bold text-red-600">{lateCount}</p>
            <p className="text-xs text-red-600/70">Late</p>
          </div>
        </div>

        {/* Student Table */}
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{getStatusBadge(student.status, student.isLate)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.submittedAt
                      ? format(student.submittedAt, "MMM d, h:mm a")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {student.grade ? (
                      <span className={cn("font-bold", getGradeColor(student.grade))}>
                        {student.grade} ({student.score}%)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
