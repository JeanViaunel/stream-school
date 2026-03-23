import { action, mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

/** Users with no `organizationId` are omitted from `by_organization`; merge them for the canonical default org or single-tenant deployments. */
async function collectUsersForOrg(
  ctx: QueryCtx,
  orgId: Id<"organizations">,
): Promise<Array<Doc<"users">>> {
  const inOrg = await ctx.db
    .query("users")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .collect();

  const byId = new Map(inOrg.map((u) => [u._id, u]));

  const allOrgs = await ctx.db.query("organizations").collect();
  const defaultOrg = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q) => q.eq("slug", "default"))
    .unique();

  const includeUsersWithoutOrg =
    (allOrgs.length === 1 && allOrgs[0]._id === orgId) ||
    (defaultOrg !== null && orgId === defaultOrg._id);

  if (includeUsersWithoutOrg) {
    const allUsers = await ctx.db.query("users").collect();
    for (const u of allUsers) {
      if (u.organizationId === undefined && !byId.has(u._id)) {
        byId.set(u._id, u);
      }
    }
  }

  return Array.from(byId.values());
}

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
      organizationId: v.optional(v.id("organizations")),
    })
  ),
  handler: async (ctx) => {
    const { orgId } = await requireAdmin(
      ctx,
      "Only admins can view all users"
    );

    const users = (await collectUsersForOrg(ctx, orgId)).sort(
      (a, b) => b.createdAt - a.createdAt,
    );

    return users.map((u) => ({
      _id: u._id,
      _creationTime: u._creationTime,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      gradeLevel: u.gradeLevel,
      isActive: u.isActive,
      createdAt: u.createdAt,
      organizationId: u.organizationId,
    }));
  },
});

const previewUserForOrgValidator = v.object({
  _id: v.id("users"),
  username: v.string(),
  displayName: v.string(),
  organizationId: v.optional(v.id("organizations")),
});

/** Look up any user by username so an admin can attach them to the organization. */
export const previewUserForAddToOrganization = query({
  args: { username: v.string() },
  returns: v.union(previewUserForOrgValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "Only admins can look up users");

    const trimmed = args.username.trim();
    if (!trimmed) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", trimmed))
      .unique();

    if (!user) return null;

    return {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      organizationId: user.organizationId,
    };
  },
});

/** Assign a user to the admin's organization (idempotent; transfers from another org if needed). */
export const addUserToOrganization = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { adminUser, orgId } = await requireAdmin(
      ctx,
      "Only admins can add users to the organization",
    );

    if (args.userId === adminUser._id) {
      throw new Error("You cannot change your own organization here");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");

    if (target.organizationId === orgId) {
      return null;
    }

    const previousOrganizationId = target.organizationId ?? null;

    await ctx.db.patch(args.userId, { organizationId: orgId });

    await ctx.runMutation(internal.auditLog.logAction, {
      organizationId: orgId,
      actorId: adminUser._id,
      action: "user_added_to_organization",
      targetId: args.userId,
      targetType: "user",
      metadata: JSON.stringify({
        previousOrganizationId,
      }),
    });

    return null;
  },
});

