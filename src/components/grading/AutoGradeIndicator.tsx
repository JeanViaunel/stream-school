"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot, UserCheck, AlertCircle } from "lucide-react";

interface AutoGradeIndicatorProps {
  autoScore?: number;
  autoGradedAt?: number;
  teacherScore?: number;
  isTeacherOverride?: boolean;
  showTooltip?: boolean;
}

export function AutoGradeIndicator({
  autoScore,
  autoGradedAt,
  teacherScore,
  isTeacherOverride,
  showTooltip = true,
}: AutoGradeIndicatorProps) {
  // Case 1: Teacher has overridden the auto-grade
  if (isTeacherOverride && teacherScore !== undefined) {
    const content = (
      <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
        <UserCheck className="h-3 w-3" />
        <span>Teacher Override</span>
      </Badge>
    );

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent>
              <p>Teacher has overridden the auto-graded score</p>
              <p className="text-xs text-muted-foreground">
                Auto: {autoScore}% → Teacher: {teacherScore}%
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return content;
  }

  // Case 2: Has auto-score but no teacher score
  if (autoScore !== undefined && autoGradedAt !== undefined && teacherScore === undefined) {
    const content = (
      <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
        <Bot className="h-3 w-3" />
        <span>Auto-Graded</span>
      </Badge>
    );

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent>
              <p>Automatically graded by system</p>
              <p className="text-xs text-muted-foreground">
                Score: {autoScore}%
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return content;
  }

  // Case 3: Only teacher score (manually graded, no auto-grade)
  if (teacherScore !== undefined && autoScore === undefined) {
    const content = (
      <Badge variant="outline" className="gap-1">
        <UserCheck className="h-3 w-3" />
        <span>Manual</span>
      </Badge>
    );

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent>
              <p>Manually graded by teacher</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return content;
  }

  // Case 4: Pending grading
  const content = (
    <Badge variant="outline" className="gap-1 border-muted-foreground text-muted-foreground">
      <AlertCircle className="h-3 w-3" />
      <span>Pending</span>
    </Badge>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>Waiting to be graded</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return content;
}
