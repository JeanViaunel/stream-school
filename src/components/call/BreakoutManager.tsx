"use client";

import { useState, useCallback, useEffect } from "react";
import { useCall, useStreamVideoClient } from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  Plus, 
  Minus, 
  Shuffle, 
  MessageSquare, 
  DoorOpen, 
  DoorClosed,
  ExternalLink,
  Radio
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface Student {
  userId: string;
  userName: string;
}

interface BreakoutRoom {
  roomNumber: number;
  callId: string;
  students: Student[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  call?: any;
}

interface BreakoutManagerProps {
  participants: Student[];
  parentCallId: string;
}

export function BreakoutManager({ participants, parentCallId }: BreakoutManagerProps) {
  const { session } = useAuth();
  const call = useCall();
  const videoClient = useStreamVideoClient();
  
  const [numRooms, setNumRooms] = useState(2);
  const [assignmentMode, setAssignmentMode] = useState<"manual" | "random">("random");
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [selectedRoomToJoin, setSelectedRoomToJoin] = useState<number | null>(null);
  const [studentAssignments, setStudentAssignments] = useState<Map<string, number>>(new Map());

  // Generate room assignments
  const generateAssignments = useCallback(() => {
    const newRooms: BreakoutRoom[] = [];
    const assignments = new Map<string, number>();

    for (let i = 0; i < numRooms; i++) {
      newRooms.push({
        roomNumber: i + 1,
        callId: `${parentCallId}-breakout-${i + 1}`,
        students: [],
      });
    }

    if (assignmentMode === "random") {
      // Shuffle participants and distribute evenly
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      shuffled.forEach((student, index) => {
        const roomIndex = index % numRooms;
        newRooms[roomIndex].students.push(student);
        assignments.set(student.userId, roomIndex);
      });
    }

    setRooms(newRooms);
    setStudentAssignments(assignments);
  }, [participants, numRooms, assignmentMode, parentCallId]);

  // Start breakout rooms
  const startBreakouts = async () => {
    if (!call || !videoClient) return;

    try {
      // Create/join each breakout room
      for (const room of rooms) {
        if (!videoClient) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const breakoutCall = (videoClient as any).call("default", room.callId);
        await breakoutCall.join({ create: true });
        
        // Add the teacher as a member
        if (session) {
          await breakoutCall.updateCallMembers({
            update_members: [{ user_id: session.streamUserId, role: "admin" }],
          });
        }
        
        room.call = breakoutCall;
      }

      // Notify all students of their assignments
      for (const [studentId, roomIndex] of studentAssignments) {
        await call.sendCustomEvent({
          type: "breakout-assigned",
          callId: rooms[roomIndex].callId,
          roomNumber: roomIndex + 1,
          userId: studentId,
        });
      }

      setIsActive(true);
    } catch (error) {
      console.error("Failed to start breakout rooms:", error);
    }
  };

  // End all breakouts
  const endBreakouts = async () => {
    if (!call) return;

    try {
      // Leave each breakout room
      for (const room of rooms) {
        if (room.call) {
          await room.call.leave();
        }
      }

      // Notify all students to return to main room
      await call.sendCustomEvent({
        type: "breakout-ended",
      });

      setIsActive(false);
      setRooms([]);
      setStudentAssignments(new Map());
    } catch (error) {
      console.error("Failed to end breakout rooms:", error);
    }
  };

  // Broadcast message to all rooms
  const broadcastToAll = async () => {
    if (!call || !broadcastMessage.trim()) return;

    try {
      for (const room of rooms) {
        if (room.call) {
          await room.call.sendCustomEvent({
            type: "broadcast-message",
            message: broadcastMessage.trim(),
            from: "teacher",
          });
        }
      }
      setBroadcastMessage("");
    } catch (error) {
      console.error("Failed to broadcast message:", error);
    }
  };

  // Join a specific breakout room
  const joinRoom = async (roomNumber: number) => {
    const room = rooms.find(r => r.roomNumber === roomNumber);
    if (!room || !videoClient) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const breakoutCall = (videoClient as any).call("default", room.callId);
      await breakoutCall.join();
      setSelectedRoomToJoin(null);
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  };

  // Move student to different room (manual mode)
  const moveStudent = (studentId: string, toRoomIndex: number) => {
    if (assignmentMode !== "manual") return;

    setStudentAssignments(prev => {
      const newAssignments = new Map(prev);
      newAssignments.set(studentId, toRoomIndex);
      return newAssignments;
    });

    setRooms(prev => {
      const newRooms = prev.map(room => ({
        ...room,
        students: room.students.filter(s => s.userId !== studentId),
      }));
      
      const student = participants.find(p => p.userId === studentId);
      if (student) {
        newRooms[toRoomIndex].students.push(student);
      }
      
      return newRooms;
    });
  };

  // Update rooms when assignment mode changes
  useEffect(() => {
    if (!isActive) {
      generateAssignments();
    }
  }, [assignmentMode, numRooms, generateAssignments, isActive]);

  if (isActive) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-green-500" />
              Breakout Rooms Active
            </div>
            <Badge variant="default">{rooms.length} Rooms</Badge>
          </CardTitle>
          <CardDescription>
            {participants.length} students distributed across {rooms.length} rooms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Broadcast Message */}
          <div className="flex gap-2">
            <Input
              placeholder="Broadcast message to all rooms..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && broadcastToAll()}
            />
            <Button 
              variant="outline" 
              onClick={broadcastToAll}
              disabled={!broadcastMessage.trim()}
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              Send
            </Button>
          </div>

          {/* Room List */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {rooms.map((room) => (
                <Card key={room.roomNumber} className="border-muted">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Room {room.roomNumber}</span>
                        <Badge variant="secondary">{room.students.length} students</Badge>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedRoomToJoin(room.roomNumber)}
                      >
                        <ExternalLink className="mr-1 h-4 w-4" />
                        Join
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {room.students.map((student) => (
                        <Badge key={student.userId} variant="outline" className="text-xs">
                          {student.userName}
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
              <DialogTitle>Join Room {selectedRoomToJoin}</DialogTitle>
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
              <Button variant="ghost" size="sm" onClick={generateAssignments}>
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
              {rooms.map((room, roomIndex) => (
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
                  {assignmentMode === "manual" && (
                    <Select
                      onValueChange={(value) => {
                        const studentId = participants.find(p => p.userName === value)?.userId;
                        if (studentId) moveStudent(studentId, roomIndex);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Assign student to this room" />
                      </SelectTrigger>
                      <SelectContent>
                        {participants
                          .filter(p => studentAssignments.get(p.userId) !== roomIndex)
                          .map((student) => (
                            <SelectItem key={student.userId} value={student.userName}>
                              {student.userName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Button 
          className="w-full" 
          onClick={startBreakouts}
          disabled={rooms.length === 0}
        >
          <DoorOpen className="mr-2 h-4 w-4" />
          Start Breakout Rooms
        </Button>
      </CardContent>
    </Card>
  );
}
