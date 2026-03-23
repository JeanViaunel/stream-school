"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Archive,
  LayoutList,
  Loader2,
  MessageSquare,
  MoreVertical,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  classId: Id<"classes">;
  currentTeacherId: Id<"users">;
  isArchived: boolean;
  onArchiveClass?: () => void;
  /** Hide “Class details” (e.g. when already on the details page). */
  hideClassDetailsLink?: boolean;
};

export function AdminClassQuickActions({
  classId,
  currentTeacherId,
  isArchived,
  onArchiveClass,
  hideClassDetailsLink = false,
}: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const isAdmin = session?.role === "admin";

  const users = useQuery(api.admin.getAllUsers, isAdmin ? {} : "skip");
  const assignTeacherToClass = useAction(api.classes.adminAssignTeacherToClass);
  const addStudentToClass = useAction(api.classes.adminAddStudentToClass);

  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [teacherIdDraft, setTeacherIdDraft] = useState<string>(currentTeacherId);
  const [studentIdDraft, setStudentIdDraft] = useState("");
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  const teachers =
    users?.filter(
      (u) =>
        u.role === "teacher" ||
        u.role === "co_teacher" ||
        u.role === "admin",
    ) ?? [];
  const students = users?.filter((u) => u.role === "student") ?? [];

  if (!isAdmin) {
    return null;
  }

  const handleAssignTeacher = async () => {
    const nextId = teacherIdDraft as Id<"users">;
    if (!nextId) {
      toast.error("Select a teacher");
      return;
    }
    setAssigningTeacher(true);
    try {
      await assignTeacherToClass({ classId, teacherId: nextId });
      toast.success("Teacher assigned");
      setTeacherDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign teacher");
    } finally {
      setAssigningTeacher(false);
    }
  };

  const handleAddStudent = async () => {
    if (!studentIdDraft) {
      toast.error("Select a student");
      return;
    }
    setAddingStudent(true);
    try {
      await addStudentToClass({
        classId,
        studentId: studentIdDraft as Id<"users">,
      });
      toast.success("Student added to class");
      setStudentDialogOpen(false);
      setStudentIdDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setAddingStudent(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Class admin actions"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2"
            onClick={() => {
              router.push(`/class/${classId}`);
            }}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Open classroom</span>
          </DropdownMenuItem>
          {!hideClassDetailsLink && (
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2"
              onClick={() => {
                router.push(`/class/${classId}/details`);
              }}
            >
              <LayoutList className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Class details</span>
            </DropdownMenuItem>
          )}
          {!isArchived && (
            <>
              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2"
                onClick={() => {
                  setTeacherIdDraft(currentTeacherId);
                  setTeacherDialogOpen(true);
                }}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Assign teacher</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2"
                onClick={() => setStudentDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Add student</span>
              </DropdownMenuItem>
            </>
          )}
          {onArchiveClass && !isArchived && (
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
              onClick={onArchiveClass}
            >
              <Archive className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Archive class</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="assign-teacher-select">Teacher</Label>
                <Select
                  value={teacherIdDraft}
                  onValueChange={setTeacherIdDraft}
                  disabled={!teachers.length || assigningTeacher}
                >
                  <SelectTrigger id="assign-teacher-select" className="w-full">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.displayName} (@{t.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleAssignTeacher}
              disabled={assigningTeacher || !teachers.length}
            >
              {assigningTeacher ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning…
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="add-student-select">Student</Label>
                <Select
                  value={studentIdDraft}
                  onValueChange={setStudentIdDraft}
                  disabled={!students.length || addingStudent}
                >
                  <SelectTrigger id="add-student-select" className="w-full">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.displayName} (@{s.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleAddStudent}
              disabled={addingStudent || !students.length}
            >
              {addingStudent ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                "Add to class"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
