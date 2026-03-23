import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";
import { api } from "./_generated/api";

export const createAssignment = mutation({
  args: {
    classId: v.id("classes"),
    title: v.string(),
    instructions: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
    questions: v.array(v.object({
      id: v.string(),
      text: v.string(),
      options: v.optional(v.array(v.string())),
      correctOption: v.optional(v.number()),
    })),
    dueDateAt: v.optional(v.number()),
    sessionId: v.optional(v.id("sessions")),
  },
  returns: v.id("assignments"),
  handler: async (ctx, args): Promise<Id<"assignments">> => {
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

    if (cls.teacherId !== user._id) {
      throw new Error("Only the teacher can create assignments");
    }

    return await ctx.db.insert("assignments", {
      classId: args.classId,
      creatorId: user._id,
      title: args.title,
      instructions: args.instructions,
      type: args.type,
      questions: args.questions,
      dueDateAt: args.dueDateAt,
      sessionId: args.sessionId,
      isPublished: false,
      createdAt: Date.now(),
    });
  },
});

export const publishAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
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

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.creatorId !== user._id) {
      throw new Error("Only the creator can publish assignments");
    }

    await ctx.db.patch(args.assignmentId, { isPublished: true });
    return null;
  },
});

export const getAssignmentsByClass = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.array(
    v.object({
      _id: v.id("assignments"),
      _creationTime: v.number(),
      classId: v.id("classes"),
      creatorId: v.id("users"),
      title: v.string(),
      instructions: v.string(),
      type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
      questions: v.array(v.object({
        id: v.string(),
        text: v.string(),
        options: v.optional(v.array(v.string())),
        correctOption: v.optional(v.number()),
      })),
      dueDateAt: v.optional(v.number()),
      sessionId: v.optional(v.id("sessions")),
      isPublished: v.boolean(),
      createdAt: v.number(),
    })
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

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isTeacher && !isEnrolled) {
      throw new Error("Not authorized to view assignments for this class");
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    return assignments;
  },
});

export const getAssignmentById = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.union(
    v.object({
      _id: v.id("assignments"),
      _creationTime: v.number(),
      classId: v.id("classes"),
      creatorId: v.id("users"),
      title: v.string(),
      instructions: v.string(),
      type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
      questions: v.array(v.object({
        id: v.string(),
        text: v.string(),
        options: v.optional(v.array(v.string())),
        correctOption: v.optional(v.number()),
      })),
      dueDateAt: v.optional(v.number()),
      sessionId: v.optional(v.id("sessions")),
      isPublished: v.boolean(),
      createdAt: v.number(),
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

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      return null;
    }

    const cls = await ctx.db.get(assignment.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id;
    const isCreator = assignment.creatorId === user._id;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", assignment.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isTeacher && !isCreator && !isEnrolled) {
      throw new Error("Not authorized to view this assignment");
    }

    if (!assignment.isPublished && !isTeacher && !isCreator) {
      throw new Error("Assignment not yet published");
    }

    return assignment;
  },
});

export const getMyUpcomingAssignments = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("assignments"),
      classId: v.id("classes"),
      className: v.string(),
      title: v.string(),
      dueDateAt: v.optional(v.number()),
      isPublished: v.boolean(),
      createdAt: v.number(),
    })
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

    const limit = args.limit ?? 10;
    const now = Date.now();

    // Get all enrolled classes
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const classIds = enrollments.map((e) => e.classId);

    const assignments: {
      _id: Id<"assignments">;
      classId: Id<"classes">;
      className: string;
      title: string;
      dueDateAt: number | undefined;
      isPublished: boolean;
      createdAt: number;
    }[] = [];

    for (const classId of classIds) {
      const cls = await ctx.db.get(classId);
      if (!cls) continue;

      const classAssignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", classId))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .filter((q) =>
          q.or(
            q.eq(q.field("dueDateAt"), undefined),
            q.gte(q.field("dueDateAt"), now)
          )
        )
        .collect();

      for (const assignment of classAssignments) {
        assignments.push({
          _id: assignment._id,
          classId: assignment.classId,
          className: cls.name,
          title: assignment.title,
          dueDateAt: assignment.dueDateAt,
          isPublished: assignment.isPublished,
          createdAt: assignment.createdAt,
        });
      }
    }

    // Sort by due date (assignments without due date last), then by created date
    assignments.sort((a, b) => {
      if (a.dueDateAt && b.dueDateAt) {
        return a.dueDateAt - b.dueDateAt;
      }
      if (a.dueDateAt) return -1;
      if (b.dueDateAt) return 1;
      return b.createdAt - a.createdAt;
    });

    return assignments.slice(0, limit);
  },
});

