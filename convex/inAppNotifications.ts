import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

export const getMyNotifications = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("notifications"),
      type: v.union(
        v.literal("announcement"),
        v.literal("grade"),
        v.literal("session_reminder"),
        v.literal("mention"),
        v.literal("assignment")
      ),
      title: v.string(),
      message: v.string(),
      read: v.boolean(),
      link: v.optional(v.string()),
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
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity))
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const limit = args.limit ?? 50;

    let notifications;
    if (args.unreadOnly) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_read", (q) =>
          q.eq("userId", user._id).eq("read", false)
        )
        .order("desc")
        .take(limit);
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(limit);
    }

    return notifications.map((n) => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      link: n.link,
      createdAt: n.createdAt,
    }));
  },
});

export const getUnreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity))
      )
      .unique();

    if (!user) {
      return 0;
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    return notifications.length;
  },
});

export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
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

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.notificationId, { read: true });
    return null;
  },
});

export const markAllAsRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
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

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { read: true });
    }

    return null;
  },
});

export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("announcement"),
      v.literal("grade"),
      v.literal("session_reminder"),
      v.literal("mention"),
      v.literal("assignment")
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    metadata: v.optional(v.object({
      classId: v.optional(v.id("classes")),
      assignmentId: v.optional(v.id("assignments")),
      sessionId: v.optional(v.id("sessions")),
    })),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const sender = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity))
      )
      .unique();

    if (!sender) {
      throw new Error("User not found");
    }

    // Verify the target user exists
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    const notificationId: Id<"notifications"> = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      read: false,
      link: args.link,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
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

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.notificationId);
    return null;
  },
});

// Internal version for use by other Convex functions (no auth check)
export const createNotificationInternal = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("announcement"),
      v.literal("grade"),
      v.literal("session_reminder"),
      v.literal("mention"),
      v.literal("assignment")
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    metadata: v.optional(v.object({
      classId: v.optional(v.id("classes")),
      assignmentId: v.optional(v.id("assignments")),
      sessionId: v.optional(v.id("sessions")),
    })),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args): Promise<Id<"notifications">> => {
    // Verify the target user exists
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    const notificationId: Id<"notifications"> = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      read: false,
      link: args.link,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});
