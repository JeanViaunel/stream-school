"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  GraduationCap, 
  TrendingUp,
  Calendar,
  Award,
  BookOpen
} from "lucide-react";

interface GradeHistoryProps {
  studentId: string;
  studentName: string;
}

export function GradeHistory({ studentId, studentName }: GradeHistoryProps) {
  const progressData = useQuery(
    api.parents.getStudentProgressForParent,
    { studentId }
  );

  if (!progressData) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { recentGrades, gradeHistory, attendanceSummary, upcomingAssignments, completedMilestones } = progressData;

  // Calculate grade distribution
  const gradeDistribution = {
    A: recentGrades.filter(g => g.percentage >= 90).length,
    B: recentGrades.filter(g => g.percentage >= 80 && g.percentage < 90).length,
    C: recentGrades.filter(g => g.percentage >= 70 && g.percentage < 80).length,
    D: recentGrades.filter(g => g.percentage >= 60 && g.percentage < 70).length,
    F: recentGrades.filter(g => g.percentage < 60).length,
  };

  const averageGrade = recentGrades.length > 0
    ? Math.round(recentGrades.reduce((sum, g) => sum + g.percentage, 0) / recentGrades.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Grade Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Average Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              averageGrade >= 90 ? 'text-green-500' :
              averageGrade >= 80 ? 'text-blue-500' :
              averageGrade >= 70 ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              {averageGrade}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {recentGrades.length} graded assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Highest Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {recentGrades.length > 0 ? Math.max(...recentGrades.map(g => g.percentage)) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Best performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Assignments Graded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentGrades.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total submissions graded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      {recentGrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {Object.entries(gradeDistribution).map(([grade, count]) => (
                count > 0 && (
                  <div 
                    key={grade}
                    className={`flex-1 p-3 rounded-lg text-center ${
                      grade === 'A' ? 'bg-green-100 text-green-700' :
                      grade === 'B' ? 'bg-blue-100 text-blue-700' :
                      grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                      grade === 'D' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}
                  >
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs font-medium">Grade {grade}</div>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Grades List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Recent Grades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentGrades.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No grades recorded yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentGrades.map((grade) => (
                <div 
                  key={grade.gradeId}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{grade.assignmentTitle}</h4>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {grade.className}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Graded by {grade.gradedByName} • {new Date(grade.gradedAt).toLocaleDateString()}
                    </p>
                    {grade.feedback && (
                      <p className="text-sm mt-2 text-muted-foreground italic">
                        &ldquo;{grade.feedback}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <div className={`text-2xl font-bold ${
                      grade.percentage >= 90 ? 'text-green-600' :
                      grade.percentage >= 80 ? 'text-blue-600' :
                      grade.percentage >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {grade.percentage}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {grade.score}/{grade.maxScore}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Assignments */}
      {upcomingAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAssignments.map((assignment) => (
                <div 
                  key={assignment.assignmentId}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <h4 className="font-medium">{assignment.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {assignment.className}
                    </p>
                  </div>
                  {assignment.dueDate && (
                    <Badge variant="secondary">
                      Due {new Date(assignment.dueDate).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Milestones */}
      {completedMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedMilestones.map((milestone) => (
                <div 
                  key={milestone.milestoneId}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-green-50/50"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{milestone.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {milestone.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(milestone.completedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Attendance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{attendanceSummary.totalSessions}</div>
              <div className="text-xs text-muted-foreground">Total Sessions</div>
            </div>
            <div className="p-4 rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">{attendanceSummary.attendedSessions}</div>
              <div className="text-xs text-muted-foreground">Attended</div>
            </div>
            <div className="p-4 rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-600">{attendanceSummary.missedSessions}</div>
              <div className="text-xs text-muted-foreground">Missed</div>
            </div>
            <div className="p-4 rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">{attendanceSummary.attendanceRate}%</div>
              <div className="text-xs text-muted-foreground">Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
