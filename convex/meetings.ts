import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";
import { internal } from "./_generated/api";

const ALLOWED_ROLES = ["teacher", "co_teacher", "admin"] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

function canCreateMeeting(role: string | undefined): role is AllowedRole {
  return ALLOWED_ROLES.includes(role as AllowedRole);
}

export const createMeeting = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
  },
  returns: v.object({
    meetingId: v.id("meetings"),
    streamCallId: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity)),
      )
      .unique();

    if (!user) throw new Error("User not found");

    if (!canCreateMeeting(user.role)) {
      throw new Error("Only teachers and admins can create meetings");
    }

    if (!user.organizationId) {
      throw new Error("User must belong to an organization");
    }

    if (!args.title.trim()) throw new Error("Meeting title cannot be empty");

    const streamCallId = `meeting_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const isInstant = !args.scheduledAt;
    const status = isInstant ? "active" : "scheduled";
    const startedAt = isInstant ? Date.now() : undefined;

    const meetingId: Id<"meetings"> = await ctx.db.insert("meetings", {
      organizationId: user.organizationId,
      hostId: user._id,
      title: args.title.trim(),
      description: args.description,
      streamCallId,
      scheduledAt: args.scheduledAt,
      startedAt,
      status,
      createdAt: Date.now(),
    });

    return { meetingId, streamCallId };
  },
});

// Internal helpers for endMeeting action
const endMeetingValidator = v.union(
  v.object({ ok: v.literal(true), streamCallId: v.string() }),
  v.object({ ok: v.literal(false), error: v.string() }),
);

export const validateEndMeeting = internalQuery({
  args: { meetingId: v.id("meetings"), username: v.string() },
  returns: endMeetingValidator,
  handler: async (ctx, { meetingId, username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!user) return { ok: false as const, error: "User not found" };

    const meeting = await ctx.db.get(meetingId);
    if (!meeting) return { ok: false as const, error: "Meeting not found" };
    if (meeting.status === "ended") return { ok: false as const, error: "Meeting already ended" };

    const isHost = meeting.hostId === user._id;
    const isOrgAdmin =
      user.role === "admin" &&
      !!user.organizationId &&
      user.organizationId === meeting.organizationId;

    if (!isHost && !isOrgAdmin) {
      return { ok: false as const, error: "Only the host or an admin can end a meeting" };
    }
    return { ok: true as const, streamCallId: meeting.streamCallId };
  },
});

export const markMeetingEnded = internalMutation({
  args: { meetingId: v.id("meetings") },
  returns: v.null(),
  handler: async (ctx, { meetingId }) => {
    await ctx.db.patch(meetingId, { status: "ended", endedAt: Date.now() });
    return null;
  },
});

export const endMeeting = action({
  args: { meetingId: v.id("meetings") },
  returns: v.null(),
  handler: async (ctx, { meetingId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const result: { ok: boolean; streamCallId?: string; error?: string } =
      await ctx.runQuery(internal.meetings.validateEndMeeting, {
        meetingId,
        username: usernameFromIdentity(identity),
      });

    if (!result.ok) throw new Error(result.error);

    await ctx.runMutation(internal.meetings.markMeetingEnded, { meetingId });

    // Terminate the Stream call server-side so no one can rejoin
    await ctx.runAction(internal.stream.endVideoCall, {
      callType: "default",
      callId: result.streamCallId!,
    });

    return null;
  },
});

const meetingRowValidator = v.object({
  _id: v.id("meetings"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  hostId: v.id("users"),
  hostDisplayName: v.optional(v.string()),
  title: v.string(),
  description: v.optional(v.string()),
  streamCallId: v.string(),
  scheduledAt: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  endedAt: v.optional(v.number()),
  status: v.union(
    v.literal("scheduled"),
    v.literal("active"),
    v.literal("ended"),
  ),
  createdAt: v.number(),
});

export const getMyMeetings = query({
  args: {},
  returns: v.array(meetingRowValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity)),
      )
      .unique();

    if (!user) throw new Error("User not found");

    if (!canCreateMeeting(user.role)) {
      throw new Error("Only teachers and admins can access meetings");
    }

    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_host", (q) => q.eq("hostId", user._id))
      .order("desc")
      .collect();

    return meetings.map((m) => ({ ...m, hostDisplayName: user.displayName }));
  },
});

export const getAllMeetingsByOrg = query({
  args: {},
  returns: v.array(meetingRowValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity)),
      )
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can view all organization meetings");
    }

    if (!user.organizationId) throw new Error("Admin has no organization");

    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", user.organizationId!),
      )
      .order("desc")
      .collect();

    const withHosts = await Promise.all(
      meetings.map(async (m) => {
        const host = await ctx.db.get(m.hostId);
        return { ...m, hostDisplayName: host?.displayName };
      }),
    );

    return withHosts;
  },
});

export const getMeetingByStreamCallId = query({
  args: { streamCallId: v.string() },
  returns: v.union(meetingRowValidator, v.null()),
  handler: async (ctx, { streamCallId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const meeting = await ctx.db
      .query("meetings")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", streamCallId))
      .unique();

    if (!meeting) return null;

    const host = await ctx.db.get(meeting.hostId);
    return { ...meeting, hostDisplayName: host?.displayName };
  },
});