export const getMyAssignments = query({
  args: {
    filter: v.optional(v.union(
      v.literal("all"),
      v.literal("pending"),
      v.literal("submitted"),
      v.literal("graded"),
      v.literal("overdue")
    )),
    sortBy: v.optional(v.union(
      v.literal("dueDate"),
      v.literal("className"),
      v.literal("status"),
      v.literal("createdAt")
    )),
  },
  returns: v.array(
    v.object({
      _id: v.id("assignments"),
      classId: v.id("classes"),
      className: v.string(),
      classSubject: v.string(),
      title: v.string(),
      instructions: v.string(),
      dueDateAt: v.optional(v.number()),
      createdAt: v.number(),
      submission: v.optional(v.object({
        _id: v.id("submissions"),
        submittedAt: v.number(),
        score: v.optional(v.number()),
        maxScore: v.optional(v.number()),
      })),
      status: v.union(v.literal("pending"), v.literal("submitted"), v.literal("graded"), v.literal("overdue")),
    })
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

    const now = Date.now();
    const filter = args.filter ?? "all";
    const sortBy = args.sortBy ?? "dueDate";

    // Get all enrolled classes
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const classIds = enrollments.map((e) => e.classId);

    const assignments: {
      _id: Id<"assignments">;
      classId: Id<"classes">;
      className: string;
      classSubject: string;
      title: string;
      instructions: string;
      dueDateAt: number | undefined;
      createdAt: number;
      submission: {
        _id: Id<"submissions">;
        submittedAt: number;
        score?: number;
        maxScore?: number;
      } | undefined;
      status: "pending" | "submitted" | "graded" | "overdue";
    }[] = [];

    for (const classId of classIds) {
      const cls = await ctx.db.get(classId);
      if (!cls) continue;

      const classAssignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", classId))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .collect();

      for (const assignment of classAssignments) {
        // Check for submission
        const submission = await ctx.db
          .query("submissions")
          .withIndex("by_assignment_and_student", (q) =>
            q.eq("assignmentId", assignment._id).eq("studentId", user._id)
          )
          .unique();

        // Check for grade
        const grade = await ctx.db
          .query("grades")
          .withIndex("by_assignment_and_student", (q) =>
            q.eq("assignmentId", assignment._id).eq("studentId", user._id)
          )
          .unique();

        // Determine status
        let status: "pending" | "submitted" | "graded" | "overdue" = "pending";
        if (grade) {
          status = "graded";
        } else if (submission) {
          status = "submitted";
        } else if (assignment.dueDateAt && assignment.dueDateAt < now) {
          status = "overdue";
        }

        // Filter assignments
        if (filter !== "all" && status !== filter) {
          continue;
        }

        // Calculate score
        let score: number | undefined;
        let maxScore: number | undefined;
        if (grade) {
          score = grade.score;
          maxScore = grade.maxScore;
        } else if (submission) {
          // Use autoScore if available, or calculate from assignment
          score = submission.autoScore;
          maxScore = assignment.questions?.length ? assignment.questions.length * 10 : undefined;
        }

        assignments.push({
          _id: assignment._id,
          classId: assignment.classId,
          className: cls.name,
          classSubject: cls.subject,
          title: assignment.title,
          instructions: assignment.instructions,
          dueDateAt: assignment.dueDateAt,
          createdAt: assignment.createdAt,
          submission: submission
            ? {
                _id: submission._id,
                submittedAt: submission.submittedAt,
                score,
                maxScore,
              }
            : undefined,
          status,
        });
      }
    }

    // Sort assignments
    assignments.sort((a, b) => {
      switch (sortBy) {
        case "dueDate": {
          // Sort by due date (undefined = end), then by created date
          if (a.dueDateAt && b.dueDateAt) return a.dueDateAt - b.dueDateAt;
          if (a.dueDateAt) return -1;
          if (b.dueDateAt) return 1;
          return b.createdAt - a.createdAt;
        }
        case "className":
          return a.className.localeCompare(b.className);
        case "status": {
          const statusOrder = { overdue: 0, pending: 1, submitted: 2, graded: 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        }
        case "createdAt":
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return assignments;
  },
});

export const getAssignmentCompletionStats = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.object({
    totalStudents: v.number(),
    submittedCount: v.number(),
    submissionRate: v.number(),
    averageScore: v.optional(v.number()),
    gradeDistribution: v.array(v.object({
      range: v.string(),
      count: v.number(),
    })),
    lateSubmissions: v.number(),
    notSubmitted: v.array(v.id("users")),
  }),
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

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const cls = await ctx.db.get(assignment.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    if (cls.teacherId !== user._id) {
      throw new Error("Only the teacher can view assignment completion stats");
    }

    // Get all enrolled students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", assignment.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const studentIds = enrollments.map((e) => e.studentId);
    const totalStudents = studentIds.length;

    // Get all submissions for this assignment
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const submittedCount = submissions.length;
    const submissionRate = totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0;

    // Get all grades for this assignment
    const grades = await ctx.db
      .query("grades")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    // Calculate average score
    let averageScore: number | undefined;
    if (grades.length > 0) {
      const totalScore = grades.reduce((sum, g) => sum + g.score, 0);
      averageScore = totalScore / grades.length;
    }

    // Build grade distribution histogram
    const distribution = new Map<string, number>();
    const ranges = [
      { min: 90, max: 100, label: "90-100" },
      { min: 80, max: 89, label: "80-89" },
      { min: 70, max: 79, label: "70-79" },
      { min: 60, max: 69, label: "60-69" },
      { min: 0, max: 59, label: "Below 60" },
    ];

    ranges.forEach((r) => distribution.set(r.label, 0));

    for (const grade of grades) {
      const percentage = (grade.score / grade.maxScore) * 100;
      const range = ranges.find((r) => percentage >= r.min && percentage <= r.max);
      if (range) {
        distribution.set(range.label, (distribution.get(range.label) || 0) + 1);
      }
    }

    const gradeDistribution = Array.from(distribution.entries()).map(([range, count]) => ({
      range,
      count,
    }));

    // Count late submissions
    let lateSubmissions = 0;
    if (assignment.dueDateAt) {
      for (const submission of submissions) {
        if (submission.submittedAt > assignment.dueDateAt) {
          lateSubmissions++;
        }
      }
    }

    // Get list of students who haven't submitted
    const submittedStudentIds = new Set(submissions.map((s) => s.studentId));
    const notSubmitted = studentIds.filter((id) => !submittedStudentIds.has(id));

    return {
      totalStudents,
      submittedCount,
      submissionRate,
      averageScore,
      gradeDistribution,
      lateSubmissions,
      notSubmitted,
    };
  },
});

export const getOverdueAssignments = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.array(
    v.object({
      _id: v.id("assignments"),
      title: v.string(),
      dueDateAt: v.number(),
      submissionCount: v.number(),
      missingCount: v.number(),
      daysOverdue: v.number(),
    })
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

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    if (cls.teacherId !== user._id) {
      throw new Error("Only the teacher can view overdue assignments");
    }

    const now = Date.now();

    // Get all enrolled students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const totalStudents = enrollments.length;

    // Get all published assignments with due dates that have passed
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .filter((q) => q.and(
        q.neq(q.field("dueDateAt"), undefined),
        q.lt(q.field("dueDateAt"), now)
      ))
      .collect();

    const overdueAssignments: {
      _id: Id<"assignments">;
      title: string;
      dueDateAt: number;
      submissionCount: number;
      missingCount: number;
      daysOverdue: number;
    }[] = [];

    for (const assignment of assignments) {
      if (!assignment.dueDateAt) continue;

      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
        .collect();

      const submissionCount = submissions.length;
      const missingCount = totalStudents - submissionCount;
      const daysOverdue = Math.floor((now - assignment.dueDateAt) / (1000 * 60 * 60 * 24));

      overdueAssignments.push({
        _id: assignment._id,
        title: assignment.title,
        dueDateAt: assignment.dueDateAt,
        submissionCount,
        missingCount,
        daysOverdue,
      });
    }

    // Sort by most overdue first
    overdueAssignments.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return overdueAssignments;
  },
});

