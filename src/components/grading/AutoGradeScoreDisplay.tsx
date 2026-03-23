"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, UserCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AutoGradeScoreDisplayProps {
  autoScore?: number;
  autoGradedAt?: number;
  teacherScore?: number;
  isTeacherOverride?: boolean;
  totalQuestions: number;
  correctAnswers?: number;
}

export function AutoGradeScoreDisplay({
  autoScore,
  autoGradedAt,
  teacherScore,
  isTeacherOverride,
  totalQuestions,
  correctAnswers,
}: AutoGradeScoreDisplayProps) {
  const displayScore = isTeacherOverride && teacherScore !== undefined 
    ? teacherScore 
    : autoScore;
  
  const isGraded = displayScore !== undefined;

  if (!isGraded) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Not Yet Graded</p>
            <p className="text-sm text-muted-foreground">
              Your submission is waiting to be graded
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const percentage = displayScore || 0;
  let gradeLabel = "F";
  let gradeColor = "text-red-500";
  
  if (percentage >= 90) {
    gradeLabel = "A";
    gradeColor = "text-green-500";
  } else if (percentage >= 80) {
    gradeLabel = "B";
    gradeColor = "text-blue-500";
  } else if (percentage >= 70) {
    gradeLabel = "C";
    gradeColor = "text-yellow-500";
  } else if (percentage >= 60) {
    gradeLabel = "D";
    gradeColor = "text-orange-500";
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Score</CardTitle>
          {isTeacherOverride ? (
            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
              <UserCheck className="h-3 w-3" />
              Teacher Graded
            </Badge>
          ) : autoGradedAt ? (
            <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
              <Bot className="h-3 w-3" />
              Auto-Graded
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="flex items-center justify-center py-4">
          <div className="text-center">
            <div className={`text-5xl font-bold ${gradeColor}`}>
              {percentage}%
            </div>
            <div className="text-2xl font-semibold text-muted-foreground mt-1">
              Grade {gradeLabel}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={percentage} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Details */}
        {correctAnswers !== undefined && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm">
              <span className="font-semibold">{correctAnswers}</span> out of{" "}
              <span className="font-semibold">{totalQuestions}</span> questions correct
            </span>
          </div>
        )}

        {/* Teacher Override Notice */}
        {isTeacherOverride && autoScore !== undefined && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Teacher Override:</span> Your teacher has adjusted 
              your score from {autoScore}% to {teacherScore}%
            </p>
          </div>
        )}

        {/* Timestamp */}
        {autoGradedAt && !isTeacherOverride && (
          <p className="text-xs text-muted-foreground text-center">
            Auto-graded {formatDistanceToNow(autoGradedAt, { addSuffix: true })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
