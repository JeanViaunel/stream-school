import { internalMutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

async function requireAdminOrg(ctx: QueryCtx): Promise<{
  userId: Id<"users">;
  orgId: Id<"organizations">;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
    .unique();
  if (!user || !user.organizationId) {
    throw new Error("User not found");
  }
  if (user.role !== "admin") {
    throw new Error("Only admins can view audit logs");
  }
  return { userId: user._id, orgId: user.organizationId };
}

export const logAction = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    actorId: v.id("users"),
    action: v.string(),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  returns: v.id("auditLogs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      actorId: args.actorId,
      action: args.action,
      targetId: args.targetId,
      targetType: args.targetType,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

const auditRow = v.object({
  _id: v.id("auditLogs"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  actorId: v.id("users"),
  action: v.string(),
  targetId: v.optional(v.string()),
  targetType: v.optional(v.string()),
  metadata: v.optional(v.string()),
  createdAt: v.number(),
});

export const getAuditLog = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(auditRow),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const { orgId } = await requireAdminOrg(ctx);

    return await ctx.db
      .query("auditLogs")
      .withIndex("by_organization_and_created_at", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listRecentAuditLogs = query({
  args: {},
  returns: v.array(auditRow),
  handler: async (ctx) => {
    const { orgId } = await requireAdminOrg(ctx);

    return await ctx.db
      .query("auditLogs")
      .withIndex("by_organization_and_created_at", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .take(200);
  },
});
