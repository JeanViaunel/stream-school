"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BookOpen, ArrowLeft, Archive, Users, MoreVertical } from "lucide-react";

export default function AdminClassesPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [teacherDraftByClassId, setTeacherDraftByClassId] = useState<
    Record<string, string | undefined>
  >({});
  const [studentDraftByClassId, setStudentDraftByClassId] = useState<
    Record<string, string | undefined>
  >({});

  // Redirect non-admins
  useEffect(() => {
    if (session && session.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  const isAdmin = session?.role === "admin";

  const classes = useQuery(
    api.admin.getAllClasses,
    isAdmin ? {} : "skip"
  );

  const users = useQuery(api.admin.getAllUsers, isAdmin ? {} : "skip");

  const archiveClass = useMutation(api.classes.archiveClass);
  const assignTeacherToClass = useAction(api.classes.adminAssignTeacherToClass);
  const addStudentToClass = useAction(api.classes.adminAddStudentToClass);

  const [teacherActionClassId, setTeacherActionClassId] = useState<string | null>(null);
  const [studentActionClassId, setStudentActionClassId] = useState<string | null>(null);
  const [openActionPanelByClassId, setOpenActionPanelByClassId] = useState<
    Record<string, "teacher" | "student">
  >({});

  const toggleActionPanel = (
    classId: Id<"classes">,
    action: "teacher" | "student"
  ) => {
    setOpenActionPanelByClassId((prev) => {
      const next = { ...prev };
      const current = next[classId];
      if (current === action) {
        delete next[classId];
      } else {
        next[classId] = action;
      }
      return next;
    });
  };

  const teachers =
    users?.filter(
      (u) =>
        u.role === "teacher" ||
        u.role === "co_teacher" ||
        u.role === "admin",
    ) ?? [];
  const students = users?.filter((u) => u.role === "student") ?? [];

  const handleAssignTeacher = async (
    classId: Id<"classes">,
    fallbackTeacherId: Id<"users">
  ) => {
    const nextTeacherId =
      (teacherDraftByClassId[classId] ?? fallbackTeacherId) as Id<"users">;

    try {
      setTeacherActionClassId(classId);
      await assignTeacherToClass({
        classId,
        teacherId: nextTeacherId,
      });
      toast.success("Teacher assigned");
      setTeacherDraftByClassId((prev) => {
        const next = { ...prev };
        delete next[classId];
        return next;
      });
      setOpenActionPanelByClassId((prev) => {
        const next = { ...prev };
        delete next[classId];
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign teacher");
    } finally {
      setTeacherActionClassId(null);
    }
  };

  const handleAddStudent = async (classId: Id<"classes">) => {
    const studentId = studentDraftByClassId[classId] ?? undefined;
    if (!studentId) {
      toast.error("Select a student");
      return;
    }

    try {
      setStudentActionClassId(classId);
      await addStudentToClass({
        classId,
        studentId: studentId as Id<"users">,
      });
      toast.success("Student added to class");
      setStudentDraftByClassId((prev) => {
        const next = { ...prev };
        delete next[classId];
        return next;
      });
      setOpenActionPanelByClassId((prev) => {
        const next = { ...prev };
        delete next[classId];
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setStudentActionClassId(null);
    }
  };

  const handleArchiveClass = async (classId: Id<"classes">, className: string) => {
    if (!window.confirm(`Are you sure you want to archive "${className}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await archiveClass({ classId });
      toast.success(`"${className}" has been archived`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive class");
    }
  };

  if (!session || !isAdmin) {
    return null;
  }

  const activeClasses = classes?.filter(c => !c.isArchived) || [];
  const archivedClasses = classes?.filter(c => c.isArchived) || [];

  return (
    <div className="w-full px-4 md:px-6 py-6">
      <header className="mb-8">
        <Button variant="ghost" onClick={() => router.push("/admin")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Class Management</h1>
        </div>
      </header>

      {/* Active Classes */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Classes ({activeClasses.length})</h2>
        {activeClasses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No active classes found
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeClasses.map((cls) => (
              <Card key={cls._id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cls.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {cls.subject} • Grade {cls.gradeLevel}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default">Active</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                        )}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toggleActionPanel(cls._id, "teacher")}
                        >
                          Assign teacher
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleActionPanel(cls._id, "student")}
                        >
                          Add student
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleArchiveClass(cls._id, cls.name)}
                          className="text-destructive"
                        >
                          Archive class
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Teacher</span>
                    <span className="font-medium">
                      {cls.teacherDisplayName ?? cls.teacherId}
                    </span>
                  </div>

                  {openActionPanelByClassId[cls._id] === "teacher" && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="text-sm font-medium">Assign teacher</div>
                      <div className="flex gap-2 items-center">
                        <Select
                          value={
                            teacherDraftByClassId[cls._id] ??
                            (cls.teacherId as unknown as string)
                          }
                          onValueChange={(value) =>
                            setTeacherDraftByClassId((prev) => ({
                              ...prev,
                              [cls._id]: value,
                            }))
                          }
                          disabled={
                            !teachers.length ||
                            teacherActionClassId === cls._id
                          }
                        >
                          <SelectTrigger className="w-full">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignTeacher(cls._id, cls.teacherId)}
                          disabled={teacherActionClassId === cls._id}
                        >
                          {teacherActionClassId === cls._id ? "Updating..." : "Assign"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {openActionPanelByClassId[cls._id] === "student" && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="text-sm font-medium">Add student</div>
                      <div className="flex gap-2 items-center">
                        <Select
                          value={studentDraftByClassId[cls._id] ?? ""}
                          onValueChange={(value) =>
                            setStudentDraftByClassId((prev) => ({
                              ...prev,
                              [cls._id]: value,
                            }))
                          }
                          disabled={
                            !students.length ||
                            studentActionClassId === cls._id
                          }
                        >
                          <SelectTrigger className="w-full">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddStudent(cls._id)}
                          disabled={studentActionClassId === cls._id}
                        >
                          {studentActionClassId === cls._id ? "Adding..." : "Add"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Join Code</span>
                    <span className="font-mono font-medium">{cls.joinCode}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Enrollment</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{cls.enrollmentCount} students</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Archived Classes */}
      {archivedClasses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Archived Classes ({archivedClasses.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {archivedClasses.map((cls) => (
              <Card key={cls._id} className="opacity-60 hover:opacity-80 transition-opacity">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cls.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {cls.subject} • Grade {cls.gradeLevel}
                        </p>
                      </div>
                    </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Archived</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon" }),
                            )}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled>
                              Assign teacher (archived)
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              Add student (archived)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Teacher</span>
                    <span className="font-medium">
                      {cls.teacherDisplayName ?? cls.teacherId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Join Code</span>
                    <span className="font-mono font-medium">{cls.joinCode}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Enrollment</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{cls.enrollmentCount} students</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
