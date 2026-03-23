"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { ClassDetailView } from "@/components/class/ClassDetailView";
import { ClassSidebar } from "@/components/class/ClassSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ClassDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const classId = params.classId as string;

  const detail = useQuery(api.classes.getClassManagementDetail, {
    classId: classId as Id<"classes">,
  });
  const archiveClass = useMutation(api.classes.archiveClass);

  useEffect(() => {
    if (detail === null) {
      router.push("/dashboard");
    }
  }, [detail, router]);

  const handleArchiveClass = async () => {
    if (
      !confirm(
        "Archive this class? Students will no longer be able to join from the join code.",
      )
    ) {
      return;
    }
    try {
      await archiveClass({ classId: classId as Id<"classes"> });
      toast.success("Class archived");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to archive class");
    }
  };

  if (detail === undefined) {
    return (
      <div className="flex h-screen">
        <ClassSidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48 w-full max-w-4xl" />
          <Skeleton className="h-64 w-full max-w-4xl" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  const isAdmin = session?.role === "admin";

  return (
    <ClassDetailView
      detail={detail}
      isAdmin={isAdmin}
      onArchiveClass={isAdmin ? handleArchiveClass : undefined}
    />
  );
}
