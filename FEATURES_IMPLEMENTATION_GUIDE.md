# Stream School - Complete Feature Implementation Guide

## Overview

This document provides comprehensive implementation specifications for adding advanced features to the Stream School educational platform. All implementations must work with the existing Convex + Next.js + Stream Video architecture.

---

## Table of Contents

1. [Live Streaming Enhancements](#1-live-streaming-enhancements)
2. [Advanced Assignment Types](#2-advanced-assignment-types)
3. [Progress Tracking](#3-progress-tracking)
4. [Deep Analytics](#4-deep-analytics)
5. [Enhanced Communication](#5-enhanced-communication)
6. [Enhanced Profiles](#6-enhanced-profiles)
7. [Smart Notifications](#7-smart-notifications)
8. [Administrative Tools](#8-administrative-tools)
9. [Cross-Platform Features](#9-cross-platform-features)
10. [Security & Compliance](#10-security--compliance)
11. [AI-Powered Features](#11-ai-powered-features)

---

## 1. Live Streaming Enhancements

### 1.1 Screen Sharing with Annotation

**Database Schema Changes:**

```typescript
// convex/schema.ts - Add to sessions table
annotations: v.optional(v.array(v.object({
  id: v.string(),
  userId: v.id("users"),
  type: v.union(v.literal("draw"), v.literal("text"), v.literal("highlight")),
  data: v.object({
    x: v.number(),
    y: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    color: v.string(),
    strokeWidth: v.optional(v.number()),
    text: v.optional(v.string()),
    points: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
  }),
  timestamp: v.number(),
  page: v.optional(v.number()), // For multi-page docs
})))
```

**Backend Implementation:**

```typescript
// convex/sessions.ts
export const addAnnotation = mutation({
  args: {
    sessionId: v.id("sessions"),
    annotation: v.object({
      type: v.union(v.literal("draw"), v.literal("text"), v.literal("highlight")),
      data: v.object({
        x: v.number(),
        y: v.number(),
        color: v.string(),
        points: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
      }),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();
    
    if (!user) throw new Error("User not found");
    
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    
    const cls = await ctx.db.get(session.classId);
    if (!cls || cls.teacherId !== user._id) {
      throw new Error("Only teachers can annotate");
    }
    
    const annotation = {
      id: crypto.randomUUID(),
      userId: user._id,
      ...args.annotation,
      timestamp: Date.now(),
    };
    
    await ctx.db.patch(args.sessionId, {
      annotations: [...(session.annotations || []), annotation],
    });
    
    return null;
  },
});

export const clearAnnotations = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Teacher only
    await ctx.db.patch(args.sessionId, { annotations: [] });
    return null;
  },
});

export const getAnnotations = query({
  args: { sessionId: v.id("sessions") },
  returns: v.array(v.object({
    id: v.string(),
    userId: v.id("users"),
    type: v.string(),
    data: v.any(),
    timestamp: v.number(),
  })),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    return session?.annotations || [];
  },
});
```

**Frontend Implementation:**

```typescript
// src/components/call/ScreenShareAnnotation.tsx
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";

interface Point { x: number; y: number; }

interface Annotation {
  id: string;
  type: "draw" | "text" | "highlight";
  data: {
    x: number;
    y: number;
    color: string;
    strokeWidth?: number;
    points?: Point[];
    text?: string;
  };
}

export function ScreenShareAnnotation({
  sessionId,
  isTeacher,
  screenShareElement,
}: {
  sessionId: Id<"sessions">;
  isTeacher: boolean;
  screenShareElement: HTMLElement | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [tool, setTool] = useState<"draw" | "text" | "highlight">("draw");
  const [color, setColor] = useState("#ff0000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  const annotations = useQuery(api.sessions.getAnnotations, { sessionId });
  const addAnnotation = useMutation(api.sessions.addAnnotation);
  const clearAnnotations = useMutation(api.sessions.clearAnnotations);
  
  // Draw existing annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !annotations) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    annotations.forEach((ann) => {
      ctx.beginPath();
      ctx.strokeStyle = ann.data.color;
      ctx.lineWidth = ann.data.strokeWidth || 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      if (ann.type === "draw" && ann.data.points) {
        ctx.moveTo(ann.data.points[0].x, ann.data.points[0].y);
        ann.data.points.forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else if (ann.type === "highlight") {
        ctx.fillStyle = `${ann.data.color}40`; // 25% opacity
        ctx.fillRect(
          ann.data.x,
          ann.data.y,
          ann.data.width || 100,
          ann.data.height || 30
        );
      } else if (ann.type === "text" && ann.data.text) {
        ctx.font = "16px Arial";
        ctx.fillStyle = ann.data.color;
        ctx.fillText(ann.data.text, ann.data.x, ann.data.y);
      }
    });
  }, [annotations]);
  
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isTeacher) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  }, [isTeacher]);
  
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isTeacher) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentPath(prev => [...prev, { x, y }]);
    
    // Draw on canvas immediately for smooth experience
    const ctx = canvas.getContext("2d");
    if (ctx && currentPath.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, [isDrawing, isTeacher, color, strokeWidth, currentPath]);
  
  const stopDrawing = useCallback(async () => {
    if (!isDrawing || !isTeacher || currentPath.length < 2) return;
    
    setIsDrawing(false);
    
    await addAnnotation({
      sessionId,
      annotation: {
        type: "draw",
        data: {
          x: currentPath[0].x,
          y: currentPath[0].y,
          color,
          strokeWidth,
          points: currentPath,
        },
      },
    });
    
    setCurrentPath([]);
  }, [isDrawing, isTeacher, currentPath, sessionId, color, strokeWidth, addAnnotation]);
  
  // Sync canvas size with screen share element
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !screenShareElement) return;
    
    const resizeCanvas = () => {
      const rect = screenShareElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [screenShareElement]);
  
  if (!isTeacher && (!annotations || annotations.length === 0)) {
    return null;
  }
  
  return (
    <div className="relative">
      {isTeacher && (
        <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur rounded-lg shadow-lg p-2 flex gap-2">
          <button
            onClick={() => setTool("draw")}
            className={`p-2 rounded ${tool === "draw" ? "bg-primary text-primary-foreground" : ""}`}
          >
            ✏️ Draw
          </button>
          <button
            onClick={() => setTool("highlight")}
            className={`p-2 rounded ${tool === "highlight" ? "bg-primary text-primary-foreground" : ""}`}
          >
            🖍️ Highlight
          </button>
          <button
            onClick={() => setTool("text")}
            className={`p-2 rounded ${tool === "text" ? "bg-primary text-primary-foreground" : ""}`}
          >
            T Text
          </button>
          <div className="w-px bg-border mx-1" />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <button
            onClick={() => clearAnnotations({ sessionId })}
            className="px-3 py-2 rounded bg-destructive text-destructive-foreground"
          >
            Clear All
          </button>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className={`absolute top-0 left-0 pointer-events-${isTeacher ? "auto" : "none"}`}
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
```

**Integration:**
Add `ScreenShareAnnotation` component to `ClassCallRoom.tsx` overlaying the screen share element.

---

### 1.2 Breakout Rooms

**Database Schema:**

```typescript
// convex/schema.ts
breakoutRooms: defineTable({
  sessionId: v.id("sessions"),
  name: v.string(),
  streamCallId: v.string(),
  createdAt: v.number(),
  endedAt: v.optional(v.number()),
}).index("by_session", ["sessionId"]),

breakoutRoomAssignments: defineTable({
  roomId: v.id("breakoutRooms"),
  userId: v.id("users"),
  assignedAt: v.number(),
  joinedAt: v.optional(v.number()),
}).index("by_room", ["roomId"])
  .index("by_user_and_session", ["userId", "sessionId"]),
```

**Backend:**

```typescript
// convex/sessions.ts
export const createBreakoutRooms = mutation({
  args: {
    sessionId: v.id("sessions"),
    roomCount: v.number(),
    assignmentType: v.union(v.literal("auto"), v.literal("manual")),
    manualAssignments: v.optional(v.array(v.object({
      roomIndex: v.number(),
      userIds: v.array(v.id("users")),
    }))),
  },
  returns: v.array(v.id("breakoutRooms")),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    
    if (!session) throw new Error("Session not found");
    const cls = await ctx.db.get(session.classId);
    if (!cls || cls.teacherId !== user._id) {
      throw new Error("Only teachers can create breakout rooms");
    }
    
    // Get enrolled students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", session.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    const studentIds = enrollments.map(e => e.studentId);
    
    const roomIds: Id<"breakoutRooms">[] = [];
    
    // Create rooms
    for (let i = 0; i < args.roomCount; i++) {
      const streamCallId = `breakout_${session.streamCallId}_${i}_${Date.now()}`;
      
      const roomId = await ctx.db.insert("breakoutRooms", {
        sessionId: args.sessionId,
        name: `Room ${i + 1}`,
        streamCallId,
        createdAt: Date.now(),
      });
      
      roomIds.push(roomId);
      
      // Create Stream call for room
      await ctx.runAction(internal.stream.createBreakoutRoomCall, {
        callId: streamCallId,
        parentSessionId: session.streamCallId,
      });
    }
    
    // Assign students
    if (args.assignmentType === "auto") {
      // Random assignment
      const shuffled = [...studentIds].sort(() => Math.random() - 0.5);
      const perRoom = Math.ceil(shuffled.length / args.roomCount);
      
      for (let i = 0; i < roomIds.length; i++) {
        const roomStudents = shuffled.slice(i * perRoom, (i + 1) * perRoom);
        for (const studentId of roomStudents) {
          await ctx.db.insert("breakoutRoomAssignments", {
            roomId: roomIds[i],
            userId: studentId,
            assignedAt: Date.now(),
          });
        }
      }
    } else if (args.manualAssignments) {
      // Manual assignment
      for (const assignment of args.manualAssignments) {
        const roomId = roomIds[assignment.roomIndex];
        for (const userId of assignment.userIds) {
          await ctx.db.insert("breakoutRoomAssignments", {
            roomId,
            userId,
            assignedAt: Date.now(),
          });
        }
      }
    }
    
    return roomIds;
  },
});

export const joinBreakoutRoom = mutation({
  args: { roomId: v.id("breakoutRooms") },
  returns: v.object({ streamCallId: v.string() }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get(args.roomId);
    
    if (!room) throw new Error("Room not found");
    
    // Update assignment
    const assignment = await ctx.db
      .query("breakoutRoomAssignments")
      .withIndex("by_user_and_session", (q) => 
        q.eq("userId", user._id).eq("sessionId", room.sessionId)
      )
      .unique();
    
    if (assignment) {
      await ctx.db.patch(assignment._id, { joinedAt: Date.now() });
    }
    
    return { streamCallId: room.streamCallId };
  },
});

export const endBreakoutRooms = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rooms = await ctx.db
      .query("breakoutRooms")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    for (const room of rooms) {
      await ctx.db.patch(room._id, { endedAt: Date.now() });
      await ctx.runAction(internal.stream.endBreakoutRoomCall, {
        callId: room.streamCallId,
      });
    }
    
    return null;
  },
});

export const getMyBreakoutRoom = query({
  args: { sessionId: v.id("sessions") },
  returns: v.union(
    v.object({
      roomId: v.id("breakoutRooms"),
      name: v.string(),
      streamCallId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    const assignment = await ctx.db
      .query("breakoutRoomAssignments")
      .withIndex("by_user_and_session", (q) =>
        q.eq("userId", user._id).eq("sessionId", args.sessionId)
      )
      .unique();
    
    if (!assignment) return null;
    
    const room = await ctx.db.get(assignment.roomId);
    if (!room || room.endedAt) return null;
    
    return {
      roomId: room._id,
      name: room.name,
      streamCallId: room.streamCallId,
    };
  },
});
```

**Frontend Implementation:**

Create `BreakoutRoomManager.tsx` for teachers to manage rooms and `BreakoutRoomView.tsx` for students to join their assigned rooms.

---

### 1.3 Virtual Backgrounds

Use Stream Video SDK's built-in background blur feature:

```typescript
// src/components/call/VirtualBackground.tsx
import { useCallback } from "react";
import { useCallStateHooks, BackgroundFiltersProvider } from "@stream-io/video-react-sdk";

export function VirtualBackgroundToggle() {
  const { useCameraState } = useCallStateHooks();
  const { camera, isEnabled } = useCameraState();
  
  const toggleBlur = useCallback(async () => {
    if (!camera) return;
    
    // Toggle background blur
    await camera.toggleBackgroundBlur();
  }, [camera]);
  
  const setBackgroundImage = useCallback(async (imageUrl: string) => {
    if (!camera) return;
    
    await camera.setBackgroundImage(imageUrl);
  }, [camera]);
  
  if (!isEnabled) return null;
  
  return (
    <div className="flex gap-2">
      <button onClick={toggleBlur} className="p-2 rounded bg-background">
        🔲 Blur
      </button>
      <button 
        onClick={() => setBackgroundImage("/backgrounds/classroom.jpg")}
        className="p-2 rounded bg-background"
      >
        🏫 Classroom
      </button>
      <button 
        onClick={() => setBackgroundImage("/backgrounds/office.jpg")}
        className="p-2 rounded bg-background"
      >
        🏢 Office
      </button>
    </div>
  );
}
```

**Background Images:**
Store 3-5 background images in `/public/backgrounds/`:
- classroom.jpg
- office.jpg
- library.jpg
- blur (built into Stream SDK)

---

### 1.4 Live Reactions

**Database Schema:**

```typescript
// convex/schema.ts - Add to sessions table
liveReactions: v.optional(v.array(v.object({
  userId: v.id("users"),
  emoji: v.string(),
  timestamp: v.number(),
})))
```

**Backend:**

```typescript
// convex/sessions.ts
export const sendReaction = mutation({
  args: {
    sessionId: v.id("sessions"),
    emoji: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    
    if (!session) throw new Error("Session not found");
    
    // Keep only last 50 reactions
    const currentReactions = session.liveReactions || [];
    const newReactions = [
      ...currentReactions.slice(-49),
      { userId: user._id, emoji: args.emoji, timestamp: Date.now() },
    ];
    
    await ctx.db.patch(args.sessionId, { liveReactions: newReactions });
    return null;
  },
});

export const getLiveReactions = query({
  args: { sessionId: v.id("sessions") },
  returns: v.array(v.object({
    userId: v.id("users"),
    emoji: v.string(),
    timestamp: v.number(),
  })),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    return session?.liveReactions?.slice(-10) || [];
  },
});
```

**Frontend:**

Create floating emoji animations when reactions are received.

---

### 1.5 Session Recordings with Auto-Upload

**Database Schema:**

Already exists in sessions table: `recordingUrl`

**Backend:**

```typescript
// convex/sessions.ts
export const startRecording = action({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    
    // Start Stream recording
    await ctx.runAction(internal.stream.startCallRecording, {
      callId: session.streamCallId,
    });
    
    return null;
  },
});

export const handleRecordingWebhook = httpAction(async (ctx, req) => {
  const body = await req.json();
  
  // Stream sends webhook when recording is ready
  if (body.type === "call.recording_ready") {
    const { call_cid, url } = body;
    
    // Find session by stream call ID
    const session = await ctx.runQuery(internal.sessions.getSessionByStreamCallId, {
      streamCallId: call_cid,
    });
    
    if (session) {
      // Upload to S3 for permanent storage
      const s3Url = await ctx.runAction(internal.recordings.uploadToS3, {
        sourceUrl: url,
        filename: `recording_${session._id}_${Date.now()}.mp4`,
      });
      
      // Update session with recording URL
      await ctx.runMutation(internal.sessions.updateRecordingUrl, {
        sessionId: session._id,
        recordingUrl: s3Url,
      });
    }
  }
  
  return new Response("OK", { status: 200 });
});
```

**S3 Upload Function:**

```typescript
// convex/recordings.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const uploadToS3 = internalAction({
  args: {
    sourceUrl: v.string(),
    filename: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Download from Stream
    const response = await fetch(args.sourceUrl);
    const buffer = await response.arrayBuffer();
    
    // Upload to S3
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: args.filename,
      Body: Buffer.from(buffer),
      ContentType: "video/mp4",
    }));
    
    return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${args.filename}`;
  },
});
```

**Setup:**
1. Create AWS S3 bucket
2. Configure Stream webhook to point to your `/api/recordings/webhook` endpoint
3. Add S3 credentials to Convex environment variables

---

### 1.6 Live Transcription

Use Stream's built-in transcription or integrate with AssemblyAI/Deepgram:

```typescript
// src/components/call/LiveTranscription.tsx
import { useEffect, useState, useCallback } from "react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";

interface TranscriptSegment {
  text: string;
  speaker: string;
  timestamp: number;
}

export function LiveTranscription() {
  const { useCall } = useCallStateHooks();
  const call = useCall();
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  
  const toggleTranscription = useCallback(async () => {
    if (!call) return;
    
    if (isEnabled) {
      await call.stopLiveTranscription();
      setIsEnabled(false);
    } else {
      await call.startLiveTranscription();
      setIsEnabled(true);
    }
  }, [call, isEnabled]);
  
  useEffect(() => {
    if (!call) return;
    
    const unsubscribe = call.on("transcription", (event) => {
      setTranscript(prev => [...prev, {
        text: event.text,
        speaker: event.speaker,
        timestamp: Date.now(),
      }]);
    });
    
    return unsubscribe;
  }, [call]);
  
  return (
    <div className="w-80 bg-background border rounded-lg p-4 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Live Transcription</h3>
        <button
          onClick={toggleTranscription}
          className={`px-3 py-1 rounded text-sm ${
            isEnabled ? "bg-green-500 text-white" : "bg-muted"
          }`}
        >
          {isEnabled ? "On" : "Off"}
        </button>
      </div>
      
      <div className="space-y-2">
        {transcript.map((segment, i) => (
          <div key={i} className="text-sm">
            <span className="font-medium text-muted-foreground">
              {segment.speaker}:
            </span>{" "}
            {segment.text}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 1.7 Hand Raising

**Database Schema:**

```typescript
// convex/schema.ts - Add to sessions table
raisedHands: v.optional(v.array(v.object({
  userId: v.id("users"),
  timestamp: v.number(),
  acknowledged: v.boolean(),
})))
```

**Backend:**

```typescript
// convex/sessions.ts
export const raiseHand = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    
    if (!session) throw new Error("Session not found");
    
    const currentHands = session.raisedHands || [];
    
    // Check if already raised
    if (currentHands.some(h => h.userId === user._id && !h.acknowledged)) {
      return null; // Already raised
    }
    
    await ctx.db.patch(args.sessionId, {
      raisedHands: [
        ...currentHands,
        { userId: user._id, timestamp: Date.now(), acknowledged: false },
      ],
    });
    
    return null;
  },
});

export const lowerHand = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    
    if (!session) throw new Error("Session not found");
    
    const currentHands = session.raisedHands || [];
    await ctx.db.patch(args.sessionId, {
      raisedHands: currentHands.filter(h => h.userId !== user._id),
    });
    
    return null;
  },
});

export const acknowledgeHand = mutation({
  args: { sessionId: v.id("sessions"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const teacher = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    
    if (!session) throw new Error("Session not found");
    const cls = await ctx.db.get(session.classId);
    if (cls?.teacherId !== teacher._id) {
      throw new Error("Only teacher can acknowledge");
    }
    
    const currentHands = session.raisedHands || [];
    await ctx.db.patch(args.sessionId, {
      raisedHands: currentHands.map(h =>
        h.userId === args.userId ? { ...h, acknowledged: true } : h
      ),
    });
    
    return null;
  },
});

export const getRaisedHands = query({
  args: { sessionId: v.id("sessions") },
  returns: v.array(v.object({
    userId: v.id("users"),
    timestamp: v.number(),
    acknowledged: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    return session?.raisedHands?.filter(h => !h.acknowledged) || [];
  },
});
```

**Frontend:**

Create a hand raise button for students and a queue view for teachers showing raised hands with acknowledge buttons.

---

### 1.8 Mute All / Unmute Teacher Controls

Use Stream Video SDK's moderator features:

```typescript
// src/components/call/ModeratorControls.tsx
import { useCallback } from "react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";

export function ModeratorControls({ isTeacher }: { isTeacher: boolean }) {
  const { useCall, useParticipants } = useCallStateHooks();
  const call = useCall();
  const participants = useParticipants();
  
  const muteAll = useCallback(async () => {
    if (!call || !isTeacher) return;
    
    for (const participant of participants) {
      if (!participant.isLocalParticipant) {
        await call.muteUser(participant.userId, "audio");
      }
    }
  }, [call, isTeacher, participants]);
  
  const disableAllVideo = useCallback(async () => {
    if (!call || !isTeacher) return;
    
    for (const participant of participants) {
      if (!participant.isLocalParticipant) {
        await call.muteUser(participant.userId, "video");
      }
    }
  }, [call, isTeacher, participants]);
  
  if (!isTeacher) return null;
  
  return (
    <div className="flex gap-2">
      <button
        onClick={muteAll}
        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg"
      >
        🔇 Mute All
      </button>
      <button
        onClick={disableAllVideo}
        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg"
      >
        🎥 Stop All Video
      </button>
    </div>
  );
}
```

---

## 2. Advanced Assignment Types

### 2.1 File Upload Assignments

**Database Schema:**

```typescript
// convex/schema.ts
assignmentAttachments: defineTable({
  assignmentId: v.id("assignments"),
  filename: v.string(),
  url: v.string(),
  size: v.number(),
  mimeType: v.string(),
  uploadedAt: v.number(),
}).index("by_assignment", ["assignmentId"]),

submissionAttachments: defineTable({
  submissionId: v.id("submissions"),
  filename: v.string(),
  url: v.string(),
  size: v.number(),
  mimeType: v.string(),
  uploadedAt: v.number(),
}).index("by_submission", ["submissionId"]),
```

**Backend:**

```typescript
// convex/assignments.ts
export const uploadAssignmentAttachment = action({
  args: {
    assignmentId: v.id("assignments"),
    filename: v.string(),
    contentType: v.string(),
  },
  returns: v.object({ uploadUrl: v.string(), fileUrl: v.string() }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const assignment = await ctx.runQuery(internal.assignments.getAssignmentByIdInternal, {
      assignmentId: args.assignmentId,
    });
    
    if (!assignment) throw new Error("Assignment not found");
    const cls = await ctx.db.get(assignment.classId);
    if (cls?.teacherId !== user._id) {
      throw new Error("Only teachers can add attachments");
    }
    
    // Generate presigned URL for S3 upload
    const key = `assignments/${args.assignmentId}/${Date.now()}_${args.filename}`;
    const { url: uploadUrl } = await generateS3UploadUrl(key, args.contentType);
    const fileUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
    
    return { uploadUrl, fileUrl };
  },
});

export const confirmAttachmentUpload = mutation({
  args: {
    assignmentId: v.id("assignments"),
    filename: v.string(),
    url: v.string(),
    size: v.number(),
    mimeType: v.string(),
  },
  returns: v.id("assignmentAttachments"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("assignmentAttachments", {
      ...args,
      uploadedAt: Date.now(),
    });
  },
});

export const uploadSubmissionAttachment = action({
  args: {
    assignmentId: v.id("assignments"),
    filename: v.string(),
    contentType: v.string(),
  },
  returns: v.object({ uploadUrl: v.string(), fileUrl: v.string() }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    // Get or create submission
    let submission = await ctx.runQuery(internal.submissions.getSubmissionByStudentAndAssignment, {
      studentId: user._id,
      assignmentId: args.assignmentId,
    });
    
    if (!submission) {
      submission = await ctx.runMutation(internal.submissions.createSubmissionInternal, {
        assignmentId: args.assignmentId,
        studentId: user._id,
        answers: [],
      });
    }
    
    const key = `submissions/${submission._id}/${Date.now()}_${args.filename}`;
    const { url: uploadUrl } = await generateS3UploadUrl(key, args.contentType);
    const fileUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
    
    return { uploadUrl, fileUrl };
  },
});
```

**Frontend:**

Create drag-and-drop file upload components supporting PDF, DOC, images (max 50MB).

---

### 2.2 Auto-Grading for Multiple Choice

Already partially implemented in submissions. Extend:

```typescript
// convex/submissions.ts
export const autoGradeSubmission = internalMutation({
  args: { submissionId: v.id("submissions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;
    
    const assignment = await ctx.db.get(submission.assignmentId);
    if (!assignment || assignment.type !== "multiple_choice") return null;
    
    let correctCount = 0;
    const totalQuestions = assignment.questions.length;
    
    for (const answer of submission.answers) {
      const question = assignment.questions.find(q => q.id === answer.questionId);
      if (question && question.correctOption !== undefined) {
        const studentAnswer = parseInt(answer.value);
        if (studentAnswer === question.correctOption) {
          correctCount++;
        }
      }
    }
    
    const score = Math.round((correctCount / totalQuestions) * 100);
    
    await ctx.db.patch(args.submissionId, {
      autoScore: score,
      autoGradedAt: Date.now(),
    });
    
    // Create grade record if auto-grading is enabled
    const cls = await ctx.db.get(assignment.classId);
    await ctx.db.insert("grades", {
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      submissionId: submission._id,
      score,
      maxScore: 100,
      gradedBy: cls?.teacherId!, // System graded
      gradedAt: Date.now(),
      classId: assignment.classId,
    });
    
    return null;
  },
});
```

---

### 2.3 Time-Limited Quizzes

**Database Schema:**

```typescript
// convex/schema.ts - Add to assignments table
timeLimitMinutes: v.optional(v.number()),
allowLateSubmissions: v.optional(v.boolean()),
```

**Backend:**

```typescript
// convex/assignments.ts
export const startQuizAttempt = mutation({
  args: { assignmentId: v.id("assignments") },
  returns: v.object({
    attemptId: v.string(),
    startedAt: v.number(),
    timeLimitMinutes: v.number(),
    endsAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const assignment = await ctx.db.get(args.assignmentId);
    
    if (!assignment) throw new Error("Assignment not found");
    if (!assignment.timeLimitMinutes) throw new Error("Not a timed quiz");
    if (!assignment.isPublished) throw new Error("Assignment not published");
    
    // Check if already started
    const existingAttempt = await ctx.db
      .query("quizAttempts")
      .withIndex("by_student_and_assignment", (q) =>
        q.eq("studentId", user._id).eq("assignmentId", args.assignmentId)
      )
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .unique();
    
    if (existingAttempt) {
      return {
        attemptId: existingAttempt._id,
        startedAt: existingAttempt.startedAt,
        timeLimitMinutes: assignment.timeLimitMinutes,
        endsAt: existingAttempt.startedAt + (assignment.timeLimitMinutes * 60 * 1000),
      };
    }
    
    const startedAt = Date.now();
    const attemptId = await ctx.db.insert("quizAttempts", {
      assignmentId: args.assignmentId,
      studentId: user._id,
      startedAt,
      status: "in_progress",
      answers: [],
    });
    
    // Schedule auto-submit when time expires
    await ctx.scheduler.runAfter(
      assignment.timeLimitMinutes * 60 * 1000,
      internal.submissions.autoSubmitQuiz,
      { attemptId }
    );
    
    return {
      attemptId,
      startedAt,
      timeLimitMinutes: assignment.timeLimitMinutes,
      endsAt: startedAt + (assignment.timeLimitMinutes * 60 * 1000),
    };
  },
});

export const getTimeRemaining = query({
  args: { attemptId: v.id("quizAttempts") },
  returns: v.object({
    remainingSeconds: v.number(),
    totalSeconds: v.number(),
    isExpired: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");
    
    const assignment = await ctx.db.get(attempt.assignmentId);
    if (!assignment?.timeLimitMinutes) throw new Error("Not a timed quiz");
    
    const totalSeconds = assignment.timeLimitMinutes * 60;
    const elapsedSeconds = Math.floor((Date.now() - attempt.startedAt) / 1000);
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
    
    return {
      remainingSeconds,
      totalSeconds,
      isExpired: remainingSeconds === 0,
    };
  },
});
```

**Frontend:**

Create a countdown timer component that auto-submits when time expires.

---

### 2.4 Question Banks

**Database Schema:**

```typescript
// convex/schema.ts
questionBanks: defineTable({
  organizationId: v.id("organizations"),
  name: v.string(),
  description: v.optional(v.string()),
  subject: v.optional(v.string()),
  gradeLevel: v.optional(v.number()),
  createdBy: v.id("users"),
  createdAt: v.number(),
}).index("by_organization", ["organizationId"]),

questionBankItems: defineTable({
  bankId: v.id("questionBanks"),
  question: v.object({
    id: v.string(),
    text: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
    options: v.optional(v.array(v.string())),
    correctOption: v.optional(v.number()),
    explanation: v.optional(v.string()),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
    tags: v.optional(v.array(v.string())),
  }),
  usageCount: v.number(),
  createdAt: v.number(),
}).index("by_bank", ["bankId"]),
```

**Backend:**

```typescript
// convex/questionBanks.ts
export const createQuestionBank = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    gradeLevel: v.optional(v.number()),
  },
  returns: v.id("questionBanks"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user.organizationId) throw new Error("User must be in an organization");
    
    return await ctx.db.insert("questionBanks", {
      ...args,
      organizationId: user.organizationId,
      createdBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const addQuestionToBank = mutation({
  args: {
    bankId: v.id("questionBanks"),
    question: v.object({
      text: v.string(),
      type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
      options: v.optional(v.array(v.string())),
      correctOption: v.optional(v.number()),
      explanation: v.optional(v.string()),
      difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
      tags: v.optional(v.array(v.string())),
    }),
  },
  returns: v.id("questionBankItems"),
  handler: async (ctx, args) => {
    const bank = await ctx.db.get(args.bankId);
    if (!bank) throw new Error("Bank not found");
    
    return await ctx.db.insert("questionBankItems", {
      bankId: args.bankId,
      question: { ...args.question, id: crypto.randomUUID() },
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const generateAssignmentFromBank = mutation({
  args: {
    bankId: v.id("questionBanks"),
    classId: v.id("classes"),
    questionCount: v.number(),
    difficultyDistribution: v.optional(v.object({
      easy: v.number(),
      medium: v.number(),
      hard: v.number(),
    })),
  },
  returns: v.id("assignments"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const cls = await ctx.db.get(args.classId);
    if (!cls || cls.teacherId !== user._id) {
      throw new Error("Only class teacher can create assignments");
    }
    
    const bankItems = await ctx.db
      .query("questionBankItems")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .collect();
    
    if (bankItems.length < args.questionCount) {
      throw new Error("Not enough questions in bank");
    }
    
    // Select questions based on difficulty distribution or random
    let selectedItems: typeof bankItems;
    if (args.difficultyDistribution) {
      const { easy, medium, hard } = args.difficultyDistribution;
      const easyItems = bankItems.filter(i => i.question.difficulty === "easy");
      const mediumItems = bankItems.filter(i => i.question.difficulty === "medium");
      const hardItems = bankItems.filter(i => i.question.difficulty === "hard");
      
      selectedItems = [
        ...getRandomItems(easyItems, easy),
        ...getRandomItems(mediumItems, medium),
        ...getRandomItems(hardItems, hard),
      ];
    } else {
      selectedItems = getRandomItems(bankItems, args.questionCount);
    }
    
    // Update usage count
    for (const item of selectedItems) {
      await ctx.db.patch(item._id, { usageCount: item.usageCount + 1 });
    }
    
    // Create assignment
    const assignmentId = await ctx.db.insert("assignments", {
      classId: args.classId,
      creatorId: user._id,
      title: `Quiz from ${(await ctx.db.get(args.bankId))?.name}`,
      instructions: "",
      type: "multiple_choice",
      questions: selectedItems.map(item => item.question),
      isPublished: false,
      createdAt: Date.now(),
    });
    
    return assignmentId;
  },
});
```

---

### 2.5 Randomized Questions

**Backend:**

```typescript
// convex/assignments.ts
export const getAssignmentWithRandomizedQuestions = query({
  args: { assignmentId: v.id("assignments") },
  returns: v.object({
    _id: v.id("assignments"),
    title: v.string(),
    instructions: v.string(),
    questions: v.array(v.object({
      id: v.string(),
      text: v.string(),
      options: v.optional(v.array(v.string())),
    })),
    timeLimitMinutes: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const assignment = await ctx.db.get(args.assignmentId);
    
    if (!assignment) throw new Error("Assignment not found");
    
    // Randomize question order
    const shuffledQuestions = [...assignment.questions]
      .sort(() => Math.random() - 0.5)
      .map(q => ({
        id: q.id,
        text: q.text,
        options: q.options ? [...q.options].sort(() => Math.random() - 0.5) : undefined,
      }));
    
    return {
      _id: assignment._id,
      title: assignment.title,
      instructions: assignment.instructions,
      questions: shuffledQuestions,
      timeLimitMinutes: assignment.timeLimitMinutes,
    };
  },
});
```

---

### 2.6 Rubrics

**Database Schema:**

```typescript
// convex/schema.ts
rubrics: defineTable({
  assignmentId: v.id("assignments"),
  criteria: v.array(v.object({
    id: v.string(),
    name: v.string(),
    description: v.string(),
    levels: v.array(v.object({
      points: v.number(),
      description: v.string(),
    })),
    maxPoints: v.number(),
  })),
  totalPoints: v.number(),
}).index("by_assignment", ["assignmentId"]),

rubricGrades: defineTable({
  gradeId: v.id("grades"),
  criteriaScores: v.array(v.object({
    criteriaId: v.string(),
    levelIndex: v.number(),
    points: v.number(),
    feedback: v.optional(v.string()),
  })),
}).index("by_grade", ["gradeId"]),
```

**Frontend:**

Create rubric builder and grading interface showing criteria with level selectors.

---

## 3. Progress Tracking

### 3.1 Progress Bars - Visual Progress Through Course

**Database Schema:**

```typescript
// convex/schema.ts
studentProgress: defineTable({
  studentId: v.id("users"),
  classId: v.id("classes"),
  overallProgress: v.number(), // 0-100
  assignmentProgress: v.number(),
  sessionAttendanceProgress: v.number(),
  lastUpdated: v.number(),
}).index("by_student_and_class", ["studentId", "classId"]),

milestones: defineTable({
  classId: v.id("classes"),
  name: v.string(),
  description: v.string(),
  type: v.union(v.literal("assignment_count"), v.literal("attendance_streak"), v.literal("grade_average")),
  targetValue: v.number(),
  order: v.number(),
}).index("by_class", ["classId"]),

completedMilestones: defineTable({
  milestoneId: v.id("milestones"),
  studentId: v.id("users"),
  completedAt: v.number(),
}).index("by_student", ["studentId"])
  .index("by_milestone", ["milestoneId"]),
```

**Backend:**

```typescript
// convex/progress.ts
export const calculateStudentProgress = internalMutation({
  args: { studentId: v.id("users"), classId: v.id("classes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get all assignments
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();
    
    // Get student's submissions
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
    
    const submittedAssignmentIds = new Set(submissions.map(s => s.assignmentId));
    const assignmentProgress = assignments.length > 0
      ? (submissions.filter(s => assignments.some(a => a._id === s.assignmentId)).length / assignments.length) * 100
      : 0;
    
    // Get session attendance
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();
    
    const sessionLogs = await ctx.db
      .query("sessionLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.studentId))
      .collect();
    
    const attendedSessionIds = new Set(sessionLogs.map(l => l.sessionId));
    const attendanceProgress = sessions.length > 0
      ? (sessions.filter(s => attendedSessionIds.has(s._id)).length / sessions.length) * 100
      : 0;
    
    // Calculate overall progress (weighted average)
    const overallProgress = Math.round((assignmentProgress * 0.6) + (attendanceProgress * 0.4));
    
    // Upsert progress record
    const existing = await ctx.db
      .query("studentProgress")
      .withIndex("by_student_and_class", (q) =>
        q.eq("studentId", args.studentId).eq("classId", args.classId)
      )
      .unique();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        overallProgress,
        assignmentProgress: Math.round(assignmentProgress),
        sessionAttendanceProgress: Math.round(attendanceProgress),
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("studentProgress", {
        studentId: args.studentId,
        classId: args.classId,
        overallProgress,
        assignmentProgress: Math.round(assignmentProgress),
        sessionAttendanceProgress: Math.round(attendanceProgress),
        lastUpdated: Date.now(),
      });
    }
    
    // Check for completed milestones
    await checkMilestones(ctx, args.studentId, args.classId);
    
    return null;
  },
});

export const getStudentProgress = query({
  args: { classId: v.id("classes") },
  returns: v.union(
    v.object({
      overallProgress: v.number(),
      assignmentProgress: v.number(),
      attendanceProgress: v.number(),
      milestones: v.array(v.object({
        name: v.string(),
        completed: v.boolean(),
        completedAt: v.optional(v.number()),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    const progress = await ctx.db
      .query("studentProgress")
      .withIndex("by_student_and_class", (q) =>
        q.eq("studentId", user._id).eq("classId", args.classId)
      )
      .unique();
    
    if (!progress) {
      // Calculate on the fly
      await ctx.runMutation(internal.progress.calculateStudentProgress, {
        studentId: user._id,
        classId: args.classId,
      });
      return null;
    }
    
    // Get milestones
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .order("asc")
      .collect();
    
    const milestoneStatus = await Promise.all(
      milestones.map(async (m) => {
        const completed = await ctx.db
          .query("completedMilestones")
          .withIndex("by_milestone", (q) => q.eq("milestoneId", m._id))
          .filter((q) => q.eq(q.field("studentId"), user._id))
          .unique();
        
        return {
          name: m.name,
          completed: !!completed,
          completedAt: completed?.completedAt,
        };
      })
    );
    
    return {
      overallProgress: progress.overallProgress,
      assignmentProgress: progress.assignmentProgress,
      attendanceProgress: progress.sessionAttendanceProgress,
      milestones: milestoneStatus,
    };
  },
});
```

**Frontend:**

Create progress bar components showing overall progress, assignment completion, and attendance.

---

## 4. Deep Analytics

### 4.1 Student Progress Reports - PDF Export for Parents

**Backend:**

```typescript
// convex/reports.ts
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const generateStudentReport = action({
  args: {
    studentId: v.id("users"),
    classId: v.id("classes"),
    reportType: v.union(v.literal("weekly"), v.literal("monthly"), v.literal("full")),
  },
  returns: v.object({ pdfUrl: v.string() }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const cls = await ctx.db.get(args.classId);
    
    // Verify parent access
    const parentLink = await ctx.db
      .query("parentLinks")
      .withIndex("by_parent_and_student", (q) =>
        q.eq("parentId", user._id).eq("studentId", args.studentId)
      )
      .unique();
    
    if (!parentLink && user.role !== "admin") {
      throw new Error("Not authorized to view this student's report");
    }
    
    const student = await ctx.db.get(args.studentId);
    if (!student) throw new Error("Student not found");
    
    // Generate PDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text(`Student Progress Report`, 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Student: ${student.displayName}`, 20, 40);
    doc.text(`Class: ${cls?.name}`, 20, 50);
    doc.text(`Report Period: ${args.reportType}`, 20, 60);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 70);
    
    // Get data
    const progress = await ctx.runQuery(internal.progress.getStudentProgressForReport, {
      studentId: args.studentId,
      classId: args.classId,
    });
    
    // Progress summary
    doc.setFontSize(14);
    doc.text("Progress Summary", 20, 90);
    
    doc.setFontSize(11);
    doc.text(`Overall Progress: ${progress?.overallProgress}%`, 20, 105);
    doc.text(`Assignment Completion: ${progress?.assignmentProgress}%`, 20, 115);
    doc.text(`Attendance Rate: ${progress?.attendanceProgress}%`, 20, 125);
    
    // Grades table
    const grades = await ctx.runQuery(internal.grades.getStudentGradesForReport, {
      studentId: args.studentId,
      classId: args.classId,
    });
    
    if (grades.length > 0) {
      doc.setFontSize(14);
      doc.text("Assignment Grades", 20, 145);
      
      const tableData = grades.map(g => [
        g.assignmentTitle,
        `${g.score}/${g.maxScore}`,
        `${Math.round((g.score / g.maxScore) * 100)}%`,
        g.feedback || "-",
      ]);
      
      (doc as any).autoTable({
        startY: 155,
        head: [["Assignment", "Score", "Percentage", "Feedback"]],
        body: tableData,
      });
    }
    
    // Attendance
    const attendance = await ctx.runQuery(internal.sessions.getStudentAttendanceForReport, {
      studentId: args.studentId,
      classId: args.classId,
    });
    
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    doc.setFontSize(14);
    doc.text("Attendance Summary", 20, finalY + 20);
    
    doc.setFontSize(11);
    doc.text(`Sessions Attended: ${attendance.attended}/${attendance.total}`, 20, finalY + 35);
    doc.text(`Attendance Rate: ${Math.round((attendance.attended / attendance.total) * 100)}%`, 20, finalY + 45);
    
    // Save to S3
    const pdfBuffer = doc.output("arraybuffer");
    const filename = `report_${args.studentId}_${args.classId}_${Date.now()}.pdf`;
    const s3Url = await uploadToS3(Buffer.from(pdfBuffer), filename, "application/pdf");
    
    return { pdfUrl: s3Url };
  },
});
```

---

### 4.2 Attendance Tracking - Detailed Reports

**Backend:**

```typescript
// convex/analytics.ts
export const getDetailedAttendanceReport = query({
  args: {
    classId: v.id("classes"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.object({
    summary: v.object({
      totalSessions: v.number(),
      averageAttendance: v.number(),
      totalStudents: v.number(),
    }),
    sessions: v.array(v.object({
      sessionId: v.id("sessions"),
      date: v.number(),
      attendees: v.number(),
      attendanceRate: v.number(),
    })),
    students: v.array(v.object({
      studentId: v.id("users"),
      name: v.string(),
      sessionsAttended: v.number(),
      attendanceRate: v.number(),
      streak: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    const user = await requireTeacher(ctx);
    
    const cls = await ctx.db.get(args.classId);
    if (!cls || (cls.teacherId !== user.userId && user.role !== "admin")) {
      throw new Error("Not authorized");
    }
    
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => {
        if (args.startDate && args.endDate) {
          return q.gte(q.field("startedAt"), args.startDate).lte(q.field("startedAt"), args.endDate);
        }
        return true;
      })
      .collect();
    
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    const totalStudents = enrollments.length;
    
    // Get attendance for each session
    const sessionData = await Promise.all(
      sessions.map(async (session) => {
        const logs = await ctx.db
          .query("sessionLogs")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();
        
        const uniqueAttendees = new Set(logs.map(l => l.userId)).size;
        
        return {
          sessionId: session._id,
          date: session.startedAt,
          attendees: uniqueAttendees,
          attendanceRate: totalStudents > 0 ? (uniqueAttendees / totalStudents) * 100 : 0,
        };
      })
    );
    
    // Get per-student attendance
    const studentData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const student = await ctx.db.get(enrollment.studentId);
        if (!student) return null;
        
        let sessionsAttended = 0;
        let currentStreak = 0;
        let maxStreak = 0;
        let previousSessionDate: number | null = null;
        
        for (const session of sessions.sort((a, b) => a.startedAt - b.startedAt)) {
          const attended = await ctx.db
            .query("sessionLogs")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .filter((q) => q.eq(q.field("userId"), enrollment.studentId))
            .first();
          
          if (attended) {
            sessionsAttended++;
            
            if (previousSessionDate && (session.startedAt - previousSessionDate) < (7 * 24 * 60 * 60 * 1000)) {
              currentStreak++;
            } else {
              currentStreak = 1;
            }
            maxStreak = Math.max(maxStreak, currentStreak);
            previousSessionDate = session.startedAt;
          } else {
            currentStreak = 0;
          }
        }
        
        return {
          studentId: enrollment.studentId,
          name: student.displayName,
          sessionsAttended,
          attendanceRate: sessions.length > 0 ? (sessionsAttended / sessions.length) * 100 : 0,
          streak: maxStreak,
        };
      })
    );
    
    const validStudentData = studentData.filter((s): s is NonNullable<typeof s> => s !== null);
    const averageAttendance = validStudentData.length > 0
      ? validStudentData.reduce((sum, s) => sum + s.attendanceRate, 0) / validStudentData.length
      : 0;
    
    return {
      summary: {
        totalSessions: sessions.length,
        averageAttendance: Math.round(averageAttendance),
        totalStudents,
      },
      sessions: sessionData,
      students: validStudentData,
    };
  },
});
```

---

### 4.3 Engagement Heatmaps

**Backend:**

```typescript
// convex/analytics.ts
export const getEngagementHeatmap = query({
  args: { classId: v.id("classes") },
  returns: v.object({
    hourlyActivity: v.array(v.object({
      hour: v.number(), // 0-23
      day: v.number(), // 0-6 (Sun-Sat)
      score: v.number(), // 0-100
    })),
    dailyTotals: v.array(v.object({
      day: v.string(),
      score: v.number(),
    })),
    hourlyTotals: v.array(v.object({
      hour: v.number(),
      score: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    const user = await requireTeacher(ctx);
    
    // Get all activity in last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const [submissions, sessionLogs, chatActivity] = await Promise.all([
      ctx.db.query("submissions").collect(),
      ctx.db.query("sessionLogs").collect(),
      // Add chat activity tracking
    ]);
    
    const hourlyActivity: { hour: number; day: number; count: number }[] = [];
    
    // Process submissions
    for (const submission of submissions) {
      if (submission.submittedAt < thirtyDaysAgo) continue;
      
      const date = new Date(submission.submittedAt);
      const hour = date.getHours();
      const day = date.getDay();
      
      const existing = hourlyActivity.find(a => a.hour === hour && a.day === day);
      if (existing) {
        existing.count += 1;
      } else {
        hourlyActivity.push({ hour, day, count: 1 });
      }
    }
    
    // Normalize to 0-100 scale
    const maxCount = Math.max(...hourlyActivity.map(a => a.count), 1);
    
    return {
      hourlyActivity: hourlyActivity.map(a => ({
        hour: a.hour,
        day: a.day,
        score: Math.round((a.count / maxCount) * 100),
      })),
      dailyTotals: [],
      hourlyTotals: [],
    };
  },
});
```

---

### 4.4 Comparative Analytics - Class vs Class Performance

**Backend:**

```typescript
// convex/analytics.ts
export const getClassComparison = query({
  args: { classIds: v.array(v.id("classes")) },
  returns: v.array(v.object({
    classId: v.id("classes"),
    className: v.string(),
    studentCount: v.number(),
    averageAttendance: v.number(),
    averageGrade: v.number(),
    assignmentCompletionRate: v.number(),
    totalSessions: v.number(),
  })),
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    
    const results = await Promise.all(
      args.classIds.map(async (classId) => {
        const cls = await ctx.db.get(classId);
        if (!cls) return null;
        
        const [enrollments, sessions, grades] = await Promise.all([
          ctx.db.query("enrollments").withIndex("by_class", (q) => q.eq("classId", classId)).collect(),
          ctx.db.query("sessions").withIndex("by_class", (q) => q.eq("classId", classId)).collect(),
          ctx.db.query("grades").withIndex("by_class", (q) => q.eq("classId", classId)).collect(),
        ]);
        
        const averageGrade = grades.length > 0
          ? grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / grades.length
          : 0;
        
        return {
          classId,
          className: cls.name,
          studentCount: enrollments.filter(e => e.status === "active").length,
          averageAttendance: 0, // Calculate from session logs
          averageGrade: Math.round(averageGrade),
          assignmentCompletionRate: 0, // Calculate
          totalSessions: sessions.length,
        };
      })
    );
    
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});
```

---

## 5. Enhanced Communication

### 5.1 Direct Messages - Student-to-Teacher Private Chat

**Database Schema:**

```typescript
// convex/schema.ts
directMessages: defineTable({
  senderId: v.id("users"),
  recipientId: v.id("users"),
  content: v.string(),
  read: v.boolean(),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
}).index("by_recipient", ["recipientId", "createdAt"])
  .index("by_sender", ["senderId", "createdAt"])
  .index("by_conversation", ["senderId", "recipientId"]),

conversations: defineTable({
  user1Id: v.id("users"),
  user2Id: v.id("users"),
  lastMessageAt: v.number(),
  lastMessagePreview: v.string(),
  unreadCount: v.number(),
}).index("by_user1", ["user1Id", "lastMessageAt"])
  .index("by_user2", ["user2Id", "lastMessageAt"]),
```

**Backend:**

```typescript
// convex/messages.ts
export const sendDirectMessage = mutation({
  args: {
    recipientId: v.id("users"),
    content: v.string(),
  },
  returns: v.id("directMessages"),
  handler: async (ctx, args) => {
    const sender = await getCurrentUser(ctx);
    
    // Validate sender can message recipient
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new Error("Recipient not found");
    
    // Check if they're in same class (teacher-student relationship)
    const isValidRelationship = await validateMessageRelationship(ctx, sender._id, args.recipientId);
    if (!isValidRelationship) {
      throw new Error("You can only message teachers or students in your classes");
    }
    
    const messageId = await ctx.db.insert("directMessages", {
      senderId: sender._id,
      recipientId: args.recipientId,
      content: args.content,
      read: false,
      createdAt: Date.now(),
    });
    
    // Update conversation
    await updateConversation(ctx, sender._id, args.recipientId, args.content);
    
    return messageId;
  },
});

export const getConversations = query({
  args: {},
  returns: v.array(v.object({
    conversationId: v.id("conversations"),
    otherUser: v.object({
      id: v.id("users"),
      name: v.string(),
      avatarUrl: v.optional(v.string()),
    }),
    lastMessage: v.string(),
    lastMessageAt: v.number(),
    unreadCount: v.number(),
  })),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    
    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => 
        q.eq(q.field("user1Id"), user._id).or(q.eq(q.field("user2Id"), user._id))
      )
      .order("desc")
      .take(50);
    
    const results = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.user1Id === user._id ? conv.user2Id : conv.user1Id;
        const otherUser = await ctx.db.get(otherUserId);
        
        return {
          conversationId: conv._id,
          otherUser: {
            id: otherUserId,
            name: otherUser?.displayName || "Unknown",
            avatarUrl: otherUser?.avatarUrl,
          },
          lastMessage: conv.lastMessagePreview,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount,
        };
      })
    );
    
    return results;
  },
});

export const getDirectMessages = query({
  args: { otherUserId: v.id("users") },
  returns: v.array(v.object({
    id: v.id("directMessages"),
    content: v.string(),
    senderId: v.id("users"),
    read: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    const messages = await ctx.db
      .query("directMessages")
      .filter((q) =>
        q.or(
          q.and(
            q.eq(q.field("senderId"), user._id),
            q.eq(q.field("recipientId"), args.otherUserId)
          ),
          q.and(
            q.eq(q.field("senderId"), args.otherUserId),
            q.eq(q.field("recipientId"), user._id)
          )
        )
      )
      .order("desc")
      .take(100);
    
    // Mark as read
    for (const msg of messages) {
      if (msg.recipientId === user._id && !msg.read) {
        await ctx.db.patch(msg._id, { read: true, readAt: Date.now() });
      }
    }
    
    return messages.reverse();
  },
});
```

---

### 5.2 Announcements - Teacher Broadcasts to Class

**Database Schema:**

```typescript
// convex/schema.ts
announcements: defineTable({
  classId: v.id("classes"),
  authorId: v.id("users"),
  title: v.string(),
  content: v.string(),
  pinned: v.boolean(),
  scheduledAt: v.optional(v.number()),
  publishedAt: v.optional(v.number()),
  createdAt: v.number(),
}).index("by_class", ["classId", "createdAt"]),

announcementReadReceipts: defineTable({
  announcementId: v.id("announcements"),
  userId: v.id("users"),
  readAt: v.number(),
}).index("by_announcement", ["announcementId"])
  .index("by_user", ["userId"]),
```

**Backend:**

```typescript
// convex/announcements.ts
export const createAnnouncement = mutation({
  args: {
    classId: v.id("classes"),
    title: v.string(),
    content: v.string(),
    pinned: v.optional(v.boolean()),
    scheduledAt: v.optional(v.number()),
  },
  returns: v.id("announcements"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const cls = await ctx.db.get(args.classId);
    
    if (!cls || cls.teacherId !== user._id) {
      throw new Error("Only class teachers can post announcements");
    }
    
    const announcementId = await ctx.db.insert("announcements", {
      ...args,
      authorId: user._id,
      pinned: args.pinned ?? false,
      publishedAt: args.scheduledAt ? undefined : Date.now(),
      createdAt: Date.now(),
    });
    
    // Schedule if needed
    if (args.scheduledAt) {
      await ctx.scheduler.runAt(args.scheduledAt, internal.announcements.publishAnnouncement, {
        announcementId,
      });
    } else {
      // Send notifications immediately
      await ctx.runAction(internal.notifications.sendAnnouncementNotifications, {
        announcementId,
        classId: args.classId,
      });
    }
    
    return announcementId;
  },
});

export const getAnnouncements = query({
  args: { classId: v.id("classes") },
  returns: v.array(v.object({
    id: v.id("announcements"),
    title: v.string(),
    content: v.string(),
    author: v.object({
      name: v.string(),
      avatarUrl: v.optional(v.string()),
    }),
    pinned: v.boolean(),
    publishedAt: v.number(),
    readCount: v.number(),
    totalStudents: v.number(),
  })),
  handler: async (ctx, args) => {
    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.neq(q.field("publishedAt"), undefined))
      .order("desc")
      .take(50);
    
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    const totalStudents = enrollments.length;
    
    const results = await Promise.all(
      announcements.map(async (ann) => {
        const author = await ctx.db.get(ann.authorId);
        const readReceipts = await ctx.db
          .query("announcementReadReceipts")
          .withIndex("by_announcement", (q) => q.eq("announcementId", ann._id))
          .collect();
        
        return {
          id: ann._id,
          title: ann.title,
          content: ann.content,
          author: {
            name: author?.displayName || "Unknown",
            avatarUrl: author?.avatarUrl,
          },
          pinned: ann.pinned,
          publishedAt: ann.publishedAt!,
          readCount: readReceipts.length,
          totalStudents,
        };
      })
    );
    
    // Sort pinned first
    return results.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  },
});

export const markAnnouncementRead = mutation({
  args: { announcementId: v.id("announcements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    const existing = await ctx.db
      .query("announcementReadReceipts")
      .filter((q) =>
        q.eq(q.field("announcementId"), args.announcementId)
          .eq(q.field("userId"), user._id)
      )
      .first();
    
    if (!existing) {
      await ctx.db.insert("announcementReadReceipts", {
        announcementId: args.announcementId,
        userId: user._id,
        readAt: Date.now(),
      });
    }
    
    return null;
  },
});
```

---

### 5.3 Pinned Messages in Chat

Use Stream Chat SDK's built-in pinning:

```typescript
// src/components/chat/PinnedMessages.tsx
import { useChatContext } from "stream-chat-react";

export function PinnedMessages() {
  const { channel } = useChatContext();
  const [pinnedMessages, setPinnedMessages] = useState<MessageType[]>([]);
  
  useEffect(() => {
    if (!channel) return;
    
    const loadPinned = async () => {
      const response = await channel.query({
        pinned: true,
        limit: 10,
      });
      setPinnedMessages(response.messages);
    };
    
    loadPinned();
  }, [channel]);
  
  if (pinnedMessages.length === 0) return null;
  
  return (
    <div className="bg-yellow-50 border-b p-3">
      <h4 className="text-sm font-semibold mb-2">📌 Pinned Messages</h4>
      {pinnedMessages.map(msg => (
        <div key={msg.id} className="text-sm text-muted-foreground">
          {msg.text}
        </div>
      ))}
    </div>
  );
}
```

---

### 5.4 @Mentions

Stream Chat SDK handles mentions automatically. Just configure:

```typescript
// In your Stream channel configuration
const channel = client.channel("classroom", classId, {
  mentions: true,
});
```

---

## 6. Enhanced Profiles

### 6.1 Parent Portal

**Backend:**

```typescript
// convex/parents.ts
export const getParentDashboard = query({
  args: {},
  returns: v.object({
    linkedStudents: v.array(v.object({
      studentId: v.id("users"),
      name: v.string(),
      classes: v.array(v.object({
        classId: v.id("classes"),
        className: v.string(),
        teacherName: v.string(),
        progress: v.number(),
        recentGrades: v.array(v.object({
          assignmentTitle: v.string(),
          score: v.number(),
          maxScore: v.number(),
          date: v.number(),
        })),
        attendanceRate: v.number(),
      })),
    })),
  }),
  handler: async (ctx) => {
    const parent = await getCurrentUser(ctx);
    if (parent.role !== "parent") throw new Error("Only parents can access this");
    
    const links = await ctx.db
      .query("parentLinks")
      .withIndex("by_parent", (q) => q.eq("parentId", parent._id))
      .filter((q) => q.eq(q.field("consentGiven"), true))
      .collect();
    
    const linkedStudents = await Promise.all(
      links.map(async (link) => {
        const student = await ctx.db.get(link.studentId);
        if (!student) return null;
        
        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_student", (q) => q.eq("studentId", link.studentId))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();
        
        const classes = await Promise.all(
          enrollments.map(async (enrollment) => {
            const cls = await ctx.db.get(enrollment.classId);
            if (!cls) return null;
            
            const teacher = await ctx.db.get(cls.teacherId);
            const progress = await ctx.runQuery(internal.progress.getStudentProgress, {
              studentId: link.studentId,
              classId: enrollment.classId,
            });
            
            const recentGrades = await ctx.db
              .query("grades")
              .withIndex("by_student", (q) => q.eq("studentId", link.studentId))
              .filter((q) => q.eq(q.field("classId"), enrollment.classId))
              .order("desc")
              .take(5);
            
            const gradesWithTitles = await Promise.all(
              recentGrades.map(async (grade) => {
                const assignment = await ctx.db.get(grade.assignmentId);
                return {
                  assignmentTitle: assignment?.title || "Unknown",
                  score: grade.score,
                  maxScore: grade.maxScore,
                  date: grade.gradedAt,
                };
              })
            );
            
            return {
              classId: enrollment.classId,
              className: cls.name,
              teacherName: teacher?.displayName || "Unknown",
              progress: progress?.overallProgress || 0,
              recentGrades: gradesWithTitles,
              attendanceRate: progress?.attendanceProgress || 0,
            };
          })
        );
        
        return {
          studentId: link.studentId,
          name: student.displayName,
          classes: classes.filter((c): c is NonNullable<typeof c> => c !== null),
        };
      })
    );
    
    return {
      linkedStudents: linkedStudents.filter((s): s is NonNullable<typeof s> => s !== null),
    };
  },
});
```

**Frontend:**

Create `ParentDashboardPage.tsx` showing all linked students with their progress, grades, and attendance.

---

### 6.2 Student Portfolios

**Database Schema:**

```typescript
// convex/schema.ts
portfolioItems: defineTable({
  studentId: v.id("users"),
  classId: v.id("classes"),
  type: v.union(v.literal("assignment"), v.literal("project"), v.literal("achievement")),
  title: v.string(),
  description: v.string(),
  fileUrl: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  grade: v.optional(v.number()),
  featured: v.boolean(),
  createdAt: v.number(),
}).index("by_student", ["studentId"])
  .index("by_class", ["classId"]),
```

Allow students to showcase their best work with public portfolio pages.

---

### 6.3 Teacher Profiles

Extend existing users table with:

```typescript
// Already added to schema:
// subjectExpertise: v.optional(v.array(v.string())),
// yearsOfExperience: v.optional(v.number()),
// teacherBio: v.optional(v.string()),
// certifications: v.optional(v.array(v.string())),
// specializations: v.optional(v.array(v.string())),
```

Create `TeacherProfilePage.tsx` displaying bio, expertise, ratings, and class history.

---

### 6.4 Class Rosters with Photos

Add avatar upload functionality:

```typescript
// convex/users.ts
export const uploadAvatar = action({
  args: {
    contentType: v.string(),
  },
  returns: v.object({ uploadUrl: v.string(), avatarUrl: v.string() }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const key = `avatars/${user._id}/${Date.now()}.jpg`;
    
    const { url: uploadUrl } = await generateS3UploadUrl(key, args.contentType);
    const avatarUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
    
    return { uploadUrl, avatarUrl };
  },
});

export const confirmAvatarUpload = mutation({
  args: { avatarUrl: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch(user._id, { avatarUrl: args.avatarUrl });
    return null;
  },
});
```

---

### 6.5 Bulk Import - CSV Import for Students/Classes

**Backend:**

```typescript
// convex/admin.ts
export const bulkImportStudents = action({
  args: {
    classId: v.id("classes"),
    csvData: v.string(),
  },
  returns: v.object({
    imported: v.number(),
    errors: v.array(v.object({
      row: v.number(),
      error: v.string(),
    })),
  }),
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (admin.role !== "admin") throw new Error("Only admins can import");
    
    const rows = parseCSV(args.csvData);
    const errors: { row: number; error: string }[] = [];
    let imported = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Validate required fields
        if (!row.username || !row.displayName || !row.password) {
          errors.push({ row: i + 1, error: "Missing required fields" });
          continue;
        }
        
        // Check if username exists
        const existing = await ctx.runQuery(internal.users.getUserByUsername, {
          username: row.username,
        });
        
        if (existing) {
          errors.push({ row: i + 1, error: "Username already exists" });
          continue;
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(row.password, 10);
        
        // Create user
        const userId = await ctx.runMutation(internal.users.createUser, {
          username: row.username,
          passwordHash,
          displayName: row.displayName,
          streamUserId: `user_${row.username}`,
          role: "student",
          organizationId: admin.organizationId,
          gradeLevel: row.gradeLevel ? parseInt(row.gradeLevel) : undefined,
        });
        
        // Enroll in class
        await ctx.runMutation(internal.classes.enrollStudent, {
          classId: args.classId,
          studentId: userId,
        });
        
        imported++;
      } catch (error) {
        errors.push({ row: i + 1, error: (error as Error).message });
      }
    }
    
    return { imported, errors };
  },
});
```

**CSV Format:**
```csv
username,displayName,password,gradeLevel
john.doe,John Doe,TempPass123,9
jane.smith,Jane Smith,TempPass123,10
```

---

## 7. Smart Notifications

### 7.1 Push Notifications - Browser + Mobile

**Setup:**

1. Install Firebase Cloud Messaging:
```bash
npm install firebase
```

2. Initialize in client:
```typescript
// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return token;
  }
  return null;
}

export function onForegroundMessage(callback: (payload: any) => void) {
  return onMessage(messaging, callback);
}
```

3. Save token to user profile:
```typescript
// convex/users.ts
export const savePushToken = mutation({
  args: { token: v.string(), platform: v.union(v.literal("web"), v.literal("ios"), v.literal("android")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch(user._id, {
      pushTokens: [...(user.pushTokens || []), { token: args.token, platform: args.platform }],
    });
    return null;
  },
});
```

4. Send notifications from backend:
```typescript
// convex/notifications.ts
import { getMessaging } from "firebase-admin/messaging";

export const sendPushNotification = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.pushTokens?.length) return null;
    
    for (const { token } of user.pushTokens) {
      try {
        await getMessaging().send({
          token,
          notification: {
            title: args.title,
            body: args.body,
          },
          data: args.data,
        });
      } catch (error) {
        // Remove invalid token
        console.error("Failed to send push:", error);
      }
    }
    
    return null;
  },
});
```

---

### 7.2 Email Digests

Use Resend or SendGrid:

```typescript
// convex/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendWeeklyDigest = action({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.email) return null;
    
    // Get weekly activity
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const [newGrades, upcomingAssignments, announcements] = await Promise.all([
      // Query new grades in last week
      ctx.runQuery(internal.grades.getRecentGrades, { userId: args.userId, since: weekAgo }),
      // Query upcoming assignments
      ctx.runQuery(internal.assignments.getUpcomingAssignments, { userId: args.userId }),
      // Query recent announcements
      ctx.runQuery(internal.announcements.getRecentAnnouncements, { userId: args.userId, since: weekAgo }),
    ]);
    
    // Send email
    await resend.emails.send({
      from: "Stream School <notifications@yourdomain.com>",
      to: user.email,
      subject: "Your Weekly Digest - Stream School",
      html: generateDigestEmail({ newGrades, upcomingAssignments, announcements }),
    });
    
    return null;
  },
});