export const getAssignmentAnalytics = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.object({
    totalAssignments: v.number(),
    publishedCount: v.number(),
    unpublishedCount: v.number(),
    averageSubmissionRate: v.optional(v.number()),
    averageGrades: v.array(v.object({
      assignmentId: v.id("assignments"),
      title: v.string(),
      averageScore: v.optional(v.number()),
    })),
    upcomingDeadlines: v.array(v.object({
      _id: v.id("assignments"),
      title: v.string(),
      dueDateAt: v.number(),
      daysUntilDue: v.number(),
    })),
    overdueAssignmentsCount: v.number(),
  }),
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

    if (cls.teacherId !== user._id) {
      throw new Error("Only the teacher can view assignment analytics");
    }

    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

    // Get all assignments
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    const totalAssignments = assignments.length;
    const publishedCount = assignments.filter((a) => a.isPublished).length;
    const unpublishedCount = totalAssignments - publishedCount;

    // Get all enrolled students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const totalStudents = enrollments.length;

    // Calculate submission rates and grades per assignment
    let totalSubmissionRate = 0;
    let gradedAssignmentsCount = 0;
    const averageGrades: {
      assignmentId: Id<"assignments">;
      title: string;
      averageScore?: number;
    }[] = [];

    for (const assignment of assignments) {
      if (!assignment.isPublished) continue;

      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
        .collect();

      if (totalStudents > 0) {
        totalSubmissionRate += (submissions.length / totalStudents) * 100;
      }

      const grades = await ctx.db
        .query("grades")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
        .collect();

      if (grades.length > 0) {
        const totalScore = grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0);
        averageGrades.push({
          assignmentId: assignment._id,
          title: assignment.title,
          averageScore: totalScore / grades.length,
        });
        gradedAssignmentsCount++;
      } else {
        averageGrades.push({
          assignmentId: assignment._id,
          title: assignment.title,
        });
      }
    }

    const averageSubmissionRate = totalAssignments > 0
      ? totalSubmissionRate / publishedCount
      : undefined;

    // Get upcoming deadlines (next 7 days)
    const upcomingDeadlines: {
      _id: Id<"assignments">;
      title: string;
      dueDateAt: number;
      daysUntilDue: number;
    }[] = [];

    for (const assignment of assignments) {
      if (assignment.dueDateAt && assignment.dueDateAt >= now && assignment.dueDateAt <= sevenDaysFromNow) {
        upcomingDeadlines.push({
          _id: assignment._id,
          title: assignment.title,
          dueDateAt: assignment.dueDateAt,
          daysUntilDue: Math.ceil((assignment.dueDateAt - now) / (1000 * 60 * 60 * 24)),
        });
      }
    }

    // Sort upcoming deadlines by due date
    upcomingDeadlines.sort((a, b) => a.dueDateAt - b.dueDateAt);

    // Count overdue assignments
    const overdueAssignmentsCount = assignments.filter(
      (a) => a.isPublished && a.dueDateAt && a.dueDateAt < now
    ).length;

    return {
      totalAssignments,
      publishedCount,
      unpublishedCount,
      averageSubmissionRate,
      averageGrades,
      upcomingDeadlines,
      overdueAssignmentsCount,
    };
  },
});

