"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Calendar,
  BookOpen,
  ArrowUpDown,
  ChevronRight,
} from "lucide-react";

type FilterStatus = "all" | "pending" | "submitted" | "graded" | "overdue";
type SortOption = "dueDate" | "className" | "status" | "createdAt";

interface Assignment {
  _id: string;
  classId: string;
  className: string;
  classSubject: string;
  title: string;
  instructions: string;
  dueDateAt?: number;
  createdAt: number;
  submission?: {
    _id: string;
    submittedAt: number;
    score?: number;
    maxScore?: number;
  };
  status: "pending" | "submitted" | "graded" | "overdue";
}

function formatDueDate(timestamp: number): string {
  if (isToday(timestamp)) return "Due today";
  if (isTomorrow(timestamp)) return "Due tomorrow";
  return `Due ${formatDistanceToNow(timestamp, { addSuffix: true })}`;
}

function formatDateTime(timestamp: number): string {
  if (isToday(timestamp)) {
    return `Today at ${format(timestamp, "h:mm a")}`;
  }
  if (isTomorrow(timestamp)) {
    return `Tomorrow at ${format(timestamp, "h:mm a")}`;
  }
  return format(timestamp, "MMM d, yyyy 'at' h:mm a");
}

function StatusBadge({ status }: { status: Assignment["status"] }) {
  const configs = {
    pending: {
      variant: "secondary" as const,
      icon: Clock,
      label: "Pending",
    },
    submitted: {
      variant: "default" as const,
      icon: CheckCircle2,
      label: "Submitted",
    },
    graded: {
      variant: "default" as const,
      icon: CheckCircle2,
      label: "Graded",
    },
    overdue: {
      variant: "destructive" as const,
      icon: AlertCircle,
      label: "Overdue",
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function ScoreBadge({
  score,
  maxScore,
}: {
  score?: number;
  maxScore?: number;
}) {
  if (score === undefined || maxScore === undefined) return null;

  const percentage = Math.round((score / maxScore) * 100);
  let variant: "default" | "secondary" | "destructive" = "default";

  if (percentage >= 90) variant = "default";
  else if (percentage >= 70) variant = "secondary";
  else variant = "destructive";

  return (
    <Badge variant={variant}>
      {score}/{maxScore} ({percentage}%)
    </Badge>
  );
}

export default function AssignmentsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortOption>("dueDate");
  const [searchQuery, setSearchQuery] = useState("");

  const assignments = useQuery(
    api.assignments.getMyAssignments,
    session?.role === "student"
      ? { filter, sortBy }
      : "skip"
  );

  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    if (!searchQuery.trim()) return assignments;

    const query = searchQuery.toLowerCase();
    return assignments.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.className.toLowerCase().includes(query)
    );
  }, [assignments, searchQuery]);

  const counts = useMemo(() => {
    if (!assignments) return { all: 0, pending: 0, submitted: 0, graded: 0, overdue: 0 };
    return {
      all: assignments.length,
      pending: assignments.filter((a) => a.status === "pending").length,
      submitted: assignments.filter((a) => a.status === "submitted").length,
      graded: assignments.filter((a) => a.status === "graded").length,
      overdue: assignments.filter((a) => a.status === "overdue").length,
    };
  }, [assignments]);

  if (!session) return null;

  if (session.role !== "student") {
    return (
      <div className="w-full px-4 md:px-6 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              This page is only available for students.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 py-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Assignments</h1>
        </div>
        <p className="text-muted-foreground">
          Track and manage all your assignments across classes
        </p>
      </header>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterStatus)}
          className="w-full"
        >
          <TabsList className="w-full sm:w-auto grid grid-cols-5 sm:flex">
            <TabsTrigger value="all" className="gap-1">
              All
              {counts.all > 0 && (
                <span className="ml-1 text-xs opacity-70">({counts.all})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1">
              Pending
              {counts.pending > 0 && (
                <span className="ml-1 text-xs opacity-70">({counts.pending})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="submitted" className="gap-1">
              Submitted
              {counts.submitted > 0 && (
                <span className="ml-1 text-xs opacity-70">({counts.submitted})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="graded" className="gap-1">
              Graded
              {counts.graded > 0 && (
                <span className="ml-1 text-xs opacity-70">({counts.graded})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="overdue" className="gap-1">
              Overdue
              {counts.overdue > 0 && (
                <span className="ml-1 text-xs opacity-70">({counts.overdue})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="className">Class Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="createdAt">Created Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assignments List */}
      {assignments === undefined ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">
                {searchQuery
                  ? "No assignments match your search"
                  : filter === "all"
                  ? "No assignments yet"
                  : `No ${filter} assignments`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Assignments will appear here when your teachers create them"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((assignment) => (
            <Card
              key={assignment._id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/class/${assignment.classId}`)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-base truncate">
                          {assignment.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {assignment.className} • {assignment.classSubject}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={assignment.status} />
                        {assignment.submission?.score !== undefined && (
                          <ScoreBadge
                            score={assignment.submission.score}
                            maxScore={assignment.submission.maxScore}
                          />
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                      {assignment.dueDateAt && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span
                            className={
                              assignment.status === "overdue"
                                ? "text-destructive font-medium"
                                : assignment.status === "pending" &&
                                  isToday(assignment.dueDateAt)
                                ? "text-primary font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {formatDueDate(assignment.dueDateAt)}
                          </span>
                        </div>
                      )}

                      {assignment.submission && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            Submitted {formatDistanceToNow(assignment.submission.submittedAt, { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {assignment.instructions.slice(0, 120)}
                        {assignment.instructions.length > 120 ? "..." : ""}
                      </p>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
