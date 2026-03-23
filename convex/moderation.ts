import { internalMutation, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

// Flag a message for moderation
export const flagMessage = internalMutation({
  args: {
    messageId: v.string(),
    channelId: v.string(),
    userId: v.id("users"),
    messageText: v.string(),
    toxicityScore: v.number(),
    severeToxicityScore: v.number(),
    identityAttackScore: v.number(),
  },
  returns: v.id("moderationFlags"),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.organizationId) {
      throw new Error("User not found or not associated with an organization");
    }

    return await ctx.db.insert("moderationFlags", {
      messageId: args.messageId,
      channelId: args.channelId,
      userId: args.userId,
      messageText: args.messageText,
      toxicityScore: args.toxicityScore,
      severeToxicityScore: args.severeToxicityScore,
      identityAttackScore: args.identityAttackScore,
      status: "pending",
      organizationId: user.organizationId,
      createdAt: Date.now(),
    });
  },
});

async function isTeacherOrAdmin(ctx: QueryCtx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
    .unique();

  return (
    user?.role === "teacher" ||
    user?.role === "admin"
  );
}

// Review a flagged message - returns data needed to perform action
export const reviewFlag = internalMutation({
  args: {
    flagId: v.id("moderationFlags"),
    status: v.union(
      v.literal("reviewed"),
      v.literal("actioned"),
      v.literal("dismissed")
    ),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    shouldDelete: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (!(await isTeacherOrAdmin(ctx))) {
      throw new Error("Only teachers and admins can review flagged messages");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const reviewer = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!reviewer) throw new Error("Reviewer not found");

    const flag = await ctx.db.get(args.flagId);
    if (!flag) throw new Error("Flag not found");

    // Update flag status
    await ctx.db.patch(args.flagId, {
      status: args.status,
      reviewedBy: reviewer._id,
      reviewedAt: Date.now(),
    });

    // Return info needed for action (action must be called separately)
    return {
      success: true,
      messageId: flag.messageId,
      shouldDelete: args.status === "actioned",
    };
  },
});

// Get moderation flag queue for organization
export const getFlagQueue = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("actioned"),
      v.literal("dismissed")
    )),
  },
  returns: v.array(
    v.object({
      _id: v.id("moderationFlags"),
      _creationTime: v.number(),
      messageId: v.string(),
      channelId: v.string(),
      userId: v.id("users"),
      messageText: v.string(),
      toxicityScore: v.number(),
      severeToxicityScore: v.number(),
      identityAttackScore: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("reviewed"),
        v.literal("actioned"),
        v.literal("dismissed")
      ),
      reviewedBy: v.optional(v.id("users")),
      reviewedAt: v.optional(v.number()),
      organizationId: v.id("organizations"),
      createdAt: v.number(),
      userDisplayName: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    if (!(await isTeacherOrAdmin(ctx))) {
      throw new Error("Only teachers and admins can view moderation queue");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user || !user.organizationId) {
      throw new Error("User not found or not associated with an organization");
    }

    const orgId = user.organizationId!;
    const flags = await (
      args.status
        ? ctx.db
            .query("moderationFlags")
            .withIndex("by_organization_and_status", (q) =>
              q.eq("organizationId", orgId).eq("status", args.status!)
            )
            .order("desc")
            .take(100)
        : ctx.db
            .query("moderationFlags")
            .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
            .order("desc")
            .take(100)
    );

    // Get user display names
    const flagsWithUserInfo = await Promise.all(
      flags.map(async (flag) => {
        const flagUser = await ctx.db.get(flag.userId);
        return {
          ...flag,
          userDisplayName: flagUser?.displayName || "Unknown User",
        };
      })
    );

    return flagsWithUserInfo;
  },
});
