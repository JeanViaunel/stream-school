import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const submitAnswers = mutation({
  args: {
    assignmentId: v.id("assignments"),
    answers: v.array(v.object({
      questionId: v.string(),
      value: v.string(),
    })),
  },
  returns: v.id("submissions"),
  handler: async (ctx, args): Promise<Id<"submissions">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "student") {
      throw new Error("Only students can submit assignments");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const cls = await ctx.db.get(assignment.classId);
    if (!cls) {
      throw new Error("Class not found");
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

    const existingSubmission = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_and_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", user._id)
      )
      .unique();

    if (existingSubmission) {
      throw new Error("Already submitted");
    }

    let autoScore: number | undefined = undefined;
    if (assignment.type === "multiple_choice") {
      let correctCount = 0;
      for (const question of assignment.questions) {
        if (question.correctOption !== undefined) {
          const answer = args.answers.find(a => a.questionId === question.id);
          if (answer && parseInt(answer.value) === question.correctOption) {
            correctCount++;
          }
        }
      }
      autoScore = Math.round((correctCount / assignment.questions.length) * 100);
    }

    return await ctx.db.insert("submissions", {
      assignmentId: args.assignmentId,
      studentId: user._id,
      answers: args.answers,
      submittedAt: Date.now(),
      autoScore,
    });
  },
});

export const gradeSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    teacherScore: v.number(),
    teacherFeedback: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

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

    if (cls.teacherId !== user._id && assignment.creatorId !== user._id) {
      throw new Error("Only the teacher can grade submissions");
    }

    await ctx.db.patch(args.submissionId, {
      teacherScore: args.teacherScore,
      teacherFeedback: args.teacherFeedback,
    });
    return null;
  },
});

export const getSubmissionsByAssignment = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.array(
    v.object({
      _id: v.id("submissions"),
      _creationTime: v.number(),
      assignmentId: v.id("assignments"),
      studentId: v.id("users"),
      answers: v.array(v.object({
        questionId: v.string(),
        value: v.string(),
      })),
      submittedAt: v.number(),
      autoScore: v.optional(v.number()),
      teacherScore: v.optional(v.number()),
      teacherFeedback: v.optional(v.string()),
      student: v.object({
        _id: v.id("users"),
        displayName: v.string(),
        username: v.string(),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", identity.tokenIdentifier))
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

    if (cls.teacherId !== user._id && assignment.creatorId !== user._id) {
      throw new Error("Only the teacher can view submissions");
    }

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const submissionsWithStudentInfo = await Promise.all(
      submissions.map(async (submission) => {
        const student = await ctx.db.get(submission.studentId);
        if (!student) {
          throw new Error("Student not found");
        }
        return {
          ...submission,
          student: {
            _id: student._id,
            displayName: student.displayName,
            username: student.username,
          },
        };
      })
    );

    return submissionsWithStudentInfo;
  },
});

export const getMySubmission = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.union(
    v.object({
      _id: v.id("submissions"),
      _creationTime: v.number(),
      assignmentId: v.id("assignments"),
      studentId: v.id("users"),
      answers: v.array(v.object({
        questionId: v.string(),
        value: v.string(),
      })),
      submittedAt: v.number(),
      autoScore: v.optional(v.number()),
      teacherScore: v.optional(v.number()),
      teacherFeedback: v.optional(v.string()),
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
      .withIndex("by_username", (q) => q.eq("username", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "student") {
      throw new Error("Only students can view their submissions");
    }

    const submission = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_and_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", user._id)
      )
      .unique();

    return submission || null;
  },
});
