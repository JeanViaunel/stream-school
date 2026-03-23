import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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
    
    const username = identity.subject.split("|")[0];
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    
    if (!user) throw new Error("User not found");
    
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
      .collect();
    
    const studentIds = enrollments
      .filter((e) => e.status === "active")
      .map((e) => e.studentId);
    
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
    }
    
    // Create Stream calls after DB insertion
    for (const roomId of roomIds) {
      const room = await ctx.db.get(roomId);
      if (room) {
        await ctx.scheduler.runAfter(0, internal.breakoutRoomsInternal.createBreakoutRoomCall, {
          callId: room.streamCallId,
          parentSessionId: session.streamCallId,
        });
      }
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
            sessionId: args.sessionId,
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
            sessionId: args.sessionId,
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const username = identity.subject.split("|")[0];
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    
    if (!user) throw new Error("User not found");
    
    const room = await ctx.db.get(args.roomId);
    
    if (!room) throw new Error("Room not found");
    if (room.endedAt) throw new Error("Room has ended");
    
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const username = identity.subject.split("|")[0];
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    
    if (!user) throw new Error("User not found");
    
    const session = await ctx.db.get(args.sessionId);
    
    if (!session) throw new Error("Session not found");
    
    const cls = await ctx.db.get(session.classId);
    if (!cls || cls.teacherId !== user._id) {
      throw new Error("Only teachers can end breakout rooms");
    }
    
    const rooms = await ctx.db
      .query("breakoutRooms")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    for (const room of rooms) {
      if (!room.endedAt) {
        await ctx.db.patch(room._id, { endedAt: Date.now() });
        await ctx.scheduler.runAfter(0, internal.breakoutRoomsInternal.endBreakoutRoomCall, {
          callId: room.streamCallId,
        });
      }
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const username = identity.subject.split("|")[0];
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    
    if (!user) throw new Error("User not found");
    
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

export const getBreakoutRoomsForSession = query({
  args: { sessionId: v.id("sessions") },
  returns: v.array(v.object({
    roomId: v.id("breakoutRooms"),
    name: v.string(),
    streamCallId: v.string(),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
    students: v.array(v.object({
      userId: v.id("users"),
      assignedAt: v.number(),
      joinedAt: v.optional(v.number()),
    })),
  })),
  handler: async (ctx, args) => {
    const rooms = await ctx.db
      .query("breakoutRooms")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    const roomsWithStudents = await Promise.all(
      rooms.map(async (room) => {
        const assignments = await ctx.db
          .query("breakoutRoomAssignments")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();
        
        return {
          roomId: room._id,
          name: room.name,
          streamCallId: room.streamCallId,
          createdAt: room.createdAt,
          endedAt: room.endedAt,
          students: assignments.map(a => ({
            userId: a.userId,
            assignedAt: a.assignedAt,
            joinedAt: a.joinedAt,
          })),
        };
      })
    );
    
    return roomsWithStudents;
  },
});

export const broadcastToBreakoutRooms = mutation({
  args: {
    sessionId: v.id("sessions"),
    message: v.string(),
  },
  returns: v.array(v.object({
    callId: v.string(),
    name: v.string(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const username = identity.subject.split("|")[0];
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    
    if (!user) throw new Error("User not found");
    
    const session = await ctx.db.get(args.sessionId);
    
    if (!session) throw new Error("Session not found");
    
    const cls = await ctx.db.get(session.classId);
    if (!cls || cls.teacherId !== user._id) {
      throw new Error("Only teachers can broadcast messages");
    }
    
    const rooms = await ctx.db
      .query("breakoutRooms")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    const activeRooms = rooms
      .filter(room => !room.endedAt)
      .map(room => ({
        callId: room.streamCallId,
        name: room.name,
      }));
    
    // Return room info so the client can send custom events to each room
    return activeRooms;
  },
});