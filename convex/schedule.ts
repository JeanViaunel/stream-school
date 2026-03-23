import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

export const createScheduledSession = mutation({
  args: {
    classId: v.id("classes"),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledAt: v.number(),
    durationMinutes: v.optional(v.number()),
  },
  returns: v.object({
    sessionId: v.id("scheduledSessions"),
    icalUid: v.string(),
  }),
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

    if (cls.teacherId !== user._id) {
      throw new Error("Only the teacher of this class can create scheduled sessions");
    }

    const durationMinutes = args.durationMinutes ?? 60;
    const random = Math.random().toString(36).substring(2, 9);
    const icalUid = `${args.classId}-${args.scheduledAt}-${random}`;

    const sessionId: Id<"scheduledSessions"> = await ctx.db.insert("scheduledSessions", {
      classId: args.classId,
      teacherId: user._id,
      title: args.title,
      description: args.description,
      scheduledAt: args.scheduledAt,
      durationMinutes,
      icalUid,
      isArchived: false,
      createdAt: Date.now(),
    });

    return {
      sessionId,
      icalUid,
    };
  },
});

export const getUpcoming = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      sessionId: v.id("scheduledSessions"),
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

    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now + days * 24 * 60 * 60 * 1000;

    const classIds: Id<"classes">[] = [];

    if (user.role === "teacher" || user.role === "school_admin" || user.role === "platform_admin") {
      const taughtClasses = await ctx.db
        .query("classes")
        .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
        .filter((q) => q.eq(q.field("isArchived"), false))
        .collect();
      classIds.push(...taughtClasses.map((c) => c._id));
    }

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const enrollment of enrollments) {
      if (!classIds.includes(enrollment.classId)) {
        classIds.push(enrollment.classId);
      }
    }

    const sessions: {
      sessionId: Id<"scheduledSessions">;
      classId: Id<"classes">;
      className: string;
      title: string;
      scheduledAt: number;
      durationMinutes: number;
    }[] = [];

    for (const classId of classIds) {
      const classSessions = await ctx.db
        .query("scheduledSessions")
        .withIndex("by_class_and_scheduled_at", (q) => q.eq("classId", classId))
        .filter((q) => q.eq(q.field("isArchived"), false))
        .filter((q) => q.gte(q.field("scheduledAt"), now))
        .filter((q) => q.lte(q.field("scheduledAt"), cutoff))
        .order("asc")
        .collect();

      const cls = await ctx.db.get(classId);
      if (!cls) continue;

      for (const session of classSessions) {
        sessions.push({
          sessionId: session._id,
          classId: session.classId,
          className: cls.name,
          title: session.title,
          scheduledAt: session.scheduledAt,
          durationMinutes: session.durationMinutes,
        });
      }
    }

    sessions.sort((a, b) => a.scheduledAt - b.scheduledAt);

    return sessions;
  },
});

export const deleteScheduledSession = mutation({
  args: {
    sessionId: v.id("scheduledSessions"),
  },
  returns: v.null(),
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

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const cls = await ctx.db.get(session.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    if (cls.teacherId !== user._id) {
      throw new Error("Only the teacher of this class can delete scheduled sessions");
    }

    await ctx.db.patch(args.sessionId, { isArchived: true });
    return null;
  },
});

export const getSessionsByClass = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.array(
    v.object({
      _id: v.id("scheduledSessions"),
      _creationTime: v.number(),
      classId: v.id("classes"),
      teacherId: v.id("users"),
      title: v.string(),
      description: v.optional(v.string()),
      scheduledAt: v.number(),
      durationMinutes: v.number(),
      icalUid: v.string(),
      isArchived: v.boolean(),
      createdAt: v.number(),
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
      .query("scheduledSessions")
      .withIndex("by_class_and_scheduled_at", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("asc")
      .collect();

    return sessions;
  },
});

export const getSessionById = query({
  args: {
    sessionId: v.id("scheduledSessions"),
  },
  returns: v.union(
    v.object({
      session: v.object({
        _id: v.id("scheduledSessions"),
        _creationTime: v.number(),
        classId: v.id("classes"),
        teacherId: v.id("users"),
        title: v.string(),
        description: v.optional(v.string()),
        scheduledAt: v.number(),
        durationMinutes: v.number(),
        icalUid: v.string(),
        isArchived: v.boolean(),
        createdAt: v.number(),
      }),
      class: v.object({
        _id: v.id("classes"),
        name: v.string(),
        subject: v.string(),
      }),
    }),
    v.null()
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

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.isArchived) {
      return null;
    }

    const cls = await ctx.db.get(session.classId);
    if (!cls) {
      return null;
    }

    const isTeacher = cls.teacherId === user._id;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", session.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isTeacher && !isEnrolled) {
      throw new Error("Not authorized to view this session");
    }

    return {
      session,
      class: {
        _id: cls._id,
        name: cls.name,
        subject: cls.subject,
      },
    };
  },
});

export const listScheduledSessionsForExport = internalQuery({
  args: {
    classId: v.id("classes"),
  },
  returns: v.array(
    v.object({
      _id: v.id("scheduledSessions"),
      _creationTime: v.number(),
      classId: v.id("classes"),
      teacherId: v.id("users"),
      title: v.string(),
      description: v.optional(v.string()),
      scheduledAt: v.number(),
      durationMinutes: v.number(),
      icalUid: v.string(),
      isArchived: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("scheduledSessions")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();
    return rows.filter((r) => !r.isArchived);
  },
});
