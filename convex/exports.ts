import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * FERPA Compliance - Data Export Functions
 * 
 * These functions support GDPR and FERPA data portability requirements
 * by allowing users to export all their educational data.
 */

// Create a new data export request
export const requestDataExport = action({
  args: {
    dataTypes: v.array(v.string()), // ['submissions', 'grades', 'messages', 'sessions']
    requestType: v.union(v.literal("gdpr"), v.literal("ferpa")),
  },
  returns: v.object({
    exportId: v.id("dataExports"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    message: v.string(),
  }),
  handler: async (ctx, args): Promise<{ exportId: Id<"dataExports">; status: "pending" | "processing" | "completed" | "failed"; message: string }> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: identity.subject,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Create export record
    const exportId = await ctx.runMutation(internal.exports.createExportRecord, {
      userId: user._id,
      organizationId: user.organizationId!,
      dataTypes: args.dataTypes,
      requestType: args.requestType,
    });

    // Start async export process
    await ctx.runAction(internal.exports.processDataExport, {
      exportId,
      userId: user._id,
      organizationId: user.organizationId!,
      dataTypes: args.dataTypes,
    });

    // Log the data export request for FERPA compliance
    await ctx.runMutation(internal.auditLog.createAuditLog, {
      organizationId: user.organizationId!,
      actorId: user._id,
      action: "data_export_requested",
      targetId: user._id,
      targetType: "user",
      metadata: JSON.stringify({
        exportId,
        dataTypes: args.dataTypes,
        requestType: args.requestType,
      }),
    });

    return {
      exportId,
      status: "pending",
      message: "Your data export has been requested. You will receive an email when it's ready.",
    };
  },
});

// Get export status
export const getExportStatus = action({
  args: {
    exportId: v.id("dataExports"),
  },
  returns: v.union(
    v.object({
      _id: v.id("dataExports"),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      ),
      downloadUrl: v.optional(v.string()),
      expiresAt: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
      requestedAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: identity.subject,
    });

    if (!user) {
      return null;
    }

    const exportRecord = await ctx.runQuery(internal.exports.getExportRecord, {
      exportId: args.exportId,
    });
    
    if (!exportRecord || exportRecord.userId !== user._id) {
      return null;
    }

    return {
      _id: exportRecord._id,
      status: exportRecord.status,
      downloadUrl: exportRecord.downloadUrl,
      expiresAt: exportRecord.expiresAt,
      errorMessage: exportRecord.errorMessage,
      requestedAt: exportRecord.requestedAt,
      completedAt: exportRecord.completedAt,
    };
  },
});

// Internal: Get export record
export const getExportRecord = internalQuery({
  args: {
    exportId: v.id("dataExports"),
  },
  returns: v.union(
    v.object({
      _id: v.id("dataExports"),
      userId: v.id("users"),
      organizationId: v.id("organizations"),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      ),
      downloadUrl: v.optional(v.string()),
      expiresAt: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
      requestedAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.exportId);
    if (!record) return null;
    return {
      _id: record._id,
      userId: record.userId,
      organizationId: record.organizationId,
      status: record.status,
      downloadUrl: record.downloadUrl,
      expiresAt: record.expiresAt,
      errorMessage: record.errorMessage,
      requestedAt: record.requestedAt,
      completedAt: record.completedAt,
    };
  },
});

// Internal: Create export record
export const createExportRecord = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    dataTypes: v.array(v.string()),
    requestType: v.union(v.literal("gdpr"), v.literal("ferpa")),
  },
  returns: v.id("dataExports"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("dataExports", {
      userId: args.userId,
      organizationId: args.organizationId,
      status: "pending",
      requestType: args.requestType,
      dataTypes: args.dataTypes,
      requestedAt: Date.now(),
    });
  },
});

