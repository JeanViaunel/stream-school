"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";

type EnrolledRow = {
  classId: Id<"classes">;
  enrolledAt: number;
  status: "active" | "removed";
};

async function exportBundleJson(
  ctx: ActionCtx,
  args: { username: string; password: string },
): Promise<string> {
  const user = await ctx.runQuery(internal.users.getUserByUsername, {
    username: args.username,
  });
  if (!user) {
    throw new Error("Invalid credentials");
  }
  const valid = await bcrypt.compare(args.password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const enrollments: Array<EnrolledRow> = await ctx.runQuery(
    internal.privacyQueries.enrollmentsForUser,
    {
      userId: user._id,
    },
  );

  const bundle: {
    exportedAt: number;
    user: {
      username: string;
      displayName: string;
      role: Doc<"users">["role"];
      gradeLevel: Doc<"users">["gradeLevel"];
      organizationId: Doc<"users">["organizationId"];
      createdAt: number;
    };
    enrollments: Array<EnrolledRow>;
  } = {
    exportedAt: Date.now(),
    user: {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      gradeLevel: user.gradeLevel,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
    },
    enrollments,
  };

  return JSON.stringify(bundle, null, 2);
}

export const exportMyDataJson = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => exportBundleJson(ctx, args),
});

export const requestAccountDeletion = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: args.username,
    });
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const valid = await bcrypt.compare(args.password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    await ctx.runMutation(internal.users.scheduleDeletion, { userId: user._id });
    return null;
  },
});

/**
 * FERPA Compliance - Data Retention and Privacy Functions (Added in Phase 4)
 * 
 * These functions handle:
 * - Data retention policy enforcement
 * - Automatic cleanup of old data
 * - Data access logging
 * - Privacy compliance features
 */

const SEVEN_YEARS_DAYS = 2555; // 7 years in days
const SEVEN_YEARS_MS = SEVEN_YEARS_DAYS * 24 * 60 * 60 * 1000;

// Data retention cleanup - runs weekly via cron
export const dataRetentionCleanup = internalAction({
  args: {},
  returns: v.object({
    processedOrganizations: v.number(),
    archivedRecords: v.number(),
    deletedRecords: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx): Promise<{ processedOrganizations: number; archivedRecords: number; deletedRecords: number; errors: string[] }> => {
    const results = {
      processedOrganizations: 0,
      archivedRecords: 0,
      deletedRecords: 0,
      errors: [] as string[],
    };

    const cutoffDate = Date.now() - SEVEN_YEARS_MS;

    try {
      // Get all organizations
      const organizations = await ctx.runAction(internal.privacy.getAllOrganizations, {});

      for (const org of organizations) {
        try {
          // Get organization-specific retention period
          const retentionDays = org.settings?.dataRetentionDays ?? SEVEN_YEARS_DAYS;
          const orgCutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

          results.processedOrganizations++;

          // Clean up old audit logs (keep for 2 years)
          const auditLogCutoff = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000);
          const oldAuditLogs = await ctx.runAction(internal.privacy.getOldAuditLogs, {
            organizationId: org._id,
            cutoffDate: auditLogCutoff,
          });

          for (const log of oldAuditLogs) {
            // Archive to cold storage if needed, then delete
            await ctx.runAction(internal.privacy.deleteAuditLog, {
              logId: log._id,
            });
            results.deletedRecords++;
          }

          // Clean up old sessions and session logs
          const oldSessions = await ctx.runAction(internal.privacy.getOldSessions, {
            cutoffDate: orgCutoffDate,
          });

          for (const session of oldSessions) {
            // Archive session data before deletion
            await ctx.runAction(internal.privacy.archiveAndDeleteSession, {
              sessionId: session._id,
            });
            results.archivedRecords++;
          }

          // Clean up old submissions for deleted/archived classes
          const oldSubmissions = await ctx.runAction(internal.privacy.getOldSubmissions, {
            cutoffDate: orgCutoffDate,
          });

          for (const submission of oldSubmissions) {
            await ctx.runAction(internal.privacy.deleteSubmission, {
              submissionId: submission._id,
            });
            results.deletedRecords++;
          }

          // Log cleanup completion for this org
          await ctx.runMutation(internal.auditLog.createAuditLog, {
            organizationId: org._id,
            actorId: org._id as unknown as Id<"users">, // System actor (organization acting as system)
            action: "data_retention_cleanup",
            targetId: org._id,
            targetType: "organization",
            metadata: JSON.stringify({
              cutoffDate: orgCutoffDate,
              processedAt: Date.now(),
            }),
          });

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          results.errors.push(`Organization ${org._id}: ${errorMsg}`);
        }
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      results.errors.push(`Global error: ${errorMsg}`);
    }

    return results;
  },
});

// Log data access for FERPA compliance
export const logDataAccess = internalAction({
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
  handler: async (ctx, args): Promise<null> => {
    await ctx.runAction(internal.privacy.createDataAccessLog, {
      organizationId: args.organizationId,
      actorId: args.actorId,
      targetId: args.targetId,
      action: args.action,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });
    return null;
  },
});

// Internal queries for cleanup
export const getAllOrganizations = internalAction({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("organizations"),
      settings: v.object({
        dataRetentionDays: v.number(),
      }),
    })
  ),
  handler: async (ctx): Promise<Array<{ _id: Id<"organizations">; settings: { dataRetentionDays: number } }>> => {
    const orgs = await ctx.runQuery(internal.organizations.getAllOrganizations);
    return orgs.map((org: { _id: Id<"organizations">; settings: { dataRetentionDays: number } }) => ({
      _id: org._id,
      settings: {
        dataRetentionDays: org.settings.dataRetentionDays,
      },
    }));
  },
});

