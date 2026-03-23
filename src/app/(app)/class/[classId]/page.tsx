"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { useChatContext } from "stream-chat-react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import type { Channel } from "stream-chat";
import { ClassSidebar } from "@/components/class/ClassSidebar";
import { ClassHeader } from "@/components/class/ClassHeader";
import { ClassroomTabs } from "@/components/class/ClassroomTabs";
import { ChannelView } from "@/components/chat/ChannelView";
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
  const activeSession = useQuery(api.sessions.getActiveSessionForClass, { classId: classId as Id<"classes"> });
  const archiveClass = useMutation(api.classes.archiveClass);
  const ensureAdminReadOnly = useAction(api.classes.ensureAdminReadOnlyInClassroomChat);
  const teacherForceEndSession = useAction(api.sessions.teacherForceEndSession);
  const [isArchiving, setIsArchiving] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const [enforcedReadOnly, setEnforcedReadOnly] = useState(false);

  useEffect(() => {
    if (classData === null) {
      router.push("/dashboard");
    }
  }, [classData, router]);

  // Server-side enforcement: when an app admin views a classroom, ensure they have
  // read-only Stream Chat permissions for that classroom channel.
  useEffect(() => {
    if (!session || session.role !== "admin") return;
    if (!classData || classData === null) return;
    if (enforcedReadOnly) return;
    void ensureAdminReadOnly({ classId: classData._id }).finally(() => {
      setEnforcedReadOnly(true);
    });
  }, [session, classData, ensureAdminReadOnly, enforcedReadOnly]);

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
    if (!activeSession) return;
    router.push(`/class/${classId}/session/${activeSession.streamCallId}`);
  };

  const handleEndSession = async () => {
    if (!confirm("End the active session for everyone?")) return;
    try {
      await teacherForceEndSession({ classId: classId as Id<"classes"> });
      toast.success("Session ended");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end session");
    }
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
            isArchived: classData.isArchived,
            teacher: classData.teacher
              ? {
                  displayName: classData.teacher.displayName,
                  avatarUrl: classData.teacher.avatarUrl,
                }
              : undefined,
          }}
          enrollmentCount={classData.enrollmentCount}
          isActiveSession={!!activeSession}
          activeSessionId={activeSession?._id}
          onEndSession={handleEndSession}
          onStartSession={handleStartSession}
          onJoinSession={handleJoinSession}
          onArchiveClass={handleArchiveClass}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {channelReady ? (
            <ClassroomTabs
              classId={classData._id}
              teacherId={classData.teacherId}
              chatPanel={<ChannelView />}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
