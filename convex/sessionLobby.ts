import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { usernameFromIdentity } from "./authHelpers";

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) =>
      q.eq("username", usernameFromIdentity(identity))
    )
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

/** Same access rule as getActiveSessionForClass for this class. */
async function canAccessClassSession(
  ctx: QueryCtx | MutationCtx,
  classId: Id<"classes">,
  user: { _id: Id<"users">; role?: string; organizationId?: Id<"organizations"> }
): Promise<boolean> {
  const cls = await ctx.db.get(classId);
  if (!cls) return false;
  const isTeacher = cls.teacherId === user._id;
  const isOrgAdmin =
    user.role === "admin" &&
    !!user.organizationId &&
    user.organizationId === cls.organizationId;
  const isEnrolled = await ctx.db
    .query("enrollments")
    .withIndex("by_class_and_student", (q) =>
      q.eq("classId", classId).eq("studentId", user._id)
    )
    .unique();
  return isTeacher || isOrgAdmin || !!isEnrolled;
}

function isSessionHostTeacher(
  session: { hostId: Id<"users"> },
  cls: { teacherId: Id<"users"> },
  userId: Id<"users">
): boolean {
  return cls.teacherId === userId || session.hostId === userId;
}

export const requestLobbyAccess = mutation({
  args: {
    sessionId: v.id("sessions"),
    streamUserId: v.string(),
    displayName: v.string(),
  },
  returns: v.id("sessionLobbyRequests"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.endedAt !== undefined) throw new Error("Session has ended");

    const allowed = await canAccessClassSession(ctx, session.classId, user);
    if (!allowed) throw new Error("Not allowed to join this session");

    const cls = await ctx.db.get(session.classId);
    if (!cls) throw new Error("Class not found");
    if (isSessionHostTeacher(session, cls, user._id)) {
      throw new Error("Host joins directly — lobby is for other participants");
    }

    const existing = await ctx.db
      .query("sessionLobbyRequests")
      .withIndex("by_session_and_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", user._id)
      )
      .unique();

    const now = Date.now();
    if (existing) {
      if (existing.status === "pending" || existing.status === "admitted") {
        return existing._id;
      }
      await ctx.db.patch(existing._id, {
        status: "pending",
        streamUserId: args.streamUserId,
        displayName: args.displayName,
        requestedAt: now,
        resolvedAt: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("sessionLobbyRequests", {
      sessionId: args.sessionId,
      userId: user._id,
      streamUserId: args.streamUserId,
      displayName: args.displayName,
      status: "pending",
      requestedAt: now,
    });
  },
});

export const getMyLobbyRequestForSession = query({
  args: { sessionId: v.id("sessions") },
  returns: v.union(
    v.object({
      _id: v.id("sessionLobbyRequests"),
      status: v.union(
        v.literal("pending"),
        v.literal("admitted"),
        v.literal("denied")
      ),
      requestedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity))
      )
      .unique();
    if (!user) return null;

    const row = await ctx.db
      .query("sessionLobbyRequests")
      .withIndex("by_session_and_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", user._id)
      )
      .unique();
    if (!row) return null;
    return {
      _id: row._id,
      status: row.status,
      requestedAt: row.requestedAt,
    };
  },
});

export const listPendingLobbyForSession = query({
  args: { sessionId: v.id("sessions") },
  returns: v.array(
    v.object({
      _id: v.id("sessionLobbyRequests"),
      userId: v.id("users"),
      streamUserId: v.string(),
      displayName: v.string(),
      requestedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity))
      )
      .unique();
    if (!user) return [];

    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    const cls = await ctx.db.get(session.classId);
    if (!cls) return [];

    if (!isSessionHostTeacher(session, cls, user._id)) return [];

    const rows = await ctx.db
      .query("sessionLobbyRequests")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return rows
      .filter((r) => r.status === "pending")
      .map((r) => ({
        _id: r._id,
        userId: r.userId,
        streamUserId: r.streamUserId,
        displayName: r.displayName,
        requestedAt: r.requestedAt,
      }));
  },
});

export const admitLobbyRequest = mutation({
  args: { requestId: v.id("sessionLobbyRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") return null;

    const session = await ctx.db.get(req.sessionId);
    if (!session) throw new Error("Session not found");
    const cls = await ctx.db.get(session.classId);
    if (!cls) throw new Error("Class not found");

    if (!isSessionHostTeacher(session, cls, user._id)) {
      throw new Error("Only the teacher can admit");
    }

    await ctx.db.patch(args.requestId, {
      status: "admitted",
      resolvedAt: Date.now(),
    });
    return null;
  },
});

export const denyLobbyRequest = mutation({
  args: { requestId: v.id("sessionLobbyRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") return null;

    const session = await ctx.db.get(req.sessionId);
    if (!session) throw new Error("Session not found");
    const cls = await ctx.db.get(session.classId);
    if (!cls) throw new Error("Class not found");

    if (!isSessionHostTeacher(session, cls, user._id)) {
      throw new Error("Only the teacher can deny");
    }

    await ctx.db.patch(args.requestId, {
      status: "denied",
      resolvedAt: Date.now(),
    });
    return null;
  },
});