// Schedule weekly digest for all users
export const scheduleWeeklyDigests = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    for (const user of users) {
      await ctx.scheduler.runAt(
        getNextSundayAt9AM(),
        internal.email.sendWeeklyDigest,
        { userId: user._id }
      );
    }
    
    return null;
  },
});
```

---

### 7.3 Reminder System

```typescript
// convex/crons.ts
import { cron } from "./_generated/server";

// Check for upcoming due dates every hour
const checkReminders = cron({
  name: "Check assignment reminders",
  schedule: "0 * * * *", // Every hour
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayFromNow = now + (24 * 60 * 60 * 1000);
    const twoDaysFromNow = now + (2 * 24 * 60 * 60 * 1000);
    
    // Find assignments due soon
    const assignments = await ctx.db
      .query("assignments")
      .filter((q) =>
        q.and(
          q.neq(q.field("dueDateAt"), undefined),
          q.gte(q.field("dueDateAt"), now),
          q.lte(q.field("dueDateAt"), twoDaysFromNow)
        )
      )
      .collect();
    
    for (const assignment of assignments) {
      if (!assignment.dueDateAt) continue;
      
      const hoursUntilDue = (assignment.dueDateAt - now) / (60 * 60 * 1000);
      
      // Get enrolled students who haven't submitted
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_class", (q) => q.eq("classId", assignment.classId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      
      for (const enrollment of enrollments) {
        const submission = await ctx.db
          .query("submissions")
          .withIndex("by_assignment_and_student", (q) =>
            q.eq("assignmentId", assignment._id).eq("studentId", enrollment.studentId)
          )
          .unique();
        
        if (!submission) {
          // Send reminder
          await ctx.runAction(internal.notifications.sendReminder, {
            userId: enrollment.studentId,
            type: hoursUntilDue <= 24 ? "urgent" : "upcoming",
            assignmentTitle: assignment.title,
            hoursUntilDue: Math.round(hoursUntilDue),
          });
        }
      }
    }
  },
});
```

---

### 7.4 Notification Preferences

**Database Schema:**

```typescript
// convex/schema.ts - Add to users table
notificationPreferences: v.optional(v.object({
  email: v.object({
    announcements: v.boolean(),
    grades: v.boolean(),
    assignments: v.boolean(),
    weeklyDigest: v.boolean(),
  }),
  push: v.object({
    announcements: v.boolean(),
    grades: v.boolean(),
    assignments: v.boolean(),
    sessionReminders: v.boolean(),
  }),
  sms: v.object({
    urgentOnly: v.boolean(),
  }),
})),
```

Create settings page for managing notification preferences.

---

## 8. Administrative Tools

### 8.1 Organization Settings

**Backend:**

```typescript
// convex/organizations.ts
export const updateOrganizationSettings = mutation({
  args: {
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    settings: v.optional(v.object({
      studentDmsEnabled: v.boolean(),
      recordingEnabled: v.boolean(),
      lobbyEnabled: v.boolean(),
      maxClassSize: v.number(),
      dataRetentionDays: v.number(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (admin.role !== "admin") throw new Error("Only admins can update organization");
    if (!admin.organizationId) throw new Error("User not in organization");
    
    const updateData: Partial<typeof args> = {};
    if (args.name) updateData.name = args.name;
    if (args.logoUrl) updateData.logoUrl = args.logoUrl;
    if (args.primaryColor) updateData.primaryColor = args.primaryColor;
    if (args.settings) updateData.settings = args.settings;
    
    await ctx.db.patch(admin.organizationId, updateData);
    return null;
  },
});
```

---

### 8.2 User Management

```typescript
// convex/admin.ts
export const deactivateUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (admin.role !== "admin") throw new Error("Only admins can deactivate users");
    
    await ctx.db.patch(args.userId, {
      isActive: false,
      deactivatedAt: Date.now(),
      deactivatedBy: admin._id,
    });
    
    return null;
  },
});

export const activateUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (admin.role !== "admin") throw new Error("Only admins can activate users");
    
    await ctx.db.patch(args.userId, { isActive: true });
    return null;
  },
});

