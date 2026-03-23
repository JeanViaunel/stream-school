import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { usernameFromIdentity } from "./authHelpers";

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

export const getMyStats = query({
  args: {},
  returns: v.union(
    v.object({
      joinedAt: v.number(),
      classCount: v.number(),
      assignmentCount: v.number(),
      sessionCount: v.number(),
      totalHours: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) return null;

    // Count enrollments/classes
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Count attended sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_class", (q) =>
        q.eq("classId", enrollments[0]?.classId ?? user._id)
      )
      .collect();

    // Calculate total hours from sessions
    const totalMinutes = sessions.reduce((sum, s) => {
      if (s.endedAt && s.startedAt) {
        return sum + (s.endedAt - s.startedAt) / (1000 * 60);
      }
      return sum;
    }, 0);

    // Count assignments across all enrolled classes
    let assignmentCount = 0;
    for (const enrollment of enrollments) {
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", enrollment.classId))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .collect();
      assignmentCount += assignments.length;
    }

    return {
      joinedAt: user.createdAt,
      classCount: enrollments.length,
      assignmentCount,
      sessionCount: sessions.length,
      totalHours: Math.round(totalMinutes / 60),
    };
  },
});

export const getTeacherStats = query({
  args: {},
  returns: v.union(
    v.object({
      classesTaught: v.number(),
      sessionsHosted: v.number(),
      totalStudentsReached: v.number(),
      totalTeachingHours: v.number(),
      assignmentsCreated: v.number(),
      averageClassSize: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) return null;

    // Verify user is a teacher, co_teacher, or admin
    const allowedRoles = ["teacher", "co_teacher", "admin"] as const;
    if (!user.role || !allowedRoles.includes(user.role as typeof allowedRoles[number])) {
      return null;
    }

    // Get all classes taught by this teacher
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .collect();

    // Count unique students across all classes
    const uniqueStudents = new Set<string>();
    let totalClassSize = 0;

    for (const cls of classes) {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect();

      for (const enrollment of enrollments) {
        if (enrollment.status === "active") {
          uniqueStudents.add(enrollment.studentId);
        }
      }

      totalClassSize += enrollments.filter((e) => e.status === "active").length;
    }

    // Get all sessions for these classes
    let sessionsHosted = 0;
    let totalTeachingMinutes = 0;

    for (const cls of classes) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect();

      for (const session of sessions) {
        if (session.hostId === user._id) {
          sessionsHosted++;
          if (session.endedAt && session.startedAt) {
            totalTeachingMinutes += (session.endedAt - session.startedAt) / (1000 * 60);
          }
        }
      }
    }

    // Count assignments created by this teacher
    let assignmentsCreated = 0;

    for (const cls of classes) {
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect();

      for (const assignment of assignments) {
        if (assignment.creatorId === user._id) {
          assignmentsCreated++;
        }
      }
    }

    // Calculate average class size
    const averageClassSize = classes.length > 0 ? Math.round(totalClassSize / classes.length) : 0;

    return {
      classesTaught: classes.length,
      sessionsHosted,
      totalStudentsReached: uniqueStudents.size,
      totalTeachingHours: Math.round(totalTeachingMinutes / 60),
      assignmentsCreated,
      averageClassSize,
    };
  },
});

// COPPA Compliance - Get user by consent token
export const getUserByConsentToken = internalQuery({
  args: { consentToken: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      username: v.string(),
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
      parentalConsentStatus: v.optional(v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("not_required")
      )),
      parentEmail: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx, { consentToken }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_consent_token", (q) => q.eq("consentToken", consentToken))
      .unique();
  },
});

// COPPA Compliance - Update parental consent status
export const updateParentalConsent = internalMutation({
  args: {
    userId: v.id("users"),
    parentalConsentStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("not_required")
    ),
    consentVerifiedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      parentalConsentStatus: args.parentalConsentStatus,
      consentVerifiedAt: args.consentVerifiedAt,
      isActive: args.parentalConsentStatus === "approved" || args.parentalConsentStatus === "not_required",
      parentConsentGiven: args.parentalConsentStatus === "approved",
      parentConsentAt: args.parentalConsentStatus === "approved" ? args.consentVerifiedAt : undefined,
    });
    return null;
  },
});