export const getOldAuditLogs = internalAction({
  args: {
    organizationId: v.id("organizations"),
    cutoffDate: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("auditLogs"),
    })
  ),
  handler: async (ctx, args): Promise<Array<{ _id: Id<"auditLogs"> }>> => {
    return await ctx.runQuery(internal.privacyQueries.getOldAuditLogs, {
      organizationId: args.organizationId,
      cutoffDate: args.cutoffDate,
    });
  },
});

export const getOldSessions = internalAction({
  args: {
    cutoffDate: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("sessions"),
    })
  ),
  handler: async (ctx, args): Promise<Array<{ _id: Id<"sessions"> }>> => {
    return await ctx.runQuery(internal.privacyQueries.getOldSessions, {
      cutoffDate: args.cutoffDate,
    });
  },
});

export const getOldSubmissions = internalAction({
  args: {
    cutoffDate: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("submissions"),
    })
  ),
  handler: async (ctx, args): Promise<Array<{ _id: Id<"submissions"> }>> => {
    return await ctx.runQuery(internal.privacyQueries.getOldSubmissions, {
      cutoffDate: args.cutoffDate,
    });
  },
});

// Internal mutations for cleanup
export const deleteAuditLog = internalAction({
  args: {
    logId: v.id("auditLogs"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.runMutation(internal.privacyQueries.deleteAuditLog, {
      logId: args.logId,
    });
    return null;
  },
});

export const archiveAndDeleteSession = internalAction({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.runMutation(internal.privacyQueries.archiveAndDeleteSession, {
      sessionId: args.sessionId,
    });
    return null;
  },
});

export const deleteSubmission = internalAction({
  args: {
    submissionId: v.id("submissions"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.runMutation(internal.privacyQueries.deleteSubmission, {
      submissionId: args.submissionId,
    });
    return null;
  },
});

export const createDataAccessLog = internalAction({
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
  handler: async (ctx, args): Promise<null> => {
    await ctx.runMutation(internal.privacyQueries.createDataAccessLog, {
      organizationId: args.organizationId,
      actorId: args.actorId,
      targetId: args.targetId,
      action: args.action,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });
    return null;
  },
});
