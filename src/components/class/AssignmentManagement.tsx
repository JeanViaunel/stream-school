"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { FileText, Plus, Clock, CheckCircle2, AlertCircle, BarChart3, Eye } from "lucide-react";
import { toast } from "sonner";
import { AssignmentStatsView } from "@/components/assignments/AssignmentStatsView";

interface AssignmentManagementProps {
  classId: Id<"classes">;
  teacherId: Id<"users">;
}

export function AssignmentManagement({ classId, teacherId }: AssignmentManagementProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<Id<"assignments"> | null>(null);
  
  const assignments = useQuery(api.assignments.getAssignmentsByClass, { classId });
  const isTeacherOrAdmin = session?.userId === teacherId || session?.role === "admin";
  
  const publishAssignment = useMutation(api.assignments.publishAssignment);

  const handlePublish = async (assignmentId: Id<"assignments">) => {
    try {
      await publishAssignment({ assignmentId });
      toast.success("Assignment published");
    } catch (error) {
      toast.error("Failed to publish assignment");
    }
  };

  const getStatusBadge = (assignment: { isPublished: boolean; dueDateAt?: number }) => {
    if (!assignment.isPublished) {
      return <Badge variant="secondary">Draft</Badge>;
    }
    
    if (assignment.dueDateAt) {
      if (isPast(assignment.dueDateAt) && !isToday(assignment.dueDateAt)) {
        return <Badge variant="destructive">Overdue</Badge>;
      }
      if (isToday(assignment.dueDateAt)) {
        return <Badge variant="default">Due Today</Badge>;
      }
      if (isTomorrow(assignment.dueDateAt)) {
        return <Badge variant="outline">Due Tomorrow</Badge>;
      }
    }
    
    return <Badge variant="default">Published</Badge>;
  };

  const formatDueDate = (timestamp?: number) => {
    if (!timestamp) return "No due date";
    if (isToday(timestamp)) return "Due today";
    if (isTomorrow(timestamp)) return "Due tomorrow";
    return `Due ${format(timestamp, "MMM d, yyyy")}`;
  };

  if (assignments === undefined) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const publishedAssignments = assignments?.filter(a => a.isPublished) || [];
  const draftAssignments = assignments?.filter(a => !a.isPublished) || [];
  const overdueAssignments = publishedAssignments.filter(a => 
    a.dueDateAt && isPast(a.dueDateAt) && !isToday(a.dueDateAt)
  );

  return (
    <div className="p-4 space-y-4 overflow-auto">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="p-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <p className="text-lg font-bold">{assignments?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-lg font-bold">{publishedAssignments.length}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-lg font-bold">{overdueAssignments.length}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {isTeacherOrAdmin && (
          <Button onClick={() => router.push(`/class/${classId}/assignments/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        )}
      </div>

      {/* Assignments List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All ({assignments?.length || 0})</TabsTrigger>
          <TabsTrigger value="published">Published ({publishedAssignments.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftAssignments.length})</TabsTrigger>
          {isTeacherOrAdmin && (
            <TabsTrigger value="overdue">Overdue ({overdueAssignments.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {renderAssignmentList(assignments || [])}
        </TabsContent>

        <TabsContent value="published" className="mt-4 space-y-3">
          {renderAssignmentList(publishedAssignments)}
        </TabsContent>

        <TabsContent value="drafts" className="mt-4 space-y-3">
          {renderAssignmentList(draftAssignments)}
        </TabsContent>

        {isTeacherOrAdmin && (
          <TabsContent value="overdue" className="mt-4 space-y-3">
            {renderAssignmentList(overdueAssignments)}
          </TabsContent>
        )}
      </Tabs>

      {/* Assignment Stats Modal */}
      {selectedAssignmentId && (
        <AssignmentStatsView
          assignmentId={selectedAssignmentId}
          classId={classId}
          onClose={() => setSelectedAssignmentId(null)}
        />
      )}
    </div>
  );

  function renderAssignmentList(assignmentList: typeof assignments) {
    if (!assignmentList || assignmentList.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No assignments yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isTeacherOrAdmin 
                ? "Create your first assignment to get started"
                : "No assignments have been created for this class yet"
              }
            </p>
            {isTeacherOrAdmin && (
              <Button onClick={() => router.push(`/class/${classId}/assignments/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return assignmentList.map((assignment) => (
      <Card key={assignment._id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{assignment.title}</h3>
                {getStatusBadge(assignment)}
              </div>
              
              {assignment.instructions && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {assignment.instructions}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDueDate(assignment.dueDateAt)}
                </span>
                <span>
                  {assignment.questions.length} question{assignment.questions.length !== 1 ? 's' : ''}
                </span>
                <span>
                  {assignment.type === "multiple_choice" ? "Multiple Choice" : "Short Answer"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isTeacherOrAdmin && !assignment.isPublished && (
                <Button 
                  size="sm" 
                  onClick={() => handlePublish(assignment._id)}
                >
                  Publish
                </Button>
              )}
              
              {isTeacherOrAdmin && assignment.isPublished && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedAssignmentId(assignment._id)}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Stats
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {/* TODO: View assignment details */}}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  }
}