export const getStudentAssignmentStatus = query({
  args: {
    studentId: v.id("users"),
    classId: v.id("classes"),
  },
  returns: v.array(
    v.object({
      _id: v.id("assignments"),
      title: v.string(),
      instructions: v.string(),
      dueDateAt: v.optional(v.number()),
      status: v.union(v.literal("not_started"), v.literal("submitted"), v.literal("graded")),
      submittedAt: v.optional(v.number()),
      grade: v.optional(v.object({
        score: v.number(),
        maxScore: v.number(),
        feedback: v.optional(v.string()),
      })),
      isLate: v.boolean(),
    })
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

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    // Only teachers can view other students' status
    if (cls.teacherId !== user._id && user._id !== args.studentId) {
      throw new Error("Not authorized to view this student's assignment status");
    }

    // Verify student is enrolled
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", args.studentId)
      )
      .unique();

    if (!enrollment || enrollment.status !== "active") {
      throw new Error("Student is not enrolled in this class");
    }

    const now = Date.now();

    // Get all published assignments for this class
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    const assignmentStatuses: {
      _id: Id<"assignments">;
      title: string;
      instructions: string;
      dueDateAt: number | undefined;
      status: "not_started" | "submitted" | "graded";
      submittedAt: number | undefined;
      grade: {
        score: number;
        maxScore: number;
        feedback?: string;
      } | undefined;
      isLate: boolean;
    }[] = [];

    for (const assignment of assignments) {
      // Check for submission
      const submission = await ctx.db
        .query("submissions")
        .withIndex("by_assignment_and_student", (q) =>
          q.eq("assignmentId", assignment._id).eq("studentId", args.studentId)
        )
        .unique();

      // Check for grade
      const grade = await ctx.db
        .query("grades")
        .withIndex("by_assignment_and_student", (q) =>
          q.eq("assignmentId", assignment._id).eq("studentId", args.studentId)
        )
        .unique();

      // Determine status
      let status: "not_started" | "submitted" | "graded" = "not_started";
      if (grade) {
        status = "graded";
      } else if (submission) {
        status = "submitted";
      }

      // Check if late
      let isLate = false;
      if (submission && assignment.dueDateAt) {
        isLate = submission.submittedAt > assignment.dueDateAt;
      }

      assignmentStatuses.push({
        _id: assignment._id,
        title: assignment.title,
        instructions: assignment.instructions,
        dueDateAt: assignment.dueDateAt,
        status,
        submittedAt: submission?.submittedAt,
        grade: grade
          ? {
              score: grade.score,
              maxScore: grade.maxScore,
              feedback: grade.feedback,
            }
          : undefined,
        isLate,
      });
    }

    // Sort by due date (assignments without due date last), then by status
    assignmentStatuses.sort((a, b) => {
      if (a.dueDateAt && b.dueDateAt) {
        return a.dueDateAt - b.dueDateAt;
      }
      if (a.dueDateAt) return -1;
      if (b.dueDateAt) return 1;
      return 0;
    });

    return assignmentStatuses;
  },
});

