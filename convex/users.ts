import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

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
        v.literal("school_admin"),
        v.literal("platform_admin")
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
      v.literal("school_admin"),
      v.literal("platform_admin")
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
