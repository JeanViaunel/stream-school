"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  Minus, 
  Shuffle, 
  MessageSquare, 
  DoorOpen, 
  DoorClosed,
  ExternalLink,
  Radio,
  Clock,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";

interface Student {
  userId: string;
  userName: string;
}

interface BreakoutRoomManagerProps {
  sessionId: Id<"sessions">;
  classId: Id<"classes">;
  participants: Student[];
  parentCallId: string;
  onReturnToMain: () => void;
}

export function BreakoutRoomManager({ 
  sessionId, 
  classId,
  participants, 
  parentCallId,
  onReturnToMain 
}: BreakoutRoomManagerProps) {
  const videoClient = useStreamVideoClient();
  const [numRooms, setNumRooms] = useState(2);
  const [assignmentMode, setAssignmentMode] = useState<"manual" | "random">("random");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [selectedRoomToJoin, setSelectedRoomToJoin] = useState<string | null>(null);
  const [activeBreakoutCall, setActiveBreakoutCall] = useState<string | null>(null);
  
  const rooms = useQuery(api.breakoutRooms.getBreakoutRoomsForSession, { sessionId });
  const createRooms = useMutation(api.breakoutRooms.createBreakoutRooms);
  const endRooms = useMutation(api.breakoutRooms.endBreakoutRooms);
  const broadcast = useMutation(api.breakoutRooms.broadcastToBreakoutRooms);
  
  const isActive = rooms && rooms.length > 0 && !rooms.every(r => r.endedAt);
  const activeRooms = rooms?.filter(r => !r.endedAt) || [];

  // Generate room preview
  const generatePreview = useCallback(() => {
    const preview = [];
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const perRoom = Math.ceil(shuffled.length / numRooms);
    
    for (let i = 0; i < numRooms; i++) {
      const roomStudents = shuffled.slice(i * perRoom, (i + 1) * perRoom);
      preview.push({
        roomNumber: i + 1,
        students: roomStudents,
      });
    }
    return preview;
  }, [participants, numRooms]);

  const [previewRooms, setPreviewRooms] = useState(generatePreview());

  useEffect(() => {
    if (!isActive) {
      setPreviewRooms(generatePreview());
    }
  }, [generatePreview, isActive, numRooms, assignmentMode]);

  const startBreakouts = async () => {
    try {
      await createRooms({
        sessionId,
        roomCount: numRooms,
        assignmentType: assignmentMode === "random" ? "auto" : "manual",
      });
      toast.success(`Created ${numRooms} breakout rooms`);
    } catch (error) {
      toast.error("Failed to create breakout rooms");
      console.error(error);
    }
  };

  const endBreakouts = async () => {
    try {
      await endRooms({ sessionId });
      toast.success("All breakout rooms ended");
      if (activeBreakoutCall) {
        setActiveBreakoutCall(null);
      }
    } catch (error) {
      toast.error("Failed to end breakout rooms");
      console.error(error);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    
    try {
      const roomInfo = await broadcast({ 
        sessionId, 
        message: broadcastMessage.trim() 
      });
      
      // Send custom event to each room using the video client
      if (videoClient) {
        for (const room of roomInfo) {
          const call = videoClient.call("default", room.callId);
          await call.sendCustomEvent({
            type: "broadcast-message",
            data: {
              message: broadcastMessage.trim(),
              senderName: "Teacher",
              timestamp: Date.now(),
            },
          });
        }
      }
      
      setBroadcastMessage("");
      toast.success("Message broadcast to all rooms");
    } catch (error) {
      toast.error("Failed to broadcast message");
      console.error(error);
    }
  };

  const joinRoom = async (streamCallId: string) => {
    if (!videoClient) return;
    
    try {
      const call = videoClient.call("default", streamCallId);
      await call.join();
      setActiveBreakoutCall(streamCallId);
      setSelectedRoomToJoin(null);
      toast.success("Joined breakout room");
    } catch (error) {
      toast.error("Failed to join room");
      console.error(error);
    }
  };

  const leaveRoom = async () => {
    if (!videoClient || !activeBreakoutCall) return;
    
    try {
      const call = videoClient.call("default", activeBreakoutCall);
      await call.leave();
      setActiveBreakoutCall(null);
    } catch (error) {
      console.error("Failed to leave room:", error);
    }
  };

  // If in a breakout room, show minimal UI to return
  if (activeBreakoutCall) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-green-500" />
            In Breakout Room
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={leaveRoom}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Leave Room (Stay in Breakouts)
          </Button>
          <Button 
            variant="default" 
            className="w-full"
            onClick={onReturnToMain}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Return to Main Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isActive) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-green-500" />
              Breakout Rooms Active
            </div>
            <Badge variant="default">{activeRooms.length} Rooms</Badge>
          </CardTitle>
          <CardDescription>
            {participants.length} students distributed across {activeRooms.length} rooms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Broadcast Message */}
          <div className="flex gap-2">
            <Input
              placeholder="Broadcast message to all rooms..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBroadcast()}
            />
            <Button 
              variant="outline" 
              onClick={handleBroadcast}
              disabled={!broadcastMessage.trim()}
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              Send
            </Button>
          </div>

          {/* Room List */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {activeRooms.map((room) => (
                <Card key={room.roomId} className="border-muted">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{room.name}</span>
                        <Badge variant="secondary">{room.students.length} students</Badge>
                        {room.students.some(s => s.joinedAt) && (
                          <Badge variant="outline" className="text-green-600">
                            <Clock className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedRoomToJoin(room.streamCallId)}
                      >
                        <ExternalLink className="mr-1 h-4 w-4" />
                        Join
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {room.students.map((student) => (
                        <Badge 
                          key={student.userId} 
                          variant={student.joinedAt ? "default" : "outline"} 
                          className="text-xs"
                        >
                          {student.userId}
                          {student.joinedAt && " ✓"}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <Button 
            variant="destructive" 
            className="w-full"
            onClick={endBreakouts}
          >
            <DoorClosed className="mr-2 h-4 w-4" />
            End All Breakouts
          </Button>
        </CardContent>

        {/* Join Room Dialog */}
        <Dialog open={selectedRoomToJoin !== null} onOpenChange={() => setSelectedRoomToJoin(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join Breakout Room</DialogTitle>
              <DialogDescription>
                You will leave the main room and join this breakout room.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRoomToJoin(null)}>
                Cancel
              </Button>
              <Button onClick={() => selectedRoomToJoin && joinRoom(selectedRoomToJoin)}>
                <DoorOpen className="mr-2 h-4 w-4" />
                Join Room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Breakout Room Manager
        </CardTitle>
        <CardDescription>
          Create breakout rooms for group activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Number of Rooms */}
        <div className="space-y-2">
          <Label>Number of Rooms</Label>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setNumRooms(Math.max(2, numRooms - 1))}
              disabled={numRooms <= 2}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-2xl font-bold w-8 text-center">{numRooms}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setNumRooms(Math.min(8, numRooms + 1))}
              disabled={numRooms >= 8}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Assignment Mode */}
        <div className="space-y-2">
          <Label>Assignment Mode</Label>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={assignmentMode === "random"}
                onCheckedChange={(checked) => setAssignmentMode(checked ? "random" : "manual")}
              />
              <span className="text-sm">
                {assignmentMode === "random" ? "Auto Random" : "Manual Assign"}
              </span>
            </div>
            {assignmentMode === "random" && (
              <Button variant="ghost" size="sm" onClick={() => setPreviewRooms(generatePreview())}>
                <Shuffle className="mr-1 h-4 w-4" />
                Reshuffle
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>Room Preview</Label>
          <ScrollArea className="h-[250px] border rounded-lg p-4">
            <div className="space-y-4">
              {previewRooms.map((room) => (
                <div key={room.roomNumber} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Room {room.roomNumber}</span>
                    <Badge variant="outline">{room.students.length} students</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {room.students.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No students assigned</span>
                    ) : (
                      room.students.map((student) => (
                        <Badge 
                          key={student.userId} 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {student.userName}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Button 
          className="w-full" 
          onClick={startBreakouts}
          disabled={participants.length === 0}
        >
          <DoorOpen className="mr-2 h-4 w-4" />
          Start Breakout Rooms
        </Button>
      </CardContent>
    </Card>
  );
}