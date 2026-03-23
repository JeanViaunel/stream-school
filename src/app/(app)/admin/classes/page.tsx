"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BookOpen, ArrowLeft, Archive, Users } from "lucide-react";

export default function AdminClassesPage() {
  const router = useRouter();
  const { session } = useAuth();

  // Redirect non-admins
  useEffect(() => {
    if (session && session.role !== "school_admin" && session.role !== "platform_admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  const isAdmin = session?.role === "school_admin" || session?.role === "platform_admin";

  const classes = useQuery(
    api.admin.getAllClasses,
    isAdmin ? {} : "skip"
  );

  const archiveClass = useMutation(api.classes.archiveClass);

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
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleArchiveClass(cls._id, cls.name)}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Class
                  </Button>
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
                    <Badge variant="secondary">Archived</Badge>
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
