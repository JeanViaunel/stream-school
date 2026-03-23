"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useChatContext } from "stream-chat-react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import type { Channel } from "stream-chat";
import { ClassSidebar } from "@/components/class/ClassSidebar";
import { ClassHeader } from "@/components/class/ClassHeader";
import { ChannelView } from "@/components/chat/ChannelView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ClassPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const { client, setActiveChannel } = useChatContext();
  const classId = params.classId as string;

  const classData = useQuery(api.classes.getClassById, { classId: classId as Id<"classes"> });
  const archiveClass = useMutation(api.classes.archiveClass);
  const [isArchiving, setIsArchiving] = useState(false);
  const [channelReady, setChannelReady] = useState(false);

  useEffect(() => {
    if (classData === null) {
      router.push("/dashboard");
    }
  }, [classData, router]);

  // Load the Stream Chat channel
  useEffect(() => {
    if (!classData || !classData.streamChannelId || !client) return;

    const streamChannelId = classData.streamChannelId;
    let active = true;
    async function loadChannel() {
      try {
        const res = await client.queryChannels(
          { id: { $eq: streamChannelId }, type: "classroom" },
          {},
          { limit: 1 }
        );
        if (res.length > 0 && active) {
          setActiveChannel(res[0] as Channel);
          setChannelReady(true);
        }
      } catch (err) {
        console.error("Failed to load channel:", err);
      }
    }
    loadChannel();
    return () => {
      active = false;
    };
  }, [classData, client, setActiveChannel]);

  const handleStartSession = () => {
    const sessionId = `session_${Date.now()}`;
    router.push(`/class/${classId}/session/${sessionId}`);
  };

  const handleJoinSession = () => {
    toast.info("Joining session...");
  };

  const handleArchiveClass = async () => {
    if (!confirm("Are you sure you want to archive this class? Students will no longer be able to join.")) {
      return;
    }

    setIsArchiving(true);
    try {
      await archiveClass({ classId: classId as Id<"classes"> });
      toast.success("Class archived");
      router.push("/dashboard");
    } catch (err) {
      toast.error("Failed to archive class");
      console.error(err);
    } finally {
      setIsArchiving(false);
    }
  };

  if (classData === undefined) {
    return (
      <div className="flex h-screen">
        <ClassSidebar />
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b border-border">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!classData) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <ClassSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <ClassHeader
          classData={{
            _id: classData._id,
            name: classData.name,
            subject: classData.subject,
            gradeLevel: classData.gradeLevel,
            streamChannelId: classData.streamChannelId,
            joinCode: classData.joinCode,
            teacherId: classData.teacherId,
          }}
          enrollmentCount={0}
          isActiveSession={false}
          onStartSession={handleStartSession}
          onJoinSession={handleJoinSession}
          onArchiveClass={handleArchiveClass}
        />

        <div className="flex-1 overflow-hidden">
          {channelReady ? (
            <ChannelView />
          ) : (
            <div className="h-full flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 bg-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Assignments will appear here in V2
            </p>
            <Button variant="ghost" size="sm" disabled>
              View All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
