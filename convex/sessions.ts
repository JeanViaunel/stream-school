import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { usernameFromIdentity } from "./authHelpers";

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

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) throw new Error("User not found");

    const cls = await ctx.db.get(args.classId);
    if (!cls) throw new Error("Class not found");

    const isClassTeacher = cls.teacherId === user._id;
    const hasTeacherRole = user.role === "teacher" || user.role === "co_teacher";

    if (!isClassTeacher || !hasTeacherRole) {
      throw new Error("Only the class teacher can start a session");
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
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const cls = await ctx.db.get(session.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id;
    const isOrgAdmin =
      user.role === "admin" &&
      !!user.organizationId &&
      user.organizationId === cls.organizationId;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", session.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isTeacher && !isOrgAdmin && !isEnrolled) {
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
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id;
    const isOrgAdmin =
      user.role === "admin" &&
      !!user.organizationId &&
      user.organizationId === cls.organizationId;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isTeacher && !isOrgAdmin && !isEnrolled) {
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

export const getActiveSessionInternal = internalQuery({
  args: { classId: v.id("classes") },
  returns: v.union(
    v.object({ _id: v.id("sessions"), streamCallId: v.string() }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_class_and_started_at", (q) => q.eq("classId", args.classId))
      .order("desc")
      .first();
    if (!session || session.endedAt !== undefined) return null;
    return { _id: session._id, streamCallId: session.streamCallId };
  },
});

export const getSessionForAdmin = internalQuery({
  args: { sessionId: v.id("sessions") },
  returns: v.union(
    v.object({
      _id: v.id("sessions"),
      classId: v.id("classes"),
      streamCallId: v.string(),
      endedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const s = await ctx.db.get(args.sessionId);
    if (!s) return null;
    return { _id: s._id, classId: s.classId, streamCallId: s.streamCallId, endedAt: s.endedAt };
  },
});

export const markSessionEnded = internalMutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { endedAt: Date.now() });
    return null;
  },
});

export const getActiveSessionForClass = query({
  args: { classId: v.id("classes") },
  returns: v.union(
    v.object({
      _id: v.id("sessions"),
      streamCallId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();
    if (!user) throw new Error("User not found");

    const cls = await ctx.db.get(args.classId);
    if (!cls) return null;

    const isTeacher = cls.teacherId === user._id;
    const isOrgAdmin =
      user.role === "admin" &&
      !!user.organizationId &&
      user.organizationId === cls.organizationId;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isTeacher && !isOrgAdmin && !isEnrolled) return null;

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_class_and_started_at", (q) => q.eq("classId", args.classId))
      .order("desc")
      .first();

    if (!session || session.endedAt !== undefined) return null;

    return { _id: session._id, streamCallId: session.streamCallId };
  },
});

export const teacherForceEndSession = action({
  args: { classId: v.id("classes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user: { _id: Id<"users">; role?: string } | null = await ctx.runQuery(
      internal.users.getUserByUsername,
      { username: usernameFromIdentity(identity) }
    );
    if (!user) throw new Error("User not found");

    const cls: { teacherId: Id<"users"> } | null = await ctx.runQuery(
      internal.classes.getClassByIdInternal,
      { classId: args.classId }
    );
    if (!cls) throw new Error("Class not found");

    const isClassTeacher = cls.teacherId === user._id;
    const hasTeacherRole =
      user.role === "teacher" || user.role === "co_teacher" || user.role === "admin";

    if (!isClassTeacher || !hasTeacherRole) {
      throw new Error("Only the assigned class teacher can end this session");
    }

    const active: { _id: Id<"sessions">; streamCallId: string } | null =
      await ctx.runQuery(internal.sessions.getActiveSessionInternal, { classId: args.classId });

    if (!active) throw new Error("No active session found for this class");

    await ctx.runMutation(internal.sessions.markSessionEnded, { sessionId: active._id });
    await ctx.runAction(internal.stream.endVideoCall, {
      callType: "default",
      callId: active.streamCallId,
    });

    return null;
  },
});

export const adminForceEndSession = action({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user: { role?: string; organizationId?: Id<"organizations"> } | null =
      await ctx.runQuery(internal.users.getUserByUsername, {
        username: usernameFromIdentity(identity),
      });

    if (!user || user.role !== "admin") throw new Error("Only admins can force-end sessions");

    const session: {
      _id: Id<"sessions">;
      classId: Id<"classes">;
      streamCallId: string;
      endedAt?: number;
    } | null = await ctx.runQuery(internal.sessions.getSessionForAdmin, { sessionId: args.sessionId });

    if (!session) throw new Error("Session not found");
    if (session.endedAt !== undefined) throw new Error("Session already ended");

    const cls: { organizationId: Id<"organizations"> } | null = await ctx.runQuery(
      internal.classes.getClassByIdInternal,
      { classId: session.classId }
    );
    if (!cls) throw new Error("Class not found");
    if (!user.organizationId || cls.organizationId !== user.organizationId) {
      throw new Error("Session not in admin organization");
    }

    await ctx.runMutation(internal.sessions.markSessionEnded, { sessionId: args.sessionId });
    await ctx.runAction(internal.stream.endVideoCall, {
      callType: "default",
      callId: session.streamCallId,
    });

    return null;
  },
});

export const getSessionAnalytics = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.object({
    totalParticipants: v.number(),
    totalJoins: v.number(),
    averageDuration: v.number(),
    peakConcurrentUsers: v.number(),
    participantsList: v.array(
      v.object({
        userId: v.id("users"),
        joinedAt: v.number(),
        leftAt: v.optional(v.number()),
        duration: v.number(),
      })
    ),
    lobbyStats: v.object({
      admittedCount: v.number(),
      averageWaitTime: v.number(),
    }),
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

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const cls = await ctx.db.get(session.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id;
    const isOrgAdmin =
      user.role === "admin" &&
      !!user.organizationId &&
      user.organizationId === cls.organizationId;

    if (!isTeacher && !isOrgAdmin) {
      throw new Error("Not authorized to view analytics for this session");
    }

    const sessionLogs = await ctx.db
      .query("sessionLogs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const uniqueParticipants = new Set(sessionLogs.map((log) => log.userId)).size;
    const totalJoins = sessionLogs.length;
    const lobbyAdmissions = sessionLogs.filter((log) => log.wasAdmittedFromLobby);

    let totalDuration = 0;
    let validDurations = 0;
    let totalWaitTime = 0;
    let validWaitTimes = 0;
    const participantsList: { userId: Id<"users">; joinedAt: number; leftAt?: number; duration: number }[] = [];
    const activeUsers = new Map<Id<"users">, number>();
    let peakConcurrentUsers = 0;
    const events: { time: number; type: "join" | "leave"; userId: Id<"users"> }[] = [];

    for (const log of sessionLogs) {
      if (log.leftAt) {
        const duration = log.leftAt - log.joinedAt;
        totalDuration += duration;
        validDurations++;
        participantsList.push({
          userId: log.userId,
          joinedAt: log.joinedAt,
          leftAt: log.leftAt,
          duration: Math.round(duration / 1000),
        });
      } else {
        participantsList.push({
          userId: log.userId,
          joinedAt: log.joinedAt,
          duration: 0,
        });
      }

      events.push({ time: log.joinedAt, type: "join", userId: log.userId });
      if (log.leftAt) {
        events.push({ time: log.leftAt, type: "leave", userId: log.userId });
      }

      if (log.wasAdmittedFromLobby) {
        totalWaitTime += log.joinedAt - session.startedAt;
        validWaitTimes++;
      }
    }

    events.sort((a, b) => a.time - b.time);
    let currentConcurrent = 0;
    for (const event of events) {
      if (event.type === "join") {
        currentConcurrent++;
        peakConcurrentUsers = Math.max(peakConcurrentUsers, currentConcurrent);
      } else {
        currentConcurrent--;
      }
    }

    const averageDuration = validDurations > 0 ? Math.round(totalDuration / validDurations / 1000) : 0;
    const averageWaitTime = validWaitTimes > 0 ? Math.round(totalWaitTime / validWaitTimes / 1000) : 0;

    return {
      totalParticipants: uniqueParticipants,
      totalJoins,
      averageDuration,
      peakConcurrentUsers,
      participantsList,
      lobbyStats: {
        admittedCount: lobbyAdmissions.length,
        averageWaitTime,
      },
    };
  },
});

export const getClassSessionHistory = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.array(
    v.object({
      _id: v.id("sessions"),
      startedAt: v.number(),
      endedAt: v.optional(v.number()),
      duration: v.optional(v.number()),
      attendanceCount: v.number(),
      recordingUrl: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id;
    const isOrgAdmin =
      user.role === "admin" &&
      !!user.organizationId &&
      user.organizationId === cls.organizationId;

    if (!isTeacher && !isOrgAdmin) {
      throw new Error("Not authorized to view session history for this class");
    }

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_class_and_started_at", (q) => q.eq("classId", args.classId))
      .order("desc")
      .take(20);

    const result = [];
    for (const session of sessions) {
      const sessionLogs = await ctx.db
        .query("sessionLogs")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      const uniqueParticipants = new Set(sessionLogs.map((log) => log.userId)).size;
      const duration = session.endedAt ? Math.round((session.endedAt - session.startedAt) / 1000) : undefined;

      result.push({
        _id: session._id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration,
        attendanceCount: uniqueParticipants,
        recordingUrl: session.recordingUrl,
      });
    }

    return result;
  },
});

export const getTeachingSchedule = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("scheduledSessions"),
      classId: v.id("classes"),
      className: v.string(),
      title: v.string(),
      scheduledAt: v.number(),
      durationMinutes: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const hasTeacherRole = user.role === "teacher" || user.role === "co_teacher" || user.role === "admin";
    if (!hasTeacherRole) {
      throw new Error("Only teachers can view teaching schedule");
    }

    const scheduledSessions = await ctx.db
      .query("scheduledSessions")
      .withIndex("by_teacher_and_scheduled_at", (q) => q.eq("teacherId", user._id))
      .order("asc")
      .collect();

    const upcomingSessions = scheduledSessions.filter((s) => !s.isArchived && s.scheduledAt >= Date.now());

    const result = [];
    for (const session of upcomingSessions) {
      const cls = await ctx.db.get(session.classId);
      if (!cls) continue;

      result.push({
        _id: session._id,
        classId: session.classId,
        className: cls.name,
        title: session.title,
        scheduledAt: session.scheduledAt,
        durationMinutes: session.durationMinutes,
      });
    }

    return result;
  },
});
