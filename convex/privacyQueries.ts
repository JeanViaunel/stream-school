import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const enrollmentsForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      classId: v.id("classes"),
      enrolledAt: v.number(),
      status: v.union(v.literal("active"), v.literal("removed")),
    })
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.userId))
      .collect();
    return rows.map((r) => ({
      classId: r.classId,
      enrolledAt: r.enrolledAt,
      status: r.status,
    }));
  },
});

// FERPA Compliance - Data retention cleanup queries

export const getOldAuditLogs = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    cutoffDate: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("auditLogs"),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.lt(q.field("createdAt"), args.cutoffDate))
      .take(1000); // Process in batches
  },
});

export const getOldSessions = internalQuery({
  args: {
    cutoffDate: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("sessions"),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .filter((q) => q.lt(q.field("startedAt"), args.cutoffDate))
      .take(1000); // Process in batches
  },
});

export const getOldSubmissions = internalQuery({
  args: {
    cutoffDate: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("submissions"),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .filter((q) => q.lt(q.field("submittedAt"), args.cutoffDate))
      .take(1000); // Process in batches
  },
});

// FERPA Compliance - Cleanup mutations

export const deleteAuditLog = internalMutation({
  args: {
    logId: v.id("auditLogs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.logId);
    return null;
  },
});

export const archiveAndDeleteSession = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // In a production environment, you would:
    // 1. Archive session data to cold storage (S3, etc.)
    // 2. Then delete from hot storage
    // For now, we just delete

    // Delete related session logs first
    const sessionLogs = await ctx.db
      .query("sessionLogs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const log of sessionLogs) {
      await ctx.db.delete(log._id);
    }

    // Delete the session
    await ctx.db.delete(args.sessionId);

    return null;
  },
});

export const deleteSubmission = internalMutation({
  args: {
    submissionId: v.id("submissions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.submissionId);
    return null;
  },
});

export const createDataAccessLog = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    actorId: v.id("users"),
    targetId: v.id("users"),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("dataAccessLogs", {
      organizationId: args.organizationId,
      actorId: args.actorId,
      targetId: args.targetId,
      action: args.action,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      accessedAt: Date.now(),
    });
    return null;
  },
});
