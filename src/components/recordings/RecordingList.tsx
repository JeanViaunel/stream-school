"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Clock, Calendar, User, Play } from "lucide-react";
import { formatDistanceToNow, formatDuration, intervalToDuration } from "date-fns";
import { useState } from "react";
import { RecordingPlayer } from "./RecordingPlayer";

interface RecordingListProps {
  classId: Id<"classes">;
  isTeacher: boolean;
}

export function RecordingList({ classId, isTeacher }: RecordingListProps) {
  const recordings = useQuery(api.sessions.getClassRecordings, { classId });
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);

  if (recordings === undefined) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground py-8">
            <Video className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No recordings available for this class yet.</p>
            {isTeacher && (
              <p className="text-sm mt-2">
                Start recording during your next session to create recordings.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedRecording) {
    const recording = recordings.find((r) => r.recordingUrl === selectedRecording);
    if (recording) {
      return (
        <RecordingPlayer
          recordingUrl={recording.recordingUrl!}
          title={`Session from ${new Date(recording.startedAt).toLocaleDateString()}`}
          onBack={() => setSelectedRecording(null)}
        />
      );
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Session Recordings</h3>
      <div className="grid gap-4">
        {recordings.map((recording) => (
          <Card key={recording._id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      Session {new Date(recording.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(recording.startedAt, { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {recording.duration
                          ? formatDuration(
                              intervalToDuration({
                                start: 0,
                                end: recording.duration * 1000,
                              }),
                              { format: ["hours", "minutes"] }
                            )
                          : "In progress"}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Hosted by {recording.hostName}</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4"
                  onClick={() => setSelectedRecording(recording.recordingUrl!)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Watch
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
