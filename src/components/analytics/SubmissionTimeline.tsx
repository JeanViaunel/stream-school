"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Calendar, Clock, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface TimelineEntry {
  date: string;
  count: number;
}

interface SubmissionTimelineProps {
  timeline: TimelineEntry[];
  dueDateAt?: number;
  totalSubmissions: number;
  isLoading?: boolean;
}

export function SubmissionTimeline({
  timeline,
  dueDateAt,
  totalSubmissions,
  isLoading,
}: SubmissionTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Submission Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
          <p className="text-sm text-muted-foreground">
            Students haven't submitted this assignment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...timeline.map((t) => t.count), 1);
  const totalCount = timeline.reduce((sum, t) => sum + t.count, 0);

  // Calculate submission velocity
  const sortedTimeline = [...timeline].sort((a, b) => a.date.localeCompare(b.date));
  const firstSubmission = sortedTimeline[0]?.date;
  const lastSubmission = sortedTimeline[sortedTimeline.length - 1]?.date;
  
  let daysSpan = 1;
  if (firstSubmission && lastSubmission) {
    const first = new Date(firstSubmission);
    const last = new Date(lastSubmission);
    daysSpan = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const submissionsPerDay = totalCount / daysSpan;

  // Determine if most submissions were before or after due date
  let beforeDue = 0;
  let afterDue = 0;
  
  if (dueDateAt) {
    const dueDate = new Date(dueDateAt).toISOString().split("T")[0];
    timeline.forEach((entry) => {
      if (entry.date <= dueDate) {
        beforeDue += entry.count;
      } else {
        afterDue += entry.count;
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Submission Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeline Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{totalSubmissions}</p>
            <p className="text-xs text-muted-foreground">Total Submissions</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{submissionsPerDay.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Per Day (avg)</p>
          </div>
          {dueDateAt && (
            <>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{beforeDue}</p>
                <p className="text-xs text-green-600/70">On Time</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{afterDue}</p>
                <p className="text-xs text-red-600/70">Late</p>
              </div>
            </>
          )}
        </div>

        {/* Due Date Banner */}
        {dueDateAt && (
          <div
            className={cn(
              "p-3 rounded-lg flex items-center gap-3",
              Date.now() > dueDateAt
                ? "bg-red-50 border border-red-200"
                : "bg-blue-50 border border-blue-200"
            )}
          >
            <Clock
              className={cn(
                "h-5 w-5",
                Date.now() > dueDateAt ? "text-red-500" : "text-blue-500"
              )}
            />
            <div>
              <p className="font-medium">
                Due {Date.now() > dueDateAt ? "Date Passed" : "Date"}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(dueDateAt, "MMM d, yyyy 'at' h:mm a")}
                {" "}(
                {formatDistanceToNow(dueDateAt, { addSuffix: true })})
              </p>
            </div>
          </div>
        )}

        {/* Timeline Visualization */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Submissions by Date
          </h4>
          <div className="space-y-2">
            {sortedTimeline.map((entry, index) => {
              const barWidth = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
              const date = new Date(entry.date);
              const isLate = dueDateAt ? date.getTime() > dueDateAt : false;

              return (
                <div key={entry.date} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">
                    {format(date, "MMM d")}
                  </span>
                  <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden relative">
                    <div
                      className={cn(
                        "h-full rounded-md transition-all duration-500 flex items-center",
                        isLate ? "bg-red-500" : "bg-blue-500"
                      )}
                      style={{ width: `${Math.max(barWidth, entry.count > 0 ? 5 : 0)}%` }}
                    >
                      {barWidth > 20 && (
                        <span className="text-xs text-white font-medium px-2">
                          {entry.count}
                        </span>
                      )}
                    </div>
                    {barWidth <= 20 && entry.count > 0 && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                        {entry.count}
                      </span>
                    )}
                  </div>
                  {isLate && (
                    <Badge variant="destructive" className="text-xs shrink-0">
                      Late
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submission Pattern Analysis */}
        {sortedTimeline.length > 1 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Submission Pattern
            </h4>
            <div className="flex items-center gap-4">
              {submissionsPerDay > totalSubmissions / 2 ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Quick Turnaround</p>
                    <p className="text-sm text-muted-foreground">
                      Most students submitted quickly after the assignment was posted.
                    </p>
                  </div>
                </>
              ) : afterDue > beforeDue ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">Late Heavy</p>
                    <p className="text-sm text-muted-foreground">
                      Most submissions came after the due date. Consider reminders.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Steady Flow</p>
                    <p className="text-sm text-muted-foreground">
                      Submissions came in steadily over time.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CompactTimelineProps {
  submissionCount: number;
  dueDateAt?: number;
  lastSubmissionAt?: number;
  isLoading?: boolean;
}

export function SubmissionTimelineCompact({
  submissionCount,
  dueDateAt,
  lastSubmissionAt,
  isLoading,
}: CompactTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{submissionCount}</p>
              <p className="text-xs text-muted-foreground">Submissions</p>
            </div>
          </div>

          <div className="text-right">
            {dueDateAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Due {Date.now() > dueDateAt ? "passed" : formatDistanceToNow(dueDateAt, { addSuffix: true })}
                </span>
              </div>
            )}
            {lastSubmissionAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Last: {formatDistanceToNow(lastSubmissionAt, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
