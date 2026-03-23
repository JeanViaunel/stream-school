"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  BookOpen, 
  GraduationCap,
  TrendingUp,
  User
} from "lucide-react";

interface StudentInfo {
  studentId: string;
  name: string;
  gradeLevel?: number;
  avatarUrl?: string;
}

interface ClassInfo {
  classId: string;
  className: string;
  subject: string;
  teacherName: string;
  progress: number;
  assignmentProgress: number;
  attendanceProgress: number;
  recentGrades: {
    assignmentTitle: string;
    score: number;
    maxScore: number;
    percentage: number;
    date: number;
  }[];
  attendanceRate: number;
  totalSessions: number;
  attendedSessions: number;
}

interface StudentOverviewProps {
  student: StudentInfo;
  classes: ClassInfo[];
}

export function StudentOverview({ student, classes }: StudentOverviewProps) {
  // Calculate overall stats
  const totalClasses = classes.length;
  const averageProgress = classes.length > 0
    ? Math.round(classes.reduce((sum, c) => sum + c.progress, 0) / classes.length)
    : 0;
  
  const totalRecentGrades = classes.reduce((sum, c) => sum + c.recentGrades.length, 0);
  
  const averageAttendance = classes.length > 0
    ? Math.round(classes.reduce((sum, c) => sum + c.attendanceRate, 0) / classes.length)
    : 0;

  // Get overall grade average from recent grades
  let totalGradePercentage = 0;
  let gradeCount = 0;
  classes.forEach(cls => {
    cls.recentGrades.forEach(grade => {
      totalGradePercentage += grade.percentage;
      gradeCount++;
    });
  });
  const averageGrade = gradeCount > 0 ? Math.round(totalGradePercentage / gradeCount) : 0;

  return (
    <div className="space-y-6">
      {/* Student Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              {student.avatarUrl ? (
                <AvatarImage src={student.avatarUrl} alt={student.name} />
              ) : null}
              <AvatarFallback className="text-2xl">
                {student.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{student.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                {student.gradeLevel && (
                  <Badge variant="secondary">
                    Grade {student.gradeLevel}
                  </Badge>
                )}
                <Badge variant="outline" className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {totalClasses} Classes
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageProgress}%</div>
            <Progress value={averageProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Grade Average
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
              Based on {gradeCount} recent grades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageAttendance}%</div>
            <Progress value={averageAttendance} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Recent Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalRecentGrades}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all classes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Class List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Enrolled Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {classes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No classes enrolled yet
              </p>
            ) : (
              classes.map((cls) => (
                <div 
                  key={cls.classId} 
                  className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{cls.className}</h3>
                        <Badge variant="outline" className="text-xs capitalize">
                          {cls.subject}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        {cls.teacherName}
                      </div>
                      
                      {/* Progress Bars */}
                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Overall Progress</span>
                            <span className="font-medium">{cls.progress}%</span>
                          </div>
                          <Progress value={cls.progress} className="h-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Assignments</span>
                              <span className="font-medium">{cls.assignmentProgress}%</span>
                            </div>
                            <Progress value={cls.assignmentProgress} className="h-1.5" />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Attendance</span>
                              <span className="font-medium">{cls.attendanceRate}%</span>
                            </div>
                            <Progress value={cls.attendanceRate} className="h-1.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Grades Preview */}
                  {cls.recentGrades.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Recent Grades</p>
                      <div className="flex gap-2">
                        {cls.recentGrades.slice(0, 3).map((grade, idx) => (
                          <Badge 
                            key={idx} 
                            variant={grade.percentage >= 80 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {grade.assignmentTitle}: {grade.percentage}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