// Internal: Process data export (collects and exports all user data)
export const processDataExport = internalAction({
  args: {
    exportId: v.id("dataExports"),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    dataTypes: v.array(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args): Promise<boolean> => {
    try {
      // Update status to processing
      await ctx.runMutation(internal.exports.updateExportStatus, {
        exportId: args.exportId,
        status: "processing",
      });

      const exportData: Record<string, unknown> = {
        exportMetadata: {
          exportId: args.exportId,
          userId: args.userId,
          organizationId: args.organizationId,
          exportedAt: Date.now(),
          dataTypes: args.dataTypes,
        },
      };

      // Collect user profile data
      const user = await ctx.runQuery(internal.users.getUserById, {
        userId: args.userId,
      });
      if (user) {
        exportData.userProfile = {
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          gradeLevel: user.gradeLevel,
          createdAt: user.createdAt,
        };
      }

      // Collect submissions data
      if (args.dataTypes.includes("submissions")) {
        const submissions = await ctx.runQuery(internal.exports.getUserSubmissions, {
          userId: args.userId,
        });
        exportData.submissions = submissions;
      }

      // Collect grades data
      if (args.dataTypes.includes("grades")) {
        const grades = await ctx.runQuery(internal.exports.getUserGrades, {
          userId: args.userId,
        });
        exportData.grades = grades;
      }

      // Collect session logs data
      if (args.dataTypes.includes("sessions")) {
        const sessionLogs = await ctx.runQuery(internal.exports.getUserSessionLogs, {
          userId: args.userId,
        });
        exportData.sessionLogs = sessionLogs;
      }

      // Collect enrollments data
      if (args.dataTypes.includes("enrollments")) {
        const enrollments = await ctx.runQuery(internal.exports.getUserEnrollments, {
          userId: args.userId,
        });
        exportData.enrollments = enrollments;
      }

      // Convert to JSON string
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Store export data in database (simplified approach)
      // In production, you might want to upload to external storage
      const downloadUrl = `data:application/json;base64,${btoa(jsonData)}`;

      // Update export record
      await ctx.runMutation(internal.exports.updateExportStatus, {
        exportId: args.exportId,
        status: "completed",
        downloadUrl,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Log successful export
      await ctx.runMutation(internal.auditLog.createAuditLog, {
        organizationId: args.organizationId,
        actorId: args.userId,
        action: "data_export_completed",
        targetId: args.userId,
        targetType: "user",
        metadata: JSON.stringify({
          exportId: args.exportId,
          dataTypes: args.dataTypes,
        }),
      });

      return true;
    } catch (error) {
      console.error("Data export failed:", error);

      // Update export record with error
      await ctx.runMutation(internal.exports.updateExportStatus, {
        exportId: args.exportId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      // Log failed export
      await ctx.runMutation(internal.auditLog.createAuditLog, {
        organizationId: args.organizationId,
        actorId: args.userId,
        action: "data_export_failed",
        targetId: args.userId,
        targetType: "user",
        metadata: JSON.stringify({
          exportId: args.exportId,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      });

      return false;
    }
  },
});

// Internal: Update export status
export const updateExportStatus = internalMutation({
  args: {
    exportId: v.id("dataExports"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    downloadUrl: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.downloadUrl !== undefined) {
      updates.downloadUrl = args.downloadUrl;
    }
    if (args.expiresAt !== undefined) {
      updates.expiresAt = args.expiresAt;
    }
    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }
    if (args.status === "completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.exportId, updates);
    return null;
  },
});

// Internal queries to collect user data
export const getUserSubmissions = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("submissions"),
      assignmentId: v.id("assignments"),
      answers: v.array(v.object({
        questionId: v.string(),
        value: v.string(),
      })),
      submittedAt: v.number(),
      autoScore: v.optional(v.number()),
      teacherScore: v.optional(v.number()),
      teacherFeedback: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_student", (q) => q.eq("studentId", args.userId))
      .collect();
  },
});

export const getUserGrades = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("grades"),
      assignmentId: v.id("assignments"),
      score: v.number(),
      maxScore: v.number(),
      feedback: v.optional(v.string()),
      gradedAt: v.number(),
      classId: v.id("classes"),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("grades")
      .withIndex("by_student", (q) => q.eq("studentId", args.userId))
      .collect();
  },
});

export const getUserSessionLogs = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("sessionLogs"),
      sessionId: v.id("sessions"),
      joinedAt: v.number(),
      leftAt: v.optional(v.number()),
      wasAdmittedFromLobby: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessionLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getUserEnrollments = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("enrollments"),
      classId: v.id("classes"),
      enrolledAt: v.number(),
      status: v.union(v.literal("active"), v.literal("removed")),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.userId))
      .collect();
  },
});

// Cleanup expired exports (runs daily via cron)
export const cleanupExpiredExports = internalMutation({
  args: {},
  returns: v.object({
    deletedCount: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const expiredExports = await ctx.db
      .query("dataExports")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    let deletedCount = 0;
    for (const export_ of expiredExports) {
      await ctx.db.delete(export_._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});