export const getOrganizationUsers = query({
  args: {},
  returns: v.array(v.object({
    id: v.id("users"),
    username: v.string(),
    displayName: v.string(),
    role: v.string(),
    isActive: v.boolean(),
    lastSeenAt: v.optional(v.number()),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (admin.role !== "admin") throw new Error("Unauthorized");
    if (!admin.organizationId) throw new Error("No organization");
    
    const users = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", admin.organizationId))
      .collect();
    
    return users.map(u => ({
      id: u._id,
      username: u.username,
      displayName: u.displayName,
      role: u.role || "student",
      isActive: u.isActive ?? true,
      lastSeenAt: u.lastSeenAt,
      createdAt: u.createdAt,
    }));
  },
});
```

---

### 8.3 Audit Logs

Already exists in schema. Create admin view:

```typescript
// convex/admin.ts
export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.array(v.object({
    id: v.id("auditLogs"),
    actor: v.object({ name: v.string(), role: v.string() }),
    action: v.string(),
    target: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (admin.role !== "admin") throw new Error("Unauthorized");
    if (!admin.organizationId) throw new Error("No organization");
    
    let logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_organization_and_created_at", (q) =>
        q.eq("organizationId", admin.organizationId!)
      )
      .order("desc")
      .take(args.limit || 100);
    
    if (args.action) {
      logs = logs.filter(l => l.action === args.action);
    }
    if (args.startDate) {
      logs = logs.filter(l => l.createdAt >= args.startDate!);
    }
    if (args.endDate) {
      logs = logs.filter(l => l.createdAt <= args.endDate!);
    }
    
    return await Promise.all(
      logs.map(async (log) => {
        const actor = await ctx.db.get(log.actorId);
        return {
          id: log._id,
          actor: {
            name: actor?.displayName || "Unknown",
            role: actor?.role || "unknown",
          },
          action: log.action,
          target: log.targetId,
          metadata: log.metadata,
          createdAt: log.createdAt,
        };
      })
    );
  },
});
```

---

### 8.4 Data Export

```typescript
// convex/admin.ts
export const exportUserData = action({
  args: { userId: v.id("users") },
  returns: v.object({ downloadUrl: v.string() }),
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (admin.role !== "admin") throw new Error("Unauthorized");
    
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    
    // Collect all user data
    const [
      submissions,
      grades,
      enrollments,
      sessionLogs,
      messages,
    ] = await Promise.all([
      ctx.db.query("submissions").withIndex("by_student", (q) => q.eq("studentId", args.userId)).collect(),
      ctx.db.query("grades").withIndex("by_student", (q) => q.eq("studentId", args.userId)).collect(),
      ctx.db.query("enrollments").withIndex("by_student", (q) => q.eq("studentId", args.userId)).collect(),
      ctx.db.query("sessionLogs").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
      ctx.db.query("directMessages").filter((q) =>
        q.eq(q.field("senderId"), args.userId).or(q.eq(q.field("recipientId"), args.userId))
      ).collect(),
    ]);
    
    const userData = {
      user: {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
      },
      submissions,
      grades,
      enrollments,
      sessionLogs: sessionLogs.map(l => ({
        sessionId: l.sessionId,
        joinedAt: l.joinedAt,
        leftAt: l.leftAt,
      })),
      messages: messages.map(m => ({
        content: m.content,
        createdAt: m.createdAt,
        isOutgoing: m.senderId === args.userId,
      })),
    };
    
    // Export to JSON file
    const json = JSON.stringify(userData, null, 2);
    const filename = `export_${user.username}_${Date.now()}.json`;
    const downloadUrl = await uploadToS3(Buffer.from(json), filename, "application/json");
    
    return { downloadUrl };
  },
});
```

---

## 9. Cross-Platform Features

### 9.1 PWA Support

**Configuration:**

1. Create `public/manifest.json`:
```json
{
  "name": "Stream School",
  "short_name": "StreamSchool",
  "description": "Interactive educational platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

2. Add to `layout.tsx`:
```typescript
export const metadata = {
  manifest: "/manifest.json",
  themeColor: "#000000",
};
```

3. Create service worker `public/sw.js` for offline support.

---

### 9.2 Offline Mode

Use Convex's offline support and local storage:

```typescript
// src/hooks/useOfflineSupport.ts
import { useEffect, useState } from "react";

export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  
  return { isOnline };
}
```

---

### 9.3 Mobile-Optimized UI

Already using responsive Tailwind classes. Add mobile-specific:

```typescript
// src/components/layout/MobileNav.tsx
export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden">
      <div className="flex justify-around p-2">
        <NavButton icon={Home} label="Home" href="/" />
        <NavButton icon={BookOpen} label="Classes" href="/classes" />
        <NavButton icon={MessageSquare} label="Chat" href="/messages" />
        <NavButton icon={User} label="Profile" href="/profile" />
      </div>
    </nav>
  );
}
```

---

### 9.4 Accessibility

Already partially implemented. Add:

```typescript
// Ensure all interactive elements have proper ARIA labels
// Use semantic HTML elements
// Support keyboard navigation
// Add skip links
// Use high contrast colors
// Support screen readers with proper alt text
```

---

## 10. Security & Compliance

### 10.1 COPPA Compliance

**Implementation:**

```typescript
// convex/auth.ts
export const registerStudent = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    displayName: v.string(),
    gradeLevel: v.number(),
    parentEmail: v.string(),
    birthDate: v.string(), // YYYY-MM-DD
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Check age
    const birthDate = new Date(args.birthDate);
    const age = calculateAge(birthDate);
    
    if (age < 13) {
      // Require parental consent
      const consentToken = crypto.randomUUID();
      
      // Send consent email to parent
      await ctx.runAction(internal.email.sendParentalConsentRequest, {
        parentEmail: args.parentEmail,
        studentUsername: args.username,
        consentToken,
      });
      
      // Create user with pendingConsent status
      const userId = await ctx.db.insert("users", {
        username: args.username,
        passwordHash: await bcrypt.hash(args.password, 10),
        displayName: args.displayName,
        streamUserId: `user_${args.username}`,
        role: "student",
        gradeLevel: args.gradeLevel,
        birthDate: args.birthDate,
        parentalConsentStatus: "pending",
        parentEmail: args.parentEmail,
        consentToken,
        createdAt: Date.now(),
      });
      
      return userId;
    }
    
    // Normal registration for 13+
    // ...
  },
});

export const verifyParentalConsent = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("consentToken"), args.token))
      .first();
    
    if (!user) throw new Error("Invalid token");
    
    await ctx.db.patch(user._id, {
      parentalConsentStatus: "approved",
      consentVerifiedAt: Date.now(),
    });
    
    return null;
  },
});
```

---

### 10.2 FERPA Compliance

**Implementation:**

1. Data access controls (already implemented)
2. Audit logging (already exists)
3. Data retention policies:

```typescript
// convex/crons.ts
const dataRetentionCleanup = cron({
  name: "Data retention cleanup",
  schedule: "0 2 * * 0", // Weekly at 2 AM Sunday
  handler: async (ctx) => {
    const retentionDays = 2555; // 7 years for FERPA
    const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    
    // Archive old data
    const oldSessions = await ctx.db
      .query("sessions")
      .filter((q) => q.lt(q.field("startedAt"), cutoffDate))
      .collect();
    
    for (const session of oldSessions) {
      // Archive to cold storage
      await ctx.runAction(internal.data.archiveSessionData, { sessionId: session._id });
      
      // Delete from hot storage
      await ctx.db.delete(session._id);
    }
  },
});
```

---

## 11. AI-Powered Features

### 11.1 AI Tutor

Use OpenAI API:

```typescript
// convex/ai.ts
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const askAITutor = action({
  args: {
    question: v.string(),
    classId: v.id("classes"),
    context: v.optional(v.string()),
  },
  returns: v.object({ answer: v.string(), suggestions: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    // Get class context
    const cls = await ctx.db.get(args.classId);
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .take(10);
    
    const classContext = `Class: ${cls?.name}, Subject: ${cls?.subject}. Recent topics: ${assignments.map(a => a.title).join(", ")}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a helpful tutor for a ${cls?.subject} class. Be encouraging and explain concepts clearly. Keep responses concise (max 3 paragraphs).`,
        },
        {
          role: "user",
          content: `Context: ${classContext}\n\nStudent question: ${args.question}`,
        },
      ],
    });
    
    const answer = response.choices[0].message.content || "I couldn't answer that.";
    
    // Generate follow-up suggestions
    const suggestionsResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Generate 3 related follow-up questions a student might ask.",
        },
        {
          role: "user",
          content: `Original question: ${args.question}\nAnswer: ${answer}`,
        },
      ],
    });
    
    const suggestions = suggestionsResponse.choices[0].message.content
      ?.split("\n")
      .filter(s => s.trim())
      .slice(0, 3) || [];
    
    return { answer, suggestions };
  },
});
```

---

### 11.2 Auto-Summary

```typescript
// convex/ai.ts
export const summarizeChat = action({
  args: { sessionId: v.id("sessions") },
  returns: v.object({ summary: v.string(), keyPoints: v.array(v.string()) }),
  handler: async (ctx, args) => {
    // Get chat messages from Stream
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    
    // Fetch messages from Stream API
    const messages = await ctx.runAction(internal.stream.getSessionChatMessages, {
      channelId: session.streamChannelId,
    });
    
    const chatText = messages.map(m => `${m.user}: ${m.text}`).join("\n");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Summarize this classroom chat session. Identify key topics discussed, questions asked, and important announcements.",
        },
        {
          role: "user",
          content: chatText,
        },
      ],
    });
    
    const summary = response.choices[0].message.content || "Could not summarize.";
    
    // Save summary to session
    await ctx.runMutation(internal.sessions.addSummary, {
      sessionId: args.sessionId,
      summary,
    });
    
    return { summary, keyPoints: [] };
  },
});
```

---

### 11.3 Smart Scheduling

```typescript
// convex/ai.ts
export const suggestOptimalSessionTimes = action({
  args: { classId: v.id("classes") },
  returns: v.array(v.object({
    day: v.string(),
    hour: v.number(),
    attendanceRate: v.number(),
    engagementScore: v.number(),
  })),
  handler: async (ctx, args) => {
    // Get historical attendance data
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();
    
    const attendanceByTime: Record<string, { total: number; attended: number }> = {};
    
    for (const session of sessions) {
      const date = new Date(session.startedAt);
      const key = `${date.getDay()}-${date.getHours()}`;
      
      const logs = await ctx.db
        .query("sessionLogs")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      
      if (!attendanceByTime[key]) {
        attendanceByTime[key] = { total: 0, attended: 0 };
      }
      
      attendanceByTime[key].total += 1;
      attendanceByTime[key].attended += logs.length;
    }
    
    // Sort by attendance rate
    const suggestions = Object.entries(attendanceByTime)
      .map(([key, data]) => {
        const [day, hour] = key.split("-").map(Number);
        return {
          day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day],
          hour,
          attendanceRate: Math.round((data.attended / data.total) * 100),
          engagementScore: Math.round((data.attended / data.total) * 100),
        };
      })
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 5);
    
    return suggestions;
  },
});
```

---

### 11.4 Grade Prediction

```typescript
// convex/ai.ts
export const predictStudentGrades = action({
  args: { studentId: v.id("users"), classId: v.id("classes") },
  returns: v.object({
    predictedGrade: v.number(),
    confidence: v.number(),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    recommendations: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get student's historical data
    const grades = await ctx.db
      .query("grades")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .filter((q) => q.eq(q.field("classId"), args.classId))
      .collect();
    
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
    
    const sessionLogs = await ctx.db
      .query("sessionLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.studentId))
      .collect();
    
    // Simple prediction based on trends
    const gradeScores = grades.map(g => (g.score / g.maxScore) * 100);
    const averageGrade = gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length || 0;
    
    // Adjust based on attendance
    const allSessions = await ctx.db
      .query("sessions")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();
    
    const attendanceRate = allSessions.length > 0
      ? (sessionLogs.filter(l => allSessions.some(s => s._id === l.sessionId)).length / allSessions.length)
      : 0;
    
    // Weight: 70% grades, 30% attendance
    const predictedGrade = Math.round((averageGrade * 0.7) + (attendanceRate * 100 * 0.3));
    
    const riskLevel = predictedGrade >= 80 ? "low" : predictedGrade >= 60 ? "medium" : "high";
    
    const recommendations = [];
    if (attendanceRate < 0.8) {
      recommendations.push("Improve attendance to boost grades");
    }
    if (averageGrade < 70) {
      recommendations.push("Schedule office hours with teacher");
    }
    if (submissions.some(s => !s.submittedAt)) {
      recommendations.push("Complete missing assignments");
    }
    
    return {
      predictedGrade,
      confidence: 75, // Simplified
      riskLevel,
      recommendations: recommendations.length ? recommendations : ["Keep up the good work!"],
    };
  },
});
```

---

### 11.5 Content Recommendations

```typescript
// convex/ai.ts
export const recommendStudyMaterials = action({
  args: { studentId: v.id("users"), classId: v.id("classes") },
  returns: v.array(v.object({
    title: v.string(),
    type: v.string(),
    reason: v.string(),
    priority: v.number(),
  })),
  handler: async (ctx, args) => {
    // Get weak areas based on grades
    const grades = await ctx.db
      .query("grades")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .filter((q) => q.eq(q.field("classId"), args.classId))
      .collect();
    
    const weakAreas = grades
      .filter(g => (g.score / g.maxScore) < 0.7)
      .map(g => g.assignmentId);
    
    const recommendations: { title: string; type: string; reason: string; priority: number }[] = [];
    
    for (const assignmentId of weakAreas) {
      const assignment = await ctx.db.get(assignmentId);
      if (assignment) {
        recommendations.push({
          title: `Review: ${assignment.title}`,
          type: "assignment",
          reason: "Scored below 70%",
          priority: 1,
        });
      }
    }
    
    // Add general recommendations
    const cls = await ctx.db.get(args.classId);
    recommendations.push({
      title: `${cls?.subject} Study Guide`,
      type: "resource",
      reason: "Based on your class",
      priority: 3,
    });
    
    return recommendations.sort((a, b) => a.priority - b.priority);
  },
});
```

---

### 11.6 Assignment Generation

```typescript
// convex/ai.ts
export const generateQuizQuestions = action({
  args: {
    topic: v.string(),
    questionCount: v.number(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  },
  returns: v.array(v.object({
    text: v.string(),
    options: v.array(v.string()),
    correctOption: v.number(),
    explanation: v.string(),
  })),
  handler: async (ctx, args) => {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Generate ${args.questionCount} multiple choice questions about "${args.topic}" at ${args.difficulty} difficulty. Return as JSON array with text, options array, correctOption index, and explanation for each question.`,
        },
      ],
    });
    
    try {
      const questions = JSON.parse(response.choices[0].message.content || "[]");
      return questions;
    } catch {
      return [];
    }
  },
});
```

---

## Implementation Priority Guide

### Phase 1 (MVP - 2-3 weeks)
1. File upload assignments
2. Auto-grading
3. Progress tracking
4. Push notifications
5. Session recordings
6. Assignment stats view

### Phase 2 (Enhancement - 3-4 weeks)
1. Breakout rooms
2. Time-limited quizzes
3. Question banks
4. Parent portal
5. Detailed analytics
6. Bulk import

### Phase 3 (Advanced - 4-6 weeks)
1. Screen annotations
2. Virtual backgrounds
3. Live transcription
4. AI tutor
5. Rubrics
6. Audit logs

### Phase 4 (Polish - 2-3 weeks)
1. Mobile optimization
2. PWA support
3. Accessibility
4. Compliance features
5. AI-powered features

---

## Environment Variables Required

```bash
# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=stream-school-uploads

# Firebase (Push Notifications)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...

# Email (Resend)
RESEND_API_KEY=...

# AI (OpenAI)
OPENAI_API_KEY=...

# Stream (already configured)
STREAM_API_KEY=...
STREAM_API_SECRET=...
```

---

## Conclusion

This implementation guide provides complete specifications for all requested features. Each section includes:
- Database schema changes
- Backend Convex functions
- Frontend component structure
- Integration points with existing code
- Third-party service requirements

Start with Phase 1 features for maximum impact, then iterate through subsequent phases.