import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";
import { api } from "./_generated/api";

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
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
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
    let autoGradedAt: number | undefined = undefined;
    
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
      autoGradedAt = Date.now();
    }

    const submissionId = await ctx.db.insert("submissions", {
      assignmentId: args.assignmentId,
      studentId: user._id,
      answers: args.answers,
      submittedAt: Date.now(),
      autoScore,
      autoGradedAt,
    });

    // Create grade record for auto-graded multiple choice submissions
    if (autoScore !== undefined && autoGradedAt !== undefined) {
      await ctx.db.insert("grades", {
        assignmentId: args.assignmentId,
        studentId: user._id,
        submissionId,
        score: autoScore,
        maxScore: 100,
        gradedBy: cls.teacherId,
        gradedAt: autoGradedAt,
        classId: assignment.classId,
      });
    }

    return submissionId;
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
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
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

    const isOverride = submission.autoScore !== undefined && submission.autoScore !== args.teacherScore;

    await ctx.db.patch(args.submissionId, {
      teacherScore: args.teacherScore,
      teacherFeedback: args.teacherFeedback,
      isTeacherOverride: isOverride,
    });

    // Update or create grade record with teacher score
    const existingGrade = await ctx.db
      .query("grades")
      .withIndex("by_assignment_and_student", (q) =>
        q.eq("assignmentId", submission.assignmentId).eq("studentId", submission.studentId)
      )
      .unique();

    const gradeData = {
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      submissionId: args.submissionId,
      score: args.teacherScore,
      maxScore: 100,
      feedback: args.teacherFeedback,
      gradedBy: user._id,
      gradedAt: Date.now(),
      classId: assignment.classId,
    };

    if (existingGrade) {
      await ctx.db.patch(existingGrade._id, gradeData);
    } else {
      await ctx.db.insert("grades", gradeData);
    }

    return null;
  },
});

export const autoGradeSubmission = internalMutation({
  args: { submissionId: v.id("submissions") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;

    const assignment = await ctx.db.get(submission.assignmentId);
    if (!assignment || assignment.type !== "multiple_choice") return null;

    // Skip if already auto-graded
    if (submission.autoGradedAt !== undefined) return null;

    let correctCount = 0;
    const totalQuestions = assignment.questions.length;

    if (totalQuestions === 0) return null;

    for (const question of assignment.questions) {
      if (question.correctOption !== undefined) {
        const answer = submission.answers.find(a => a.questionId === question.id);
        if (answer) {
          const studentAnswer = parseInt(answer.value);
          if (!isNaN(studentAnswer) && studentAnswer === question.correctOption) {
            correctCount++;
          }
        }
      }
    }

    const score = Math.round((correctCount / totalQuestions) * 100);
    const autoGradedAt = Date.now();

    // Update submission with auto-grade
    await ctx.db.patch(args.submissionId, {
      autoScore: score,
      autoGradedAt,
    });

    // Create grade record
    const existingGrade = await ctx.db
      .query("grades")
      .withIndex("by_assignment_and_student", (q) =>
        q.eq("assignmentId", submission.assignmentId).eq("studentId", submission.studentId)
      )
      .unique();

    const gradeData = {
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      submissionId: args.submissionId,
      score,
      maxScore: 100,
      gradedBy: assignment.creatorId,
      gradedAt: autoGradedAt,
      classId: assignment.classId,
    };

    if (existingGrade) {
      await ctx.db.patch(existingGrade._id, gradeData);
    } else {
      await ctx.db.insert("grades", gradeData);
    }

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
      autoGradedAt: v.optional(v.number()),
      teacherScore: v.optional(v.number()),
      teacherFeedback: v.optional(v.string()),
      isTeacherOverride: v.optional(v.boolean()),
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
      autoGradedAt: v.optional(v.number()),
      teacherScore: v.optional(v.number()),
      teacherFeedback: v.optional(v.string()),
      isTeacherOverride: v.optional(v.boolean()),
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

export const getSubmissionDetailsForGrading = query({
  args: {
    submissionId: v.id("submissions"),
  },
  returns: v.union(
    v.object({
      submission: v.object({
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
        autoGradedAt: v.optional(v.number()),
        teacherScore: v.optional(v.number()),
        teacherFeedback: v.optional(v.string()),
        isTeacherOverride: v.optional(v.boolean()),
      }),
      assignment: v.object({
        _id: v.id("assignments"),
        title: v.string(),
        type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
        questions: v.array(v.object({
          id: v.string(),
          text: v.string(),
          options: v.optional(v.array(v.string())),
          correctOption: v.optional(v.number()),
        })),
        classId: v.id("classes"),
      }),
      student: v.object({
        _id: v.id("users"),
        displayName: v.string(),
        username: v.string(),
      }),
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

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;

    const assignment = await ctx.db.get(submission.assignmentId);
    if (!assignment) return null;

    const cls = await ctx.db.get(assignment.classId);
    if (!cls) return null;

    // Only teacher or creator can view submission details for grading
    if (cls.teacherId !== user._id && assignment.creatorId !== user._id && user.role !== "admin") {
      throw new Error("Only the teacher can view submission details for grading");
    }

    const student = await ctx.db.get(submission.studentId);
    if (!student) return null;

    return {
      submission: {
        _id: submission._id,
        _creationTime: submission._creationTime,
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        answers: submission.answers,
        submittedAt: submission.submittedAt,
        autoScore: submission.autoScore,
        autoGradedAt: submission.autoGradedAt,
        teacherScore: submission.teacherScore,
        teacherFeedback: submission.teacherFeedback,
        isTeacherOverride: submission.isTeacherOverride,
      },
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        type: assignment.type,
        questions: assignment.questions,
        classId: assignment.classId,
      },
      student: {
        _id: student._id,
        displayName: student.displayName,
        username: student.username,
      },
    };
  },
});
