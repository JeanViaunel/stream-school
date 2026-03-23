"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface QuizResultsProps {
  assignmentId: Id<"assignments">;
}

interface QuestionStats {
  questionId: string;
  questionText: string;
  correctCount: number;
  totalCount: number;
  percentage: number;
}

export function QuizResults({ assignmentId }: QuizResultsProps) {
  const assignment = useQuery(api.assignments.getAssignmentById, { assignmentId });
  const submissions = useQuery(api.submissions.getSubmissionsByAssignment, { assignmentId });

  if (assignment === undefined || submissions === undefined) {
    return (
      <Card className="w-full">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading results...</div>
        </CardContent>
      </Card>
    );
  }

  if (assignment === null) {
    return (
      <Card className="w-full">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Assignment not found</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const totalSubmissions = submissions.length;
  const averageScore = totalSubmissions > 0
    ? Math.round(
        submissions.reduce((acc, s) => {
          const score = s.teacherScore ?? s.autoScore ?? 0;
          return acc + score;
        }, 0) / totalSubmissions
      )
    : 0;

  // Calculate per-question statistics
  const questionStats: QuestionStats[] = assignment.questions.map(question => {
    let correctCount = 0;
    submissions.forEach(submission => {
      const answer = submission.answers.find(a => a.questionId === question.id);
      if (answer && question.correctOption !== undefined) {
        if (parseInt(answer.value) === question.correctOption) {
          correctCount++;
        }
      }
    });
    return {
      questionId: question.id,
      questionText: question.text,
      correctCount,
      totalCount: totalSubmissions,
      percentage: totalSubmissions > 0 ? Math.round((correctCount / totalSubmissions) * 100) : 0,
    };
  });

  const chartData = questionStats.map((stat, index) => ({
    name: `Q${index + 1}`,
    correct: stat.percentage,
    incorrect: 100 - stat.percentage,
  }));

  const COLORS = {
    correct: "#22c55e",
    incorrect: "#ef4444",
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-3xl font-bold">{totalSubmissions}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-3xl font-bold">{averageScore}%</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assignment Type</p>
                <p className="text-lg font-bold capitalize">
                  {assignment.type.replace("_", " ")}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <CheckCircle className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Question Performance Chart */}
      {assignment.type === "multiple_choice" && questionStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Question Performance</CardTitle>
            <CardDescription>Percentage of students who answered each question correctly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, "Correct"]} 
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="correct" fill={COLORS.correct} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Question Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Question Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questionStats.map((stat, index) => (
              <div key={stat.questionId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {index + 1}. {stat.questionText.substring(0, 60)}{stat.questionText.length > 60 ? "..." : ""}
                  </span>
                  <Badge variant={stat.percentage >= 70 ? "default" : stat.percentage >= 50 ? "secondary" : "destructive"}>
                    {stat.percentage}% correct
                  </Badge>
                </div>
                <Progress value={stat.percentage} />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{stat.correctCount} correct</span>
                  <span>{stat.totalCount - stat.correctCount} incorrect</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Submitted At</TableHead>
                  {assignment.type === "multiple_choice" && <TableHead>Auto Score</TableHead>}
                  <TableHead>Teacher Score</TableHead>
                  <TableHead>Final Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={assignment.type === "multiple_choice" ? 5 : 4} className="text-center text-muted-foreground">
                      No submissions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((submission) => {
                    const finalScore = submission.teacherScore ?? submission.autoScore ?? "-";
                    return (
                      <TableRow key={submission._id}>
                        <TableCell className="font-medium">
                          {submission.student.displayName}
                        </TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(submission.submittedAt, "PPP 'at' p")}
                        </TableCell>
                        {assignment.type === "multiple_choice" && (
                          <TableCell>
                            {submission.autoScore !== undefined ? `${submission.autoScore}%` : "-"}
                          </TableCell>
                        )}
                        <TableCell>
                          {submission.teacherScore !== undefined ? `${submission.teacherScore}%` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            typeof finalScore === "number" 
                              ? finalScore >= 70 ? "default" : finalScore >= 50 ? "secondary" : "destructive"
                              : "outline"
                          }>
                            {typeof finalScore === "number" ? `${finalScore}%` : finalScore}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
