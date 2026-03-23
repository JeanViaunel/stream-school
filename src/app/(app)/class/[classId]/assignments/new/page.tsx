"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { AssignmentCreator } from "@/components/assignments/AssignmentCreator";
import { ClassSidebar } from "@/components/class/ClassSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function NewAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const classId = params.classId as Id<"classes">;

  const classData = useQuery(api.classes.getClassById, { classId });

  if (classData === undefined) {
    return (
      <div className="flex h-screen">
        <ClassSidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (!classData) {
    return null;
  }

  const isTeacherOrAdmin =
    session?.userId === classData.teacherId || session?.role === "admin";

  if (!isTeacherOrAdmin) {
    return (
      <div className="flex h-screen">
        <ClassSidebar />
        <div className="flex min-w-0 flex-1 items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Only teachers and admins can create assignments.
              </p>
              <Button asChild>
                <Link href={`/class/${classId}`}>Back to class</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <ClassSidebar />

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
      >
        <div className="border-b bg-card/70 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Button variant="ghost" size="sm" asChild className="w-fit px-2">
                <Link href={`/class/${classId}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to class
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h1 className="text-xl font-semibold">Create Assignment</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {classData.name} - Build, review, and publish from a full-page editor.
              </p>
            </div>
          </div>
        </div>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.24 }}
          className="min-h-0 flex-1 overflow-hidden p-6"
        >
          <Card className="h-full overflow-hidden border-border/60 shadow-sm">
            <CardContent className="h-full p-6">
              <AssignmentCreator
                classId={classId}
                onSuccess={() => {
                  toast.success("Assignment created successfully");
                  router.push(`/class/${classId}`);
                }}
              />
            </CardContent>
          </Card>
        </motion.section>
      </motion.main>
    </div>
  );
}
