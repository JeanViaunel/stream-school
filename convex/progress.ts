import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { usernameFromIdentity } from "./authHelpers";

export const calculateStudentProgress = internalMutation({
  args: { studentId: v.id("users"), classId: v.id("classes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get all published assignments for the class
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    // Get student's submissions
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    const submittedAssignmentIds = new Set(submissions.map(s => s.assignmentId));
    
    // Calculate assignment progress
    const assignmentProgress = assignments.length > 0
      ? (submissions.filter(s => assignments.some(a => a._id === s.assignmentId)).length / assignments.length) * 100
      : 0;

    // Get all sessions for the class
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    // Get student's session logs (attendance)
    const sessionLogs = await ctx.db
      .query("sessionLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.studentId))
      .collect();

    const attendedSessionIds = new Set(sessionLogs.map(l => l.sessionId));
    
    // Calculate attendance progress
    const attendanceProgress = sessions.length > 0
      ? (sessions.filter(s => attendedSessionIds.has(s._id)).length / sessions.length) * 100
      : 0;

    // Calculate overall progress (weighted average: 60% assignments, 40% attendance)
    const overallProgress = Math.round((assignmentProgress * 0.6) + (attendanceProgress * 0.4));

    // Upsert progress record
    const existing = await ctx.db
      .query("studentProgress")
      .withIndex("by_student_and_class", (q) =>
        q.eq("studentId", args.studentId).eq("classId", args.classId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        overallProgress,
        assignmentProgress: Math.round(assignmentProgress),
        sessionAttendanceProgress: Math.round(attendanceProgress),
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("studentProgress", {
        studentId: args.studentId,
        classId: args.classId,
        overallProgress,
        assignmentProgress: Math.round(assignmentProgress),
        sessionAttendanceProgress: Math.round(attendanceProgress),
        lastUpdated: Date.now(),
      });
    }

    // Check for completed milestones
    await checkMilestones(ctx, args.studentId, args.classId, overallProgress, Math.round(assignmentProgress), Math.round(attendanceProgress));

    return null;
  },
});

async function checkMilestones(
  ctx: { db: any },
  studentId: Id<"users">,
  classId: Id<"classes">,
  overallProgress: number,
  assignmentProgress: number,
  attendanceProgress: number
) {
  // Get all milestones for the class
  const milestones = await ctx.db
    .query("milestones")
    .withIndex("by_class", (q: { eq: (field: string, value: string | Id<"classes">) => any }) => q.eq("classId", classId))
    .collect();

  for (const milestone of milestones) {
    // Check if already completed
    const alreadyCompleted = await ctx.db
      .query("completedMilestones")
      .withIndex("by_student_and_milestone", (q: { eq: (field: string, value: Id<"users"> | Id<"milestones">) => any }) =>
        q.eq("studentId", studentId).eq("milestoneId", milestone._id)
      )
      .unique();

    if (alreadyCompleted) continue;

    let isCompleted = false;

    switch (milestone.type) {
      case "assignment_count":
        // For assignment_count, targetValue is the percentage of assignments to complete
        isCompleted = assignmentProgress >= milestone.targetValue;
        break;
      case "attendance_streak":
        // For attendance_streak, targetValue is the percentage attendance to achieve
        isCompleted = attendanceProgress >= milestone.targetValue;
        break;
      case "grade_average":
        // For grade_average, targetValue is the overall progress percentage
        isCompleted = overallProgress >= milestone.targetValue;
        break;
    }

    if (isCompleted) {
      await ctx.db.insert("completedMilestones", {
        milestoneId: milestone._id,
        studentId,
        completedAt: Date.now(),
      });
    }
  }
}

export const getStudentProgress = query({
  args: { classId: v.id("classes") },
  returns: v.union(
    v.object({
      overallProgress: v.number(),
      assignmentProgress: v.number(),
      attendanceProgress: v.number(),
      milestones: v.array(v.object({
        name: v.string(),
        description: v.string(),
        completed: v.boolean(),
        completedAt: v.optional(v.number()),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const progress = await ctx.db
      .query("studentProgress")
      .withIndex("by_student_and_class", (q) =>
        q.eq("studentId", user._id).eq("classId", args.classId)
      )
      .unique();

    if (!progress) {
      // Return null if no progress exists - frontend should trigger calculation
      return null;
    }

    // Get milestones for the class
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_class_and_order", (q) => q.eq("classId", args.classId))
      .order("asc")
      .collect();

    const milestoneStatus = await Promise.all(
      milestones.map(async (m) => {
        const completed = await ctx.db
          .query("completedMilestones")
          .withIndex("by_student_and_milestone", (q) => 
            q.eq("studentId", user._id).eq("milestoneId", m._id)
          )
          .unique();

        return {
          name: m.name,
          description: m.description,
          completed: !!completed,
          completedAt: completed?.completedAt,
        };
      })
    );

    return {
      overallProgress: progress.overallProgress,
      assignmentProgress: progress.assignmentProgress,
      attendanceProgress: progress.sessionAttendanceProgress,
      milestones: milestoneStatus,
    };
  },
});

export const getClassProgressOverview = query({
  args: { classId: v.id("classes") },
  returns: v.array(v.object({
    studentId: v.id("users"),
    displayName: v.string(),
    overallProgress: v.number(),
    assignmentProgress: v.number(),
    attendanceProgress: v.number(),
    completedMilestones: v.number(),
    totalMilestones: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    // Only teacher or admin can view class progress overview
    const isTeacher = cls.teacherId === user._id;
    const isOrgAdmin = user.role === "admin" && 
      !!user.organizationId && 
      user.organizationId === cls.organizationId;

    if (!isTeacher && !isOrgAdmin) {
      throw new Error("Not authorized to view class progress");
    }

    // Get all enrolled students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get all milestones for the class
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    const totalMilestones = milestones.length;

    // Get progress for all students
    const studentProgressList = [];
    for (const enrollment of enrollments) {
      const student = await ctx.db.get(enrollment.studentId);
      if (!student) continue;

      const progress = await ctx.db
        .query("studentProgress")
        .withIndex("by_student_and_class", (q) =>
          q.eq("studentId", enrollment.studentId).eq("classId", args.classId)
        )
        .unique();

      // Count completed milestones
      let completedMilestones = 0;
      for (const milestone of milestones) {
        const completed = await ctx.db
          .query("completedMilestones")
          .withIndex("by_student_and_milestone", (q) =>
            q.eq("studentId", enrollment.studentId).eq("milestoneId", milestone._id)
          )
          .unique();
        if (completed) completedMilestones++;
      }

      studentProgressList.push({
        studentId: enrollment.studentId,
        displayName: student.displayName,
        overallProgress: progress?.overallProgress || 0,
        assignmentProgress: progress?.assignmentProgress || 0,
        attendanceProgress: progress?.sessionAttendanceProgress || 0,
        completedMilestones,
        totalMilestones,
      });
    }

    return studentProgressList;
  },
});

export const createMilestone = mutation({
  args: {
    classId: v.id("classes"),
    name: v.string(),
    description: v.string(),
    type: v.union(v.literal("assignment_count"), v.literal("attendance_streak"), v.literal("grade_average")),
    targetValue: v.number(),
    order: v.optional(v.number()),
  },
  returns: v.id("milestones"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    // Only class teacher can create milestones
    if (cls.teacherId !== user._id && user.role !== "admin") {
      throw new Error("Only class teacher can create milestones");
    }

    // Get next order if not provided
    let order = args.order;
    if (order === undefined) {
      const existingMilestones = await ctx.db
        .query("milestones")
        .withIndex("by_class", (q) => q.eq("classId", args.classId))
        .collect();
      order = existingMilestones.length;
    }

    return await ctx.db.insert("milestones", {
      classId: args.classId,
      name: args.name,
      description: args.description,
      type: args.type,
      targetValue: args.targetValue,
      order,
    });
  },
});

export const getMilestones = query({
  args: { classId: v.id("classes") },
  returns: v.array(v.object({
    _id: v.id("milestones"),
    _creationTime: v.number(),
    classId: v.id("classes"),
    name: v.string(),
    description: v.string(),
    type: v.union(v.literal("assignment_count"), v.literal("attendance_streak"), v.literal("grade_average")),
    targetValue: v.number(),
    order: v.number(),
  })),
  handler: async (ctx, args) => {
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_class_and_order", (q) => q.eq("classId", args.classId))
      .order("asc")
      .collect();

    return milestones;
  },
});

export const recalculateAllClassProgress = mutation({
  args: { classId: v.id("classes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    // Only class teacher or admin can recalculate progress
    if (cls.teacherId !== user._id && user.role !== "admin") {
      throw new Error("Not authorized to recalculate progress");
    }

    // Get all enrolled students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Recalculate progress for each student
    for (const enrollment of enrollments) {
      await ctx.runMutation(internal.progress.calculateStudentProgress, {
        studentId: enrollment.studentId,
        classId: args.classId,
      });
    }

    return null;
  },
});

export const getMyProgressSummary = query({
  args: {},
  returns: v.array(v.object({
    classId: v.id("classes"),
    className: v.string(),
    overallProgress: v.number(),
    assignmentProgress: v.number(),
    attendanceProgress: v.number(),
    completedMilestones: v.number(),
    totalMilestones: v.number(),
  })),
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all enrolled classes
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const progressSummary = [];
    for (const enrollment of enrollments) {
      const cls = await ctx.db.get(enrollment.classId);
      if (!cls) continue;

      const progress = await ctx.db
        .query("studentProgress")
        .withIndex("by_student_and_class", (q) =>
          q.eq("studentId", user._id).eq("classId", enrollment.classId)
        )
        .unique();

      // Get milestones count
      const milestones = await ctx.db
        .query("milestones")
        .withIndex("by_class", (q) => q.eq("classId", enrollment.classId))
        .collect();

      const completedMilestones = await ctx.db
        .query("completedMilestones")
        .withIndex("by_student", (q) => q.eq("studentId", user._id))
        .collect();

      const classCompletedMilestones = completedMilestones.filter(cm => 
        milestones.some(m => m._id === cm.milestoneId)
      ).length;

      progressSummary.push({
        classId: enrollment.classId,
        className: cls.name,
        overallProgress: progress?.overallProgress || 0,
        assignmentProgress: progress?.assignmentProgress || 0,
        attendanceProgress: progress?.sessionAttendanceProgress || 0,
        completedMilestones: classCompletedMilestones,
        totalMilestones: milestones.length,
      });
    }

    return progressSummary;
  },
});