/** Clear organization membership for a user who is explicitly assigned to this org. */
export const removeUserFromOrganization = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { adminUser, orgId } = await requireAdmin(
      ctx,
      "Only admins can remove users from the organization",
    );

    if (args.userId === adminUser._id) {
      throw new Error("You cannot remove yourself from the organization");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");

    if (target.organizationId !== orgId) {
      throw new Error(
        "User is not assigned to your organization (legacy accounts without an org cannot be removed this way)",
      );
    }

    if (target.role === "admin") {
      const adminsInOrg = await ctx.db
        .query("users")
        .withIndex("by_role_and_organization", (q) =>
          q.eq("role", "admin").eq("organizationId", orgId),
        )
        .collect();
      if (
        adminsInOrg.length === 1 &&
        adminsInOrg[0]._id === target._id
      ) {
        throw new Error(
          "Cannot remove the only administrator assigned to this organization",
        );
      }
    }

    await ctx.db.patch(args.userId, { organizationId: undefined });

    await ctx.runMutation(internal.auditLog.logAction, {
      organizationId: orgId,
      actorId: adminUser._id,
      action: "user_removed_from_organization",
      targetId: args.userId,
      targetType: "user",
      metadata: JSON.stringify({}),
    });

    return null;
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

    const users = await collectUsersForOrg(ctx, orgId);

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

const organizationDocValidator = v.object({
  _id: v.id("organizations"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  logoUrl: v.optional(v.string()),
  primaryColor: v.optional(v.string()),
  createdAt: v.number(),
  settings: v.object({
    studentDmsEnabled: v.boolean(),
    recordingEnabled: v.boolean(),
    lobbyEnabled: v.boolean(),
    maxClassSize: v.number(),
    dataRetentionDays: v.number(),
  }),
});

export const getMyOrganization = query({
  args: {},
  returns: v.union(organizationDocValidator, v.null()),
  handler: async (ctx) => {
    const { orgId } = await requireAdmin(
      ctx,
      "Only admins can view organization settings",
    );
    const org = await ctx.db.get(orgId);
    return org ?? null;
  },
});

export const updateMyOrganization = mutation({
  args: {
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    logoUrl: v.optional(v.union(v.string(), v.null())),
    primaryColor: v.optional(v.union(v.string(), v.null())),
    settings: v.optional(
      v.object({
        studentDmsEnabled: v.optional(v.boolean()),
        recordingEnabled: v.optional(v.boolean()),
        lobbyEnabled: v.optional(v.boolean()),
        maxClassSize: v.optional(v.number()),
        dataRetentionDays: v.optional(v.number()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { adminUser, orgId } = await requireAdmin(
      ctx,
      "Only admins can update organization settings",
    );

    const org = await ctx.db.get(orgId);
    if (!org) throw new Error("Organization not found");

    if (args.slug !== undefined) {
      const slug = args.slug.trim().toLowerCase();
      if (slug.length < 2) {
        throw new Error("Slug must be at least 2 characters");
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(
          "Slug may only contain lowercase letters, numbers, and hyphens",
        );
      }
      if (slug !== org.slug) {
        const taken = await ctx.db
          .query("organizations")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .unique();
        if (taken !== null) {
          throw new Error("This slug is already in use");
        }
      }
    }

    if (args.name !== undefined && !args.name.trim()) {
      throw new Error("Name cannot be empty");
    }

    const nextSettings =
      args.settings !== undefined
        ? {
            studentDmsEnabled:
              args.settings.studentDmsEnabled ?? org.settings.studentDmsEnabled,
            recordingEnabled:
              args.settings.recordingEnabled ?? org.settings.recordingEnabled,
            lobbyEnabled: args.settings.lobbyEnabled ?? org.settings.lobbyEnabled,
            maxClassSize: args.settings.maxClassSize ?? org.settings.maxClassSize,
            dataRetentionDays:
              args.settings.dataRetentionDays ?? org.settings.dataRetentionDays,
          }
        : org.settings;

    if (nextSettings.maxClassSize < 1 || nextSettings.maxClassSize > 500) {
      throw new Error("Max class size must be between 1 and 500");
    }
    if (nextSettings.dataRetentionDays < 1) {
      throw new Error("Data retention must be at least 1 day");
    }

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.slug !== undefined) patch.slug = args.slug.trim().toLowerCase();
    if (args.logoUrl !== undefined) {
      patch.logoUrl =
        args.logoUrl === null || args.logoUrl === "" ? undefined : args.logoUrl;
    }
    if (args.primaryColor !== undefined) {
      patch.primaryColor =
        args.primaryColor === null || args.primaryColor === ""
          ? undefined
          : args.primaryColor;
    }
    if (args.settings !== undefined) patch.settings = nextSettings;

    await ctx.db.patch(orgId, patch as Partial<Doc<"organizations">>);

    await ctx.runMutation(internal.auditLog.logAction, {
      organizationId: orgId,
      actorId: adminUser._id,
      action: "organization_updated",
      targetId: orgId,
      targetType: "organization",
      metadata: JSON.stringify({
        fields: Object.keys(patch),
      }),
    });

    return null;
  },
});
