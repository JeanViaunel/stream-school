"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle, FileCheck, AlertCircle, BookOpen, ChevronRight } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface StudentAssignmentsListProps {
  classId: Id<"classes">;
  onSelectAssignment?: (assignmentId: Id<"assignments">) => void;
}

type AssignmentStatus = "pending" | "submitted" | "graded" | "overdue";

interface AssignmentWithStatus {
  _id: Id<"assignments">;
  title: string;
  instructions: string;
  dueDateAt: number | undefined;
  status: AssignmentStatus;
  submittedAt: number | undefined;
  grade: {
    score: number;
    maxScore: number;
    feedback?: string;
  } | undefined;
  isLate: boolean;
}

export function StudentAssignmentsList({ classId, onSelectAssignment }: StudentAssignmentsListProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "submitted" | "graded">("all");
  
  // Use getMyAssignments which already includes submission and grade info
  const allMyAssignments = useQuery(api.assignments.getMyAssignments, { filter: "all" });

  const isLoading = allMyAssignments === undefined;

  // Filter to this class and process status
  const processedAssignments = useMemo<AssignmentWithStatus[]>(() => {
    if (!allMyAssignments) return [];

    const classAssignments = allMyAssignments.filter(a => a.classId === classId);
    
    return classAssignments.map(assignment => {
      const status: AssignmentStatus = assignment.status as AssignmentStatus;

      const isLate = assignment.submission && assignment.dueDateAt 
        ? assignment.submission.submittedAt > assignment.dueDateAt 
        : false;

      return {
        _id: assignment._id,
        title: assignment.title,
        instructions: assignment.instructions,
        dueDateAt: assignment.dueDateAt,
        status,
        submittedAt: assignment.submission?.submittedAt,
        grade: assignment.submission?.score !== undefined ? {
          score: assignment.submission.score,
          maxScore: assignment.submission.maxScore || 100,
        } : undefined,
        isLate,
      };
    });
  }, [allMyAssignments, classId]);

  if (isLoading) {
    return <AssignmentsListSkeleton />;
  }

  // Sort by due date (overdue first, then by date)
  const sortedAssignments = [...processedAssignments].sort((a, b) => {
    const statusOrder = { overdue: 0, pending: 1, submitted: 2, graded: 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (a.dueDateAt && b.dueDateAt) {
      return a.dueDateAt - b.dueDateAt;
    }
    if (a.dueDateAt) return -1;
    if (b.dueDateAt) return 1;
    return 0;
  });

  // Filter assignments
  const filteredAssignments = sortedAssignments.filter(assignment => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return assignment.status === "pending" || assignment.status === "overdue";
    if (activeFilter === "submitted") return assignment.status === "submitted";
    if (activeFilter === "graded") return assignment.status === "graded";
    return true;
  });

  const getStatusBadge = (status: AssignmentStatus, isLate: boolean) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <BookOpen className="h-3 w-3" />
            Not Started
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="secondary" className={`gap-1 ${isLate ? "bg-amber-500/20 text-amber-400" : ""}`}>
            <CheckCircle className="h-3 w-3" />
            {isLate ? "Submitted (Late)" : "Submitted"}
          </Badge>
        );
      case "graded":
        return (
          <Badge className="gap-1 bg-green-500/20 text-green-400 hover:bg-green-500/30">
            <FileCheck className="h-3 w-3" />
            Graded
          </Badge>
        );
      case "overdue":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Overdue
          </Badge>
        );
    }
  };

  const getDueDateText = (dueDateAt: number | undefined, status: AssignmentStatus) => {
    if (!dueDateAt) return "No due date";
    
    const now = Date.now();
    const daysUntil = differenceInDays(dueDateAt, now);
    
    if (status === "graded" || status === "submitted") {
      return `Due ${format(dueDateAt, "MMM d")}`;
    }
    
    if (isPast(dueDateAt)) {
      const daysOverdue = Math.abs(daysUntil);
      return (
        <span className="text-destructive font-medium">
          {daysOverdue === 0 ? "Due today" : `${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue`}
        </span>
      );
    }
    
    if (daysUntil === 0) {
      return <span className="text-amber-400 font-medium">Due today</span>;
    }
    if (daysUntil === 1) {
      return <span className="text-amber-400">Due tomorrow</span>;
    }
    if (daysUntil <= 3) {
      return <span className="text-amber-300">Due in {daysUntil} days</span>;
    }
    return `Due ${format(dueDateAt, "MMM d")}`;
  };

  const getGradeDisplay = (grade: { score: number; maxScore: number } | undefined) => {
    if (!grade) return null;
    const percentage = Math.round((grade.score / grade.maxScore) * 100);
    return (
      <div className="text-right">
        <div className="text-lg font-bold text-primary">{percentage}%</div>
        <div className="text-xs text-muted-foreground">{grade.score}/{grade.maxScore} points</div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>
              {processedAssignments.filter(a => a.status === "pending" || a.status === "overdue").length} pending
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All ({processedAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({processedAssignments.filter(a => a.status === "pending" || a.status === "overdue").length})
            </TabsTrigger>
            <TabsTrigger value="submitted">
              Submitted ({processedAssignments.filter(a => a.status === "submitted").length})
            </TabsTrigger>
            <TabsTrigger value="graded">
              Graded ({processedAssignments.filter(a => a.status === "graded").length})
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mt-4 space-y-2"
            >
              {filteredAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No assignments in this category</p>
                </div>
              ) : (
                filteredAssignments.map((assignment, index) => (
                  <motion.div
                    key={assignment._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => onSelectAssignment?.(assignment._id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusBadge(assignment.status, assignment.isLate)}
                            </div>
                            <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                              {assignment.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Clock className="h-3.5 w-3.5" />
                              {getDueDateText(assignment.dueDateAt, assignment.status)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getGradeDisplay(assignment.grade)}
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function AssignmentsListSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}