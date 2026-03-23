import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * True if the user is in the org (same id) or is a legacy row with no organizationId
 * but still listed in admin org lists (single default org / default slug org).
 * Matches `collectUsersForOrg` in admin.ts.
 */
export const userMatchesOrgForAdmin = internalQuery({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return false;
    if (user.organizationId === args.organizationId) return true;
    if (user.organizationId !== undefined) return false;

    const allOrgs = await ctx.db.query("organizations").collect();
    const defaultOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "default"))
      .unique();

    const orphanCountsAsInOrg =
      (allOrgs.length === 1 && allOrgs[0]._id === args.organizationId) ||
      (defaultOrg !== null && args.organizationId === defaultOrg._id);

    return orphanCountsAsInOrg;
  },
});

/** Backfill a legacy user into the org once an admin assigns them to org-scoped resources. */
export const setOrganizationIfUnset = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (user.organizationId === undefined) {
      await ctx.db.patch(args.userId, { organizationId: args.organizationId });
    }
    return null;
  },
});

export const getUserByUsername = internalQuery({
  args: { username: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      username: v.string(),
      passwordHash: v.string(),
      displayName: v.string(),
      streamUserId: v.string(),
      createdAt: v.number(),
      role: v.optional(v.union(
        v.literal("student"),
        v.literal("teacher"),
        v.literal("co_teacher"),
        v.literal("parent"),
        v.literal("admin")
      )),
      organizationId: v.optional(v.id("organizations")),
      gradeLevel: v.optional(v.number()),
      avatarUrl: v.optional(v.string()),
      parentConsentGiven: v.optional(v.boolean()),
      parentConsentAt: v.optional(v.number()),
      isActive: v.optional(v.boolean()),
      lastSeenAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, { username }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
  },
});

export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      username: v.string(),
      displayName: v.string(),
      streamUserId: v.string(),
      createdAt: v.number(),
      role: v.optional(
        v.union(
          v.literal("student"),
          v.literal("teacher"),
          v.literal("co_teacher"),
          v.literal("parent"),
          v.literal("admin")
        )
      ),
      organizationId: v.optional(v.id("organizations")),
      gradeLevel: v.optional(v.number()),
      avatarUrl: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
      lastSeenAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, { userId }) => {
    // Keep return shape explicit so actions can validate role/org.
    const user = await ctx.db.get(userId);
    return user ? {
      _id: user._id,
      _creationTime: user._creationTime,
      username: user.username,
      displayName: user.displayName,
      streamUserId: user.streamUserId,
      createdAt: user.createdAt,
      role: user.role,
      organizationId: user.organizationId,
      gradeLevel: user.gradeLevel,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      lastSeenAt: user.lastSeenAt,
    } : null;
  },
});

export const createUser = internalMutation({
  args: {
    username: v.string(),
    passwordHash: v.string(),
    displayName: v.string(),
    streamUserId: v.string(),
    role: v.optional(v.union(
      v.literal("student"),
      v.literal("teacher"),
      v.literal("co_teacher"),
      v.literal("parent"),
      v.literal("admin")
    )),
    organizationId: v.optional(v.id("organizations")),
    gradeLevel: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    if (existing !== null) throw new Error("Username already taken");
    return await ctx.db.insert("users", {
      username: args.username,
      passwordHash: args.passwordHash,
      streamUserId: args.streamUserId,
      displayName: args.displayName,
      createdAt: Date.now(),
      role: args.role,
      organizationId: args.organizationId,
      gradeLevel: args.gradeLevel,
      isActive: args.isActive,
    });
  },
});

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const scheduleDeletion = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const at = Date.now() + THIRTY_DAYS_MS;
    await ctx.db.patch(args.userId, {
      isActive: false,
      deletionScheduledAt: at,
    });
    return null;
  },
});
