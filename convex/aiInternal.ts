import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Get user by ID
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      username: v.string(),
      displayName: v.string(),
      role: v.optional(v.string()),
      organizationId: v.optional(v.id("organizations")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      organizationId: user.organizationId,
    };
  },
});

// Get class by ID
export const getClassById = internalQuery({
  args: { classId: v.id("classes") },
  returns: v.union(
    v.object({
      _id: v.id("classes"),
      name: v.string(),
      subject: v.string(),
      gradeLevel: v.number(),
      teacherId: v.id("users"),
      organizationId: v.id("organizations"),
      streamChannelId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const cls = await ctx.db.get(args.classId);
    if (!cls) return null;
    return {
      _id: cls._id,
      name: cls.name,
      subject: cls.subject,
      gradeLevel: cls.gradeLevel,
      teacherId: cls.teacherId,
      organizationId: cls.organizationId,
      streamChannelId: cls.streamChannelId,
    };
  },
});

// Get assignments for class
export const getClassAssignments = internalQuery({
  args: { classId: v.id("classes"), limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("assignments"),
    title: v.string(),
    instructions: v.string(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .take(limit);
    
    return assignments.map(a => ({
      _id: a._id,
      title: a.title,
      instructions: a.instructions,
    }));
  },
});

// Check enrollment
export const checkEnrollment = internalQuery({
  args: { classId: v.id("classes"), studentId: v.id("users") },
  returns: v.object({ isEnrolled: v.boolean() }),
  handler: async (ctx, args) => {
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) => 
        q.eq("classId", args.classId).eq("studentId", args.studentId)
      )
      .unique();
    
    return { isEnrolled: !!enrollment };
  },
});

// Get session by ID
export const getSessionById = internalQuery({
  args: { sessionId: v.id("sessions") },
  returns: v.union(
    v.object({
      _id: v.id("sessions"),
      classId: v.id("classes"),
      hostId: v.id("users"),
      streamCallId: v.string(),
      startedAt: v.number(),
      endedAt: v.optional(v.number()),
      summary: v.optional(v.string()),
      summaryGeneratedAt: v.optional(v.number()),
      summaryKeyPoints: v.optional(v.array(v.string())),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    return {
      _id: session._id,
      classId: session.classId,
      hostId: session.hostId,
      streamCallId: session.streamCallId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      summary: session.summary,
      summaryGeneratedAt: session.summaryGeneratedAt,
      summaryKeyPoints: session.summaryKeyPoints,
    };
  },
});

// Get AI usage logs for user
export const getAIUsageForUser = internalQuery({
  args: { 
    userId: v.id("users"), 
    since: v.number(),
  },
  returns: v.array(v.object({
    feature: v.string(),
    timestamp: v.number(),
  })),
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("aiUsageLogs")
      .withIndex("by_user_and_timestamp", (q) => 
        q.eq("userId", args.userId).gte("timestamp", args.since)
      )
      .collect();
    
    return logs.map(log => ({
      feature: log.feature,
      timestamp: log.timestamp,
    }));
  },
});

// Log AI usage
export const logAIUsage = internalMutation({
  args: {
    userId: v.id("users"),
    feature: v.string(),
    classId: v.optional(v.id("classes")),
    sessionId: v.optional(v.id("sessions")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("aiUsageLogs", {
      userId: args.userId,
      feature: args.feature,
      classId: args.classId,
      sessionId: args.sessionId,
      timestamp: Date.now(),
    });
    return null;
  },
});

// Get grades for student in class
export const getStudentGrades = internalQuery({
  args: { 
    studentId: v.id("users"), 
    classId: v.id("classes"),
  },
  returns: v.array(v.object({
    _id: v.id("grades"),
    assignmentId: v.id("assignments"),
    score: v.number(),
    maxScore: v.number(),
    gradedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("grades")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .filter((q) => q.eq(q.field("classId"), args.classId))
      .collect();
  },
});

// Get submissions for student
export const getStudentSubmissions = internalQuery({
  args: { studentId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("submissions"),
    assignmentId: v.id("assignments"),
    submittedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
  },
});

// Get sessions for class
export const getClassSessions = internalQuery({
  args: { classId: v.id("classes") },
  returns: v.array(v.object({
    _id: v.id("sessions"),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();
  },
});

// Get session logs
export const getSessionLogs = internalQuery({
  args: { sessionId: v.id("sessions") },
  returns: v.array(v.object({
    userId: v.id("users"),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessionLogs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

// Get user session logs
export const getUserSessionLogs = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(v.object({
    sessionId: v.id("sessions"),
    joinedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessionLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Check parent link
export const checkParentLink = internalQuery({
  args: { 
    parentId: v.id("users"), 
    studentId: v.id("users"),
  },
  returns: v.object({ hasConsent: v.boolean() }),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("parentLinks")
      .withIndex("by_parent_and_student", (q) => 
        q.eq("parentId", args.parentId).eq("studentId", args.studentId)
      )
      .unique();
    
    return { hasConsent: link?.consentGiven || false };
  },
});

// Get assignment by ID
export const getAssignmentById = internalQuery({
  args: { assignmentId: v.id("assignments") },
  returns: v.union(
    v.object({
      _id: v.id("assignments"),
      title: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) return null;
    return {
      _id: assignment._id,
      title: assignment.title,
    };
  },
});
