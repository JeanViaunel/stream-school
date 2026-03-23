"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, Clock, Users, MessageSquare, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useStreamVideoClient, StreamCall, StreamTheme, SpeakerLayout, useCall, useCallStateHooks, Call } from "@stream-io/video-react-sdk";

interface BreakoutRoomViewProps {
  sessionId: Id<"sessions">;
  onJoinRoom: (streamCallId: string) => void;
  onReturnToMain: () => void;
}

function BreakoutCallUI({ onLeave }: { onLeave: () => void }) {
  const call = useCall();
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();

  if (callingState !== "joined") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Joining breakout room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <StreamTheme className="relative w-full h-full">
        <div className="absolute inset-0 flex items-center justify-center pb-24">
          <SpeakerLayout />
        </div>
      </StreamTheme>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <Button variant="outline" onClick={onLeave}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Leave Room
        </Button>
      </div>
      
      <div className="absolute top-4 right-4">
        <Badge variant="secondary">
          <Users className="mr-1 h-3 w-3" />
          {participants.length} participants
        </Badge>
      </div>
    </div>
  );
}

export function BreakoutRoomView({ sessionId, onJoinRoom, onReturnToMain }: BreakoutRoomViewProps) {
  const videoClient = useStreamVideoClient();
  const myRoom = useQuery(api.breakoutRooms.getMyBreakoutRoom, { sessionId });
  const joinRoom = useMutation(api.breakoutRooms.joinBreakoutRoom);
  const [breakoutCall, setBreakoutCall] = useState<Call | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);

  // Listen for broadcast messages
  useEffect(() => {
    if (!breakoutCall) return;

    const handleCustomEvent = (event: { type: string; custom?: { type?: string; message?: string; senderName?: string } }) => {
      if (event.type === "custom" && event.custom?.type === "broadcast-message" && event.custom?.message) {
        setBroadcastMessage(`${event.custom.senderName}: ${event.custom.message}`);
        toast.info(`Message from ${event.custom.senderName}: ${event.custom.message}`, {
          duration: 5000,
        });
      }
    };

    breakoutCall.on("all", handleCustomEvent);
    return () => {
      breakoutCall.off("all", handleCustomEvent);
    };
  }, [breakoutCall]);

  const handleJoinRoom = async () => {
    if (!myRoom || !videoClient) return;
    
    setIsJoining(true);
    try {
      // Join in Convex
      await joinRoom({ roomId: myRoom.roomId });
      
      // Join Stream call
      const call = videoClient.call("default", myRoom.streamCallId);
      await call.join();
      
      setBreakoutCall(call);
      onJoinRoom(myRoom.streamCallId);
      toast.success(`Joined ${myRoom.name}`);
    } catch (error) {
      toast.error("Failed to join breakout room");
      console.error(error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!breakoutCall) return;
    
    try {
      await breakoutCall.leave();
      setBreakoutCall(null);
    } catch (error) {
      console.error("Failed to leave room:", error);
    }
  };

  // If in a breakout room call, show the call UI
  if (breakoutCall) {
    return (
      <StreamCall call={breakoutCall}>
        <BreakoutCallUI onLeave={handleLeaveRoom} />
      </StreamCall>
    );
  }

  // If no room assigned
  if (myRoom === null) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>No Breakout Room Assigned</CardTitle>
          <CardDescription>
            Wait for your teacher to assign you to a breakout room
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-muted mb-4" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show room assignment with join button
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5" />
          Breakout Room Assigned
        </CardTitle>
        <CardDescription>
          You have been assigned to a breakout room
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center p-6 bg-muted rounded-lg">
          <h3 className="text-2xl font-bold mb-2">{myRoom.name}</h3>
          <Badge variant="secondary">Assigned</Badge>
        </div>

        {broadcastMessage && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-blue-700">Message from Teacher</span>
            </div>
            <p className="text-blue-600">{broadcastMessage}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleJoinRoom}
            disabled={isJoining}
          >
            {isJoining ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <DoorOpen className="mr-2 h-4 w-4" />
                Join Breakout Room
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onReturnToMain}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Stay in Main Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}