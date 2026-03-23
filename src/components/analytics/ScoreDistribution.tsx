"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface ScoreDistributionProps {
  distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
  gradeRanges: {
    range: string;
    count: number;
    percentage: number;
  }[];
  averageScore?: number;
  medianScore?: number;
  standardDeviation?: number;
  minScore?: number;
  maxScore?: number;
  totalStudents: number;
  isLoading?: boolean;
}

export function ScoreDistribution({
  distribution,
  gradeRanges,
  averageScore,
  medianScore,
  standardDeviation,
  minScore,
  maxScore,
  totalStudents,
  isLoading,
}: ScoreDistributionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalGraded = Object.values(distribution).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...gradeRanges.map((r) => r.count), 1);

  const getRangeColor = (range: string) => {
    switch (range) {
      case "90-100":
        return "bg-emerald-500";
      case "80-89":
        return "bg-blue-500";
      case "70-79":
        return "bg-yellow-500";
      case "60-69":
        return "bg-orange-500";
      default:
        return "bg-red-500";
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "B":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "C":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "D":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "F":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Score Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grade Distribution (A-F) */}
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(distribution).map(([grade, count]) => {
            const percentage = totalGraded > 0 ? (count / totalGraded) * 100 : 0;
            return (
              <div
                key={grade}
                className={cn(
                  "text-center p-3 rounded-lg border-2",
                  getGradeColor(grade)
                )}
              >
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs font-medium">Grade {grade}</p>
                {totalGraded > 0 && (
                  <p className="text-xs opacity-75">{Math.round(percentage)}%</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Histogram */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Grade Range Distribution
          </h4>
          {gradeRanges.map((range) => {
            const barWidth = maxCount > 0 ? (range.count / maxCount) * 100 : 0;
            return (
              <div key={range.range} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{range.range}%</span>
                  <span className="text-muted-foreground">
                    {range.count} student{range.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      getRangeColor(range.range)
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Statistics Summary */}
        {averageScore !== undefined && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Average</p>
              <p className="text-2xl font-bold text-blue-600">
                {averageScore.toFixed(1)}%
              </p>
            </div>
            {medianScore !== undefined && (
              <div className="text-center border-l">
                <p className="text-xs text-muted-foreground mb-1">Median</p>
                <p className="text-2xl font-bold text-purple-600">
                  {medianScore.toFixed(1)}%
                </p>
              </div>
            )}
            {minScore !== undefined && maxScore !== undefined && (
              <>
                <div className="text-center border-l">
                  <p className="text-xs text-muted-foreground mb-1">Highest</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {maxScore.toFixed(0)}%
                  </p>
                </div>
                <div className="text-center border-l">
                  <p className="text-xs text-muted-foreground mb-1">Lowest</p>
                  <p className="text-2xl font-bold text-red-600">
                    {minScore.toFixed(0)}%
                  </p>
                </div>
              </>
            )}
            {standardDeviation !== undefined && (
              <div className="text-center border-l col-span-2 md:col-span-4 mt-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Standard Deviation
                </p>
                <p className="text-lg font-semibold">
                  ±{standardDeviation.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ScoreDistributionCompactProps {
  averageScore?: number;
  submissionRate: number;
  lateSubmissions: number;
  totalStudents: number;
  submittedCount: number;
  isLoading?: boolean;
}

export function ScoreDistributionCompact({
  averageScore,
  submissionRate,
  lateSubmissions,
  totalStudents,
  submittedCount,
  isLoading,
}: ScoreDistributionCompactProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalStudents}</p>
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
              <p className="text-2xl font-bold">{submittedCount}</p>
              <p className="text-xs text-muted-foreground">Submitted</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={submissionRate} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(submissionRate)}% rate
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className={cn("text-2xl font-bold", getScoreColor(averageScore || 0))}>
                {averageScore?.toFixed(1) ?? "—"}%
              </p>
              <p className="text-xs text-muted-foreground">Average Score</p>
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
              <p className="text-2xl font-bold">{lateSubmissions}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PerformanceIndicator({
  value,
  label,
  trend,
  className,
}: {
  value: string;
  label: string;
  trend?: "improving" | "declining" | "stable";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="text-right">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      {trend && (
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            trend === "improving"
              ? "bg-emerald-100 text-emerald-600"
              : trend === "declining"
              ? "bg-red-100 text-red-600"
              : "bg-gray-100 text-gray-600"
          )}
        >
          {trend === "improving" ? (
            <TrendingUp className="h-4 w-4" />
          ) : trend === "declining" ? (
            <TrendingDown className="h-4 w-4" />
          ) : (
            <Minus className="h-4 w-4" />
          )}
        </div>
      )}
    </div>
  );
}
