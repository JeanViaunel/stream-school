"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  GraduationCap, 
  Users,
  MessageCircle,
  TrendingUp,
  Calendar
} from "lucide-react";

interface ClassProgressCardProps {
  classId: string;
  className: string;
  subject: string;
  teacherName: string;
  teacherId: string;
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

export function ClassProgressCard({
  classId,
  className,
  subject,
  teacherName,
  teacherId,
  progress,
  assignmentProgress,
  attendanceProgress,
  recentGrades,
  attendanceRate,
  totalSessions,
  attendedSessions,
}: ClassProgressCardProps) {
  const missedSessions = totalSessions - attendedSessions;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{className}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize text-xs">
                {subject}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {teacherName}
              </span>
            </div>
          </div>
          <Link href={`/class/${classId}`}>
            <Button variant="ghost" size="sm">
              <BookOpen className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Overall Progress
            </span>
            <span className="text-sm font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Assignment & Attendance Progress */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                Assignments
              </span>
              <span className="text-xs font-medium">{assignmentProgress}%</span>
            </div>
            <Progress value={assignmentProgress} className="h-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Attendance
              </span>
              <span className="text-xs font-medium">{attendanceRate}%</span>
            </div>
            <Progress value={attendanceRate} className="h-1.5" />
          </div>
        </div>

        {/* Attendance Stats */}
        <div className="flex items-center gap-4 py-2 border-y">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">
              {attendedSessions} Present
            </span>
          </div>
          {missedSessions > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">
                {missedSessions} Absent
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {totalSessions} Total
            </span>
          </div>
        </div>

        {/* Recent Grades */}
        {recentGrades.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              Recent Grades
            </p>
            <div className="space-y-2">
              {recentGrades.slice(0, 5).map((grade, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate flex-1 mr-2" title={grade.assignmentTitle}>
                    {grade.assignmentTitle}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={grade.percentage >= 90 ? "default" : 
                               grade.percentage >= 80 ? "secondary" : 
                               grade.percentage >= 70 ? "outline" : "destructive"}
                      className="text-xs"
                    >
                      {grade.score}/{grade.maxScore}
                    </Badge>
                    <span className={`text-xs font-medium min-w-[3rem] text-right ${
                      grade.percentage >= 90 ? 'text-green-600' :
                      grade.percentage >= 80 ? 'text-blue-600' :
                      grade.percentage >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {grade.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Link href={`/class/${classId}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <BookOpen className="w-3 h-3 mr-1" />
              View Class
            </Button>
          </Link>
          <Link href={`/messages`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <MessageCircle className="w-3 h-3 mr-1" />
              Message Teacher
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