// File Upload Functions
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

function isValidMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

export const uploadAssignmentAttachment = action({
  args: {
    assignmentId: v.id("assignments"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  returns: v.object({
    uploadUrl: v.string(),
    fileUrl: v.string(),
    attachmentId: v.id("assignmentAttachments"),
  }),
  handler: async (ctx, args): Promise<{ uploadUrl: string; fileUrl: string; attachmentId: Id<"assignmentAttachments"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(api.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Validate file size
    if (args.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of 50MB`);
    }

    // Validate mime type
    if (!isValidMimeType(args.contentType)) {
      throw new Error(`File type ${args.contentType} is not allowed. Allowed types: PDF, DOC, DOCX, JPEG, PNG, GIF, WEBP`);
    }

    // Verify teacher owns the assignment through internal mutation
    const hasPermission = await ctx.runQuery(api.assignments.checkTeacherPermissionInternal, {
      assignmentId: args.assignmentId,
      userId: user._id,
    });

    if (!hasPermission) {
      throw new Error("Only the teacher can add attachments to assignments");
    }

    // Generate S3 key and get presigned URL
    const key = `assignments/${args.assignmentId}/${Date.now()}_${args.filename}`;
    const { uploadUrl, fileUrl } = await ctx.runAction(api.s3.generateUploadUrl, {
      key,
      contentType: args.contentType,
      expiresInSeconds: 300, // 5 minutes
    });

    // Pre-create the attachment record
    const attachmentId = await ctx.runMutation(api.assignments.createAttachmentRecord, {
      assignmentId: args.assignmentId,
      filename: args.filename,
      url: fileUrl,
      size: args.size,
      mimeType: args.contentType,
    });

    return { uploadUrl, fileUrl, attachmentId };
  },
});

export const createAttachmentRecord = mutation({
  args: {
    assignmentId: v.id("assignments"),
    filename: v.string(),
    url: v.string(),
    size: v.number(),
    mimeType: v.string(),
  },
  returns: v.id("assignmentAttachments"),
  handler: async (ctx, args): Promise<Id<"assignmentAttachments">> => {
    return await ctx.db.insert("assignmentAttachments", {
      ...args,
      uploadedAt: Date.now(),
    });
  },
});

export const confirmAttachmentUpload = mutation({
  args: {
    attachmentId: v.id("assignmentAttachments"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    // Verify the attachment exists (this confirms the upload was initiated)
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) {
      throw new Error("Attachment not found");
    }
    // The file is already in S3 at this point, so we just confirm the record exists
    return null;
  },
});

export const getAssignmentAttachments = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.array(
    v.object({
      _id: v.id("assignmentAttachments"),
      _creationTime: v.number(),
      assignmentId: v.id("assignments"),
      filename: v.string(),
      url: v.string(),
      size: v.number(),
      mimeType: v.string(),
      uploadedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(api.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user can view this assignment's attachments
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const cls = await ctx.db.get(assignment.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id || assignment.creatorId === user._id;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", assignment.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isTeacher && !isEnrolled) {
      throw new Error("Not authorized to view attachments for this assignment");
    }

    const attachments = await ctx.db
      .query("assignmentAttachments")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    return attachments;
  },
});

export const deleteAssignmentAttachment = mutation({
  args: {
    attachmentId: v.id("assignmentAttachments"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(api.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!user) {
      throw new Error("User not found");
    }

    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) {
      throw new Error("Attachment not found");
    }

    const assignment = await ctx.db.get(attachment.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const cls = await ctx.db.get(assignment.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    // Only teacher or creator can delete
    if (cls.teacherId !== user._id && assignment.creatorId !== user._id) {
      throw new Error("Only the teacher can delete attachments");
    }

    await ctx.db.delete(args.attachmentId);
    return null;
  },
});

// Submission attachment functions
export const uploadSubmissionAttachment = action({
  args: {
    assignmentId: v.id("assignments"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  returns: v.object({
    uploadUrl: v.string(),
    fileUrl: v.string(),
    attachmentId: v.id("submissionAttachments"),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(api.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "student") {
      throw new Error("Only students can submit assignment attachments");
    }

    // Validate file size
    if (args.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of 50MB`);
    }

    // Validate mime type
    if (!isValidMimeType(args.contentType)) {
      throw new Error(`File type ${args.contentType} is not allowed. Allowed types: PDF, DOC, DOCX, JPEG, PNG, GIF, WEBP`);
    }

    // Get assignment and verify student is enrolled
    const assignment = await ctx.runQuery(api.assignments.getAssignmentById, {
      assignmentId: args.assignmentId,
    });

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", assignment.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isEnrolled) {
      throw new Error("Not enrolled in this class");
    }

    // Get or create submission
    let submission = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_and_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", user._id)
      )
      .unique();

    if (!submission) {
      // Create a submission first
      const submissionId = await ctx.runMutation(api.submissions.createSubmissionForAttachment, {
        assignmentId: args.assignmentId,
        studentId: user._id,
      });
      submission = await ctx.db.get(submissionId);
      if (!submission) {
        throw new Error("Failed to create submission");
      }
    }

    // Generate S3 key and get presigned URL
    const key = `submissions/${submission._id}/${Date.now()}_${args.filename}`;
    const { uploadUrl, fileUrl } = await ctx.runAction(api.s3.generateUploadUrl, {
      key,
      contentType: args.contentType,
      expiresInSeconds: 300, // 5 minutes
    });

    // Pre-create the attachment record
    const attachmentId = await ctx.runMutation(api.assignments.createSubmissionAttachmentRecord, {
      submissionId: submission._id,
      filename: args.filename,
      url: fileUrl,
      size: args.size,
      mimeType: args.contentType,
    });

    return { uploadUrl, fileUrl, attachmentId };
  },
});

