import { action, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

// Helper to check if user is admin
async function isAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q: any) => q.eq("username", usernameFromIdentity(identity)))
    .unique();
    
  return user?.role === "school_admin" || user?.role === "platform_admin";
}

type InviteResult = { success: boolean; userId?: Id<"users"> };

// Invite a user to the organization (action - calls Stream)
export const inviteUser = action({
  args: {
    username: v.string(),
    displayName: v.string(),
    role: v.union(
      v.literal("student"),
      v.literal("teacher"),
      v.literal("co_teacher"),
      v.literal("parent"),
      v.literal("school_admin")
    ),
    gradeLevel: v.optional(v.number()),
    email: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), userId: v.optional(v.id("users")) }),
  handler: async (ctx, args): Promise<InviteResult> => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Only admins can invite users");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const adminUser = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!adminUser || !adminUser.organizationId) throw new Error("Admin user not found");

    // Check if username already exists
    const existing = await ctx.runQuery(
      internal.users.getUserByUsername,
      { username: args.username }
    );

    if (existing) {
      throw new Error("Username already taken");
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).substring(2, 10);
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const streamUserId = `user_${args.username}`;

    const userId: Id<"users"> = await ctx.runMutation(internal.users.createUser, {
      username: args.username,
      passwordHash,
      streamUserId,
      displayName: args.displayName,
      role: args.role,
      organizationId: adminUser.organizationId,
      gradeLevel: args.gradeLevel,
      isActive: false,
    });

    // Create Stream user
    await ctx.runAction(internal.stream.upsertStreamUser, {
      userId: streamUserId,
      displayName: args.displayName,
    });

    await ctx.runMutation(internal.auditLog.logAction, {
      organizationId: adminUser.organizationId,
      actorId: adminUser._id,
      action: "user_invited",
      targetId: userId,
      targetType: "user",
      metadata: JSON.stringify({ role: args.role }),
    });

    return { success: true, userId };
  },
});

// Internal mutation to insert invited user
export const insertInvitedUser = internalMutation({
  args: {
    username: v.string(),
    passwordHash: v.string(),
    streamUserId: v.string(),
    displayName: v.string(),
    role: v.union(
      v.literal("student"),
      v.literal("teacher"),
      v.literal("co_teacher"),
      v.literal("parent"),
      v.literal("school_admin")
    ),
    organizationId: v.id("organizations"),
    gradeLevel: v.optional(v.number()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      username: args.username,
      passwordHash: args.passwordHash,
      streamUserId: args.streamUserId,
      displayName: args.displayName,
      createdAt: Date.now(),
      role: args.role,
      organizationId: args.organizationId,
      gradeLevel: args.gradeLevel,
      isActive: false,
    });
  },
});

// Get all classes in the organization
export const getAllClasses = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("classes"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      teacherId: v.id("users"),
      name: v.string(),
      subject: v.string(),
      gradeLevel: v.number(),
      streamChannelId: v.string(),
      joinCode: v.string(),
      isArchived: v.boolean(),
      createdAt: v.number(),
      enrollmentCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Only admins can view all classes");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!adminUser || !adminUser.organizationId) throw new Error("Admin user not found");

    const orgId = adminUser.organizationId;
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();

    // Get enrollment counts for each class
    const classesWithCounts = await Promise.all(
      classes.map(async (cls) => {
        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_class", (q) => q.eq("classId", cls._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        return {
          ...cls,
          enrollmentCount: enrollments.length,
        };
      })
    );

    return classesWithCounts;
  },
});

// Get all users in the organization
export const getAllUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      username: v.string(),
      displayName: v.string(),
      role: v.optional(v.string()),
      gradeLevel: v.optional(v.number()),
      isActive: v.optional(v.boolean()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Only admins can view all users");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!adminUser || !adminUser.organizationId) throw new Error("Admin user not found");

    const orgId = adminUser.organizationId;
    const users = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .take(50);

    return users.map((u) => ({
      _id: u._id,
      _creationTime: u._creationTime,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      gradeLevel: u.gradeLevel,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
  },
});

// Deactivate a user
export const deactivateUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Only admins can deactivate users");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();
    if (!adminUser?.organizationId) throw new Error("Admin user not found");

    await ctx.db.patch(args.userId, { isActive: false });
    await ctx.runMutation(internal.auditLog.logAction, {
      organizationId: adminUser.organizationId,
      actorId: adminUser._id,
      action: "user_deactivated",
      targetId: args.userId,
      targetType: "user",
    });
    return null;
  },
});

// Reactivate a user
export const reactivateUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Only admins can reactivate users");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();
    if (!adminUser?.organizationId) throw new Error("Admin user not found");

    await ctx.db.patch(args.userId, { isActive: true });
    await ctx.runMutation(internal.auditLog.logAction, {
      organizationId: adminUser.organizationId,
      actorId: adminUser._id,
      action: "user_reactivated",
      targetId: args.userId,
      targetType: "user",
    });
    return null;
  },
});
