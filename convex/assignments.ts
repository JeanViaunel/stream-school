import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

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
