"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { ClassCallRoom } from "@/components/call/ClassCallRoom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const classId = params.classId as string;
  const sessionId = params.sessionId as string;
  
  const [isLoading, setIsLoading] = useState(true);

  const classData = useQuery(api.classes.getClassById, { classId: classId as Id<"classes"> });

  useEffect(() => {
    if (classData === null) {
      router.push("/dashboard");
    }
  }, [classData, router]);

  if (classData === undefined) {
    return (
      <div className="h-screen flex flex-col">
        <div className="p-4 border-b border-border">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (!classData) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Back button header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.push(`/class/${classId}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Class
        </Button>
        <div className="text-sm text-muted-foreground">
          {classData.name}
        </div>
      </div>

      {/* Call room */}
      <div className="flex-1">
        <ClassCallRoom
          callId={sessionId}
          className={classData.name}
          teacherName={"Teacher"} // TODO: Fetch teacher name
          teacherId={classData.teacherId}
          onLeave={() => router.push(`/class/${classId}`)}
        />
      </div>
    </div>
  );
}
