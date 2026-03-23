import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

async function requireAdmin(
  ctx: any,
  operationErrorMessage: string,
): Promise<{ adminUser: any; orgId: Id<"organizations"> }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error(operationErrorMessage);

  const adminUser = await ctx.db
    .query("users")
    .withIndex(
      "by_username",
      (q: any) => q.eq("username", usernameFromIdentity(identity)),
    )
    .unique();

  const isAdminRole = adminUser?.role === "admin";

  if (!adminUser || !isAdminRole) throw new Error(operationErrorMessage);
  if (!adminUser.organizationId) throw new Error("Admin user not found");

  return { adminUser, orgId: adminUser.organizationId };
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
      v.literal("admin")
    ),
    gradeLevel: v.optional(v.number()),
    email: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), userId: v.optional(v.id("users")) }),
  handler: async (ctx, args): Promise<InviteResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const adminUser = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!adminUser) throw new Error("Only admins can invite users");
    if (adminUser.role !== "admin") {
      throw new Error("Only admins can invite users");
    }
    if (!adminUser.organizationId) throw new Error("Admin user not found");

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

// Get all classes in the organization
export const getAllClasses = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("classes"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      teacherId: v.id("users"),
      teacherDisplayName: v.optional(v.string()),
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
    const { orgId } = await requireAdmin(
      ctx,
      "Only admins can view all classes",
    );
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

        const teacher = await ctx.db.get(cls.teacherId);

        return {
          ...cls,
          enrollmentCount: enrollments.length,
          teacherDisplayName: teacher?.displayName,
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
    // Admins can view ALL users (across organizations).
    await requireAdmin(ctx, "Only admins can view all users");

    const users = await ctx.db.query("users").collect();

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

// Get dashboard user/class stats for admin overview cards
export const getDashboardStats = query({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    activeUsers: v.number(),
    totalStudents: v.number(),
    totalTeachers: v.number(),
    totalClasses: v.number(),
    activeClasses: v.number(),
  }),
  handler: async (ctx) => {
    const { orgId } = await requireAdmin(
      ctx,
      "Only admins can view dashboard stats",
    );

    const users = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();

    const totalUsers = users.length;
    const activeUsers = users.filter((u) => !!u.isActive).length;
    const totalStudents = users.filter((u) => u.role === "student").length;
    const totalTeachers = users.filter((u) => u.role === "teacher").length;
    const totalClasses = classes.length;
    const activeClasses = classes.filter((c) => !c.isArchived).length;

    return {
      totalUsers,
      activeUsers,
      totalStudents,
      totalTeachers,
      totalClasses,
      activeClasses,
    };
  },
});

// Update a user's role (admins can update everyone except themselves).
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("student"),
      v.literal("teacher"),
      v.literal("co_teacher"),
      v.literal("parent"),
      v.literal("admin")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { adminUser, orgId } = await requireAdmin(
      ctx,
      "Only admins can update user roles",
    );

    if (args.userId === adminUser._id) {
      throw new Error("You cannot change your own role");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");

    const fromRole = targetUser.role ?? null;
    await ctx.db.patch(args.userId, { role: args.role });

    const auditOrgId = targetUser.organizationId ?? orgId;
    // `organizationId` is required by auditLogs schema; `orgId` comes from requireAdmin.
    if (!auditOrgId) throw new Error("Admin user not found");

    await ctx.runMutation(internal.auditLog.logAction, {
      organizationId: auditOrgId,
      actorId: adminUser._id,
      action: "user_role_updated",
      targetId: args.userId,
      targetType: "user",
      metadata: JSON.stringify({ fromRole, toRole: args.role }),
    });

    return null;
  },
});

// Deactivate a user
export const deactivateUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { adminUser, orgId } = await requireAdmin(
      ctx,
      "Only admins can deactivate users",
    );

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, { isActive: false });

    const auditOrgId = user.organizationId ?? orgId;
    if (!auditOrgId) throw new Error("Admin user not found");

    await ctx.runMutation(internal.auditLog.logAction, {
      organizationId: auditOrgId,
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
    const { adminUser, orgId } = await requireAdmin(
      ctx,
      "Only admins can reactivate users",
    );

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, { isActive: true });

    const auditOrgId = user.organizationId ?? orgId;
    if (!auditOrgId) throw new Error("Admin user not found");

    await ctx.runMutation(internal.auditLog.logAction, {
      organizationId: auditOrgId,
      actorId: adminUser._id,
      action: "user_reactivated",
      targetId: args.userId,
      targetType: "user",
    });
    return null;
  },
});
