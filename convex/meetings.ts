import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

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

export const endMeeting = mutation({
  args: { meetingId: v.id("meetings") },
  returns: v.null(),
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

    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw new Error("Meeting not found");

    const isHost = meeting.hostId === user._id;
    const isOrgAdmin =
      user.role === "admin" &&
      !!user.organizationId &&
      user.organizationId === meeting.organizationId;

    if (!isHost && !isOrgAdmin) {
      throw new Error("Only the host or an admin can end a meeting");
    }

    await ctx.db.patch(args.meetingId, { status: "ended", endedAt: Date.now() });

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
