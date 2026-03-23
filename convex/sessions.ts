import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const updateRecordingUrl = internalMutation({
  args: {
    callCid: v.string(),
    recordingUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find session by Stream call CID
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.callCid))
      .first();
    
    if (session) {
      await ctx.db.patch(session._id, { recordingUrl: args.recordingUrl });
    } else {
      console.warn(`Session not found for call CID: ${args.callCid}`);
    }
    
    return null;
  },
});

export const createSession = mutation({
  args: {
    classId: v.id("classes"),
    hostId: v.id("users"),
    streamCallId: v.string(),
    scheduledAt: v.optional(v.number()),
  },
  returns: v.id("sessions"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const sessionId: Id<"sessions"> = await ctx.db.insert("sessions", {
      classId: args.classId,
      hostId: args.hostId,
      streamCallId: args.streamCallId,
      scheduledAt: args.scheduledAt,
      startedAt: Date.now(),
      recordingConsentRequired: false,
    });

    return sessionId;
  },
});

export const endSession = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.object({
    totalParticipants: v.number(),
    totalJoins: v.number(),
    averageDuration: v.number(),
    lobbyAdmissions: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, { endedAt: Date.now() });

    const sessionLogs = await ctx.db
      .query("sessionLogs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const uniqueParticipants = new Set(sessionLogs.map((log) => log.userId)).size;
    const totalJoins = sessionLogs.length;
    const lobbyAdmissions = sessionLogs.filter((log) => log.wasAdmittedFromLobby).length;

    let totalDuration = 0;
    let validDurations = 0;
    sessionLogs.forEach((log) => {
      if (log.leftAt) {
        totalDuration += log.leftAt - log.joinedAt;
        validDurations++;
      }
    });
    const averageDuration = validDurations > 0 ? Math.round(totalDuration / validDurations / 1000) : 0;

    return {
      totalParticipants: uniqueParticipants,
      totalJoins,
      averageDuration,
      lobbyAdmissions,
    };
  },
});

export const logJoin = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    wasAdmittedFromLobby: v.boolean(),
  },
  returns: v.id("sessionLogs"),
  handler: async (ctx, args) => {
    const logId: Id<"sessionLogs"> = await ctx.db.insert("sessionLogs", {
      sessionId: args.sessionId,
      userId: args.userId,
      joinedAt: Date.now(),
      wasAdmittedFromLobby: args.wasAdmittedFromLobby,
    });

    return logId;
  },
});

export const logLeave = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sessionLog = await ctx.db
      .query("sessionLogs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .order("desc")
      .first();

    if (sessionLog) {
      await ctx.db.patch(sessionLog._id, { leftAt: Date.now() });
    }

    return null;
  },
});

export const getAttendance = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      userName: v.string(),
      joinedAt: v.optional(v.number()),
      leftAt: v.optional(v.number()),
      status: v.union(v.literal("present"), v.literal("late"), v.literal("absent")),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const cls = await ctx.db.get(session.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", session.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isTeacher && !isEnrolled) {
      throw new Error("Not authorized to view attendance for this session");
    }

    const sessionLogs = await ctx.db
      .query("sessionLogs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const enrolledStudents = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", session.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const studentIds = enrolledStudents.map((e) => e.studentId);

    const userMap = new Map<Id<"users">, { displayName: string }>();
    for (const studentId of studentIds) {
      const student = await ctx.db.get(studentId);
      if (student) {
        userMap.set(studentId, { displayName: student.displayName });
      }
    }

    const attendanceByUser = new Map<
      Id<"users">,
      { joinedAt: number; leftAt?: number }
    >();

    sessionLogs.forEach((log) => {
      const existing = attendanceByUser.get(log.userId);
      if (!existing || log.joinedAt < existing.joinedAt) {
        attendanceByUser.set(log.userId, {
          joinedAt: log.joinedAt,
          leftAt: log.leftAt,
        });
      }
    });

    const sessionStartTime = session.startedAt;
    const fiveMinutesInMs = 5 * 60 * 1000;

    const attendance: {
      userId: Id<"users">;
      userName: string;
      joinedAt?: number;
      leftAt?: number;
      status: "present" | "late" | "absent";
    }[] = [];

    for (const studentId of studentIds) {
      const userInfo = userMap.get(studentId);
      if (!userInfo) continue;

      const log = attendanceByUser.get(studentId);

      let status: "present" | "late" | "absent";
      if (!log) {
        status = "absent";
      } else if (log.joinedAt > sessionStartTime + fiveMinutesInMs) {
        status = "late";
      } else {
        status = "present";
      }

      attendance.push({
        userId: studentId,
        userName: userInfo.displayName,
        joinedAt: log?.joinedAt,
        leftAt: log?.leftAt,
        status,
      });
    }

    return attendance;
  },
});

export const getSessionsByClass = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.array(
    v.object({
      _id: v.id("sessions"),
      _creationTime: v.number(),
      classId: v.id("classes"),
      hostId: v.id("users"),
      streamCallId: v.string(),
      scheduledAt: v.optional(v.number()),
      startedAt: v.number(),
      endedAt: v.optional(v.number()),
      recordingUrl: v.optional(v.string()),
      recordingConsentRequired: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isTeacher && !isEnrolled) {
      throw new Error("Not authorized to view sessions for this class");
    }

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_class_and_started_at", (q) => q.eq("classId", args.classId))
      .order("desc")
      .collect();

    return sessions;
  },
});
