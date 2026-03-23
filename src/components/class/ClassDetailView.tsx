"use client";

import Link from "next/link";
import { ClassSidebar } from "@/components/class/ClassSidebar";
import { AdminClassQuickActions } from "@/components/class/AdminClassQuickActions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  MessageSquare,
  UserCircle,
  Users,
} from "lucide-react";

export type ClassManagementDetail = {
  _id: Id<"classes">;
  teacherId: Id<"users">;
  name: string;
  subject: string;
  gradeLevel: number;
  joinCode: string;
  isArchived: boolean;
  createdAt: number;
  enrollmentCount: number;
  teacher: {
    _id: Id<"users">;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  students: Array<{
    studentId: Id<"users">;
    displayName: string;
    username: string;
    enrolledAt: number;
  }>;
};

type Props = {
  detail: ClassManagementDetail;
  isAdmin: boolean;
  onArchiveClass?: () => void;
};

export function ClassDetailView({ detail, isAdmin, onArchiveClass }: Props) {
  const createdLabel = new Date(detail.createdAt).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

  return (
    <div className="flex h-screen min-h-0">
      <ClassSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        <div className="border-b border-border bg-card px-4 py-4 md:px-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
                <Link href={`/class/${detail._id}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to classroom
                </Link>
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{detail.name}</h1>
                <Badge variant="secondary">Grade {detail.gradeLevel}</Badge>
                {detail.isArchived ? (
                  <Badge variant="outline">Archived</Badge>
                ) : (
                  <Badge variant="default">Active</Badge>
                )}
              </div>
              <p className="text-muted-foreground capitalize">{detail.subject}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/class/${detail._id}`}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Open chat
                </Link>
              </Button>
              {isAdmin && (
                <AdminClassQuickActions
                  classId={detail._id}
                  currentTeacherId={detail.teacherId}
                  isArchived={detail.isArchived}
                  onArchiveClass={onArchiveClass}
                  hideClassDetailsLink
                />
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 md:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Students</span>
                  <span className="font-medium">{detail.enrollmentCount}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Created</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {createdLabel}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground">Join code</span>
                  <code className="rounded-md bg-muted px-2 py-1.5 font-mono text-sm font-semibold">
                    {detail.joinCode}
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCircle className="h-4 w-4 text-primary" />
                  Class teacher
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback>
                      {detail.teacher.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">
                      {detail.teacher.displayName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{detail.teacher.username}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Roster
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {detail.students.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No students enrolled yet. Use{" "}
                  <span className="font-medium text-foreground">Add student</span>{" "}
                  in the menu to invite learners.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="hidden sm:table-cell">Username</TableHead>
                      <TableHead className="text-right">Enrolled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.students.map((s) => (
                      <TableRow key={s.studentId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {s.displayName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{s.displayName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          @{s.username}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {new Date(s.enrolledAt).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
