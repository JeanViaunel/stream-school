import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { usernameFromIdentity } from "./authHelpers";

/**
 * Mark recording as started in session (mutation)
 * Called when user clicks Start Recording button
 */
export const markRecordingStarted = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity))
      )
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

    const isTeacher = cls.teacherId === user._id;
    const hasTeacherRole =
      user.role === "teacher" ||
      user.role === "co_teacher" ||
      user.role === "admin";

    if (!isTeacher || !hasTeacherRole) {
      throw new Error("Only the class teacher can start recording");
    }

    await ctx.db.patch(args.sessionId, { recordingStartedAt: Date.now() });
    return null;
  },
});

/**
 * Mark recording as ended in session (mutation)
 * Called when user clicks Stop Recording button
 */
export const markRecordingEnded = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity))
      )
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

    const isTeacher = cls.teacherId === user._id;
    const hasTeacherRole =
      user.role === "teacher" ||
      user.role === "co_teacher" ||
      user.role === "admin";

    if (!isTeacher || !hasTeacherRole) {
      throw new Error("Only the class teacher can stop recording");
    }

    await ctx.db.patch(args.sessionId, { recordingEndedAt: Date.now() });
    return null;
  },
});

/**
 * Internal version of markRecordingStarted for webhook handlers
 * Used by Stream webhook callbacks
 */
export const markRecordingStartedInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { recordingStartedAt: Date.now() });
    return null;
  },
});

/**
 * Internal version of markRecordingEnded for webhook handlers
 * Used by Stream webhook callbacks
 */
export const markRecordingEndedInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { recordingEndedAt: Date.now() });
    return null;
  },
});