export const createSubmissionAttachmentRecord = mutation({
  args: {
    submissionId: v.id("submissions"),
    filename: v.string(),
    url: v.string(),
    size: v.number(),
    mimeType: v.string(),
  },
  returns: v.id("submissionAttachments"),
  handler: async (ctx, args): Promise<Id<"submissionAttachments">> => {
    return await ctx.db.insert("submissionAttachments", {
      ...args,
      uploadedAt: Date.now(),
    });
  },
});

export const confirmSubmissionAttachmentUpload = mutation({
  args: {
    attachmentId: v.id("submissionAttachments"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) {
      throw new Error("Attachment not found");
    }
    return null;
  },
});

export const getSubmissionAttachments = query({
  args: {
    submissionId: v.id("submissions"),
  },
  returns: v.array(
    v.object({
      _id: v.id("submissionAttachments"),
      _creationTime: v.number(),
      submissionId: v.id("submissions"),
      filename: v.string(),
      url: v.string(),
      size: v.number(),
      mimeType: v.string(),
      uploadedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(api.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user can view this submission's attachments
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    const assignment = await ctx.db.get(submission.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const cls = await ctx.db.get(assignment.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id || assignment.creatorId === user._id;
    const isOwner = submission.studentId === user._id;

    if (!isTeacher && !isOwner) {
      throw new Error("Not authorized to view these attachments");
    }

    const attachments = await ctx.db
      .query("submissionAttachments")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .collect();

    return attachments;
  },
});

export const deleteSubmissionAttachment = mutation({
  args: {
    attachmentId: v.id("submissionAttachments"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(api.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!user) {
      throw new Error("User not found");
    }

    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) {
      throw new Error("Attachment not found");
    }

    const submission = await ctx.db.get(attachment.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    // Only the student who submitted can delete their own attachments
    if (submission.studentId !== user._id) {
      throw new Error("You can only delete your own attachments");
    }

    await ctx.db.delete(args.attachmentId);
    return null;
  },
});
