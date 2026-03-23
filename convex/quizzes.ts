import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";
import { internal } from "./_generated/api";

// Helper function to get current user
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q: any) => q.eq("username", usernameFromIdentity(identity)))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

// Start a new quiz attempt or return existing in-progress attempt
export const startQuizAttempt = mutation({
  args: { assignmentId: v.id("assignments") },
  returns: v.object({
    attemptId: v.id("quizAttempts"),
    startedAt: v.number(),
    timeLimitMinutes: v.number(),
    endsAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    if (user.role !== "student") {
      throw new Error("Only students can start quiz attempts");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    
    if (!assignment) {
      throw new Error("Assignment not found");
    }
    
    if (!assignment.timeLimitMinutes) {
      throw new Error("Not a timed quiz");
    }
    
    if (!assignment.isPublished) {
      throw new Error("Assignment not published");
    }

    // Check enrollment
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", assignment.classId).eq("studentId", user._id)
      )
      .unique();

    if (!enrollment || enrollment.status !== "active") {
      throw new Error("Not enrolled in this class");
    }

    // Check if already has in-progress attempt
    const existingAttempt = await ctx.db
      .query("quizAttempts")
      .withIndex("by_student_and_assignment", (q) =>
        q.eq("studentId", user._id).eq("assignmentId", args.assignmentId)
      )
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .unique();

    if (existingAttempt) {
      // Check if time has expired
      const timeLimitMs = assignment.timeLimitMinutes * 60 * 1000;
      const endsAt = existingAttempt.startedAt + timeLimitMs;
      
      if (Date.now() > endsAt) {
        // Time expired, mark as expired
        await ctx.db.patch(existingAttempt._id, { status: "expired" });
        throw new Error("Quiz time has expired. Please contact your teacher.");
      }

      return {
        attemptId: existingAttempt._id,
        startedAt: existingAttempt.startedAt,
        timeLimitMinutes: assignment.timeLimitMinutes,
        endsAt,
      };
    }

    // Check if already completed
    const completedAttempt = await ctx.db
      .query("quizAttempts")
      .withIndex("by_student_and_assignment", (q) =>
        q.eq("studentId", user._id).eq("assignmentId", args.assignmentId)
      )
      .filter((q) => q.or(
        q.eq(q.field("status"), "completed"),
        q.eq(q.field("status"), "expired")
      ))
      .unique();

    if (completedAttempt) {
      throw new Error("You have already completed this quiz");
    }

    // Create new attempt
    const startedAt = Date.now();
    const timeLimitMs = assignment.timeLimitMinutes * 60 * 1000;
    const endsAt = startedAt + timeLimitMs;
    
    const attemptId = await ctx.db.insert("quizAttempts", {
      assignmentId: args.assignmentId,
      studentId: user._id,
      startedAt,
      status: "in_progress",
      answers: [],
    });

    // Schedule auto-submit when time expires
    await ctx.scheduler.runAfter(
      timeLimitMs,
      internal.quizzes.autoSubmitQuiz,
      { attemptId }
    );

    return {
      attemptId,
      startedAt,
      timeLimitMinutes: assignment.timeLimitMinutes,
      endsAt,
    };
  },
});

// Get time remaining for an attempt
export const getTimeRemaining = query({
  args: { attemptId: v.id("quizAttempts") },
  returns: v.object({
    remainingSeconds: v.number(),
    totalSeconds: v.number(),
    isExpired: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) {
      throw new Error("Attempt not found");
    }

    const assignment = await ctx.db.get(attempt.assignmentId);
    if (!assignment?.timeLimitMinutes) {
      throw new Error("Not a timed quiz");
    }

    const totalSeconds = assignment.timeLimitMinutes * 60;
    const elapsedSeconds = Math.floor((Date.now() - attempt.startedAt) / 1000);
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    return {
      remainingSeconds,
      totalSeconds,
      isExpired: remainingSeconds === 0 || attempt.status !== "in_progress",
    };
  },
});

// Auto-submit quiz when time expires (internal mutation)
export const autoSubmitQuiz = internalMutation({
  args: { attemptId: v.id("quizAttempts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) return null;

    // Only process if still in progress
    if (attempt.status !== "in_progress") {
      return null;
    }

    const assignment = await ctx.db.get(attempt.assignmentId);
    if (!assignment) return null;

    // Mark attempt as expired
    await ctx.db.patch(args.attemptId, {
      status: "expired",
      submittedAt: Date.now(),
    });

    // Create submission with whatever answers were saved
    const submissionId = await ctx.db.insert("submissions", {
      assignmentId: attempt.assignmentId,
      studentId: attempt.studentId,
      answers: attempt.answers,
      submittedAt: Date.now(),
    });

    // Link submission to attempt
    await ctx.db.patch(args.attemptId, { submissionId });

    // Auto-grade if multiple choice
    if (assignment.type === "multiple_choice") {
      await ctx.runMutation(internal.submissions.autoGradeSubmission, {
        submissionId,
      });
    }

    // Recalculate student progress
    await ctx.runMutation(internal.progress.calculateStudentProgress, {
      studentId: attempt.studentId,
      classId: assignment.classId,
    });

    return null;
  },
});

// Submit quiz manually
export const submitQuiz = mutation({
  args: {
    attemptId: v.id("quizAttempts"),
    answers: v.array(v.object({
      questionId: v.string(),
      value: v.string(),
    })),
  },
  returns: v.object({
    submissionId: v.id("submissions"),
    attemptId: v.id("quizAttempts"),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    if (user.role !== "student") {
      throw new Error("Only students can submit quizzes");
    }

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) {
      throw new Error("Attempt not found");
    }

    if (attempt.studentId !== user._id) {
      throw new Error("Not authorized to submit this quiz");
    }

    if (attempt.status !== "in_progress") {
      throw new Error("Quiz already submitted or expired");
    }

    const assignment = await ctx.db.get(attempt.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Check if time has expired
    const timeLimitMs = assignment.timeLimitMinutes! * 60 * 1000;
    if (Date.now() > attempt.startedAt + timeLimitMs) {
      await ctx.db.patch(args.attemptId, { status: "expired" });
      throw new Error("Quiz time has expired");
    }

    // Mark attempt as completed
    await ctx.db.patch(args.attemptId, {
      status: "completed",
      submittedAt: Date.now(),
      answers: args.answers,
    });

    // Create submission
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
      assignmentId: attempt.assignmentId,
      studentId: user._id,
      answers: args.answers,
      submittedAt: Date.now(),
      autoScore,
      autoGradedAt,
    });

    // Link submission to attempt
    await ctx.db.patch(args.attemptId, { submissionId });

    // Create grade record for auto-graded submissions
    if (autoScore !== undefined && autoGradedAt !== undefined) {
      await ctx.db.insert("grades", {
        assignmentId: attempt.assignmentId,
        studentId: user._id,
        submissionId,
        score: autoScore,
        maxScore: 100,
        gradedBy: assignment.creatorId,
        gradedAt: autoGradedAt,
        classId: assignment.classId,
      });
    }

    // Recalculate student progress
    await ctx.runMutation(internal.progress.calculateStudentProgress, {
      studentId: user._id,
      classId: assignment.classId,
    });

    return { submissionId, attemptId: args.attemptId };
  },
});

// Save answers during quiz (auto-save)
export const saveAnswers = mutation({
  args: {
    attemptId: v.id("quizAttempts"),
    answers: v.array(v.object({
      questionId: v.string(),
      value: v.string(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) {
      throw new Error("Attempt not found");
    }

    if (attempt.studentId !== user._id) {
      throw new Error("Not authorized");
    }

    if (attempt.status !== "in_progress") {
      throw new Error("Quiz is no longer in progress");
    }

    const assignment = await ctx.db.get(attempt.assignmentId);
    if (!assignment?.timeLimitMinutes) {
      throw new Error("Not a timed quiz");
    }

    // Check if time has expired
    const timeLimitMs = assignment.timeLimitMinutes * 60 * 1000;
    if (Date.now() > attempt.startedAt + timeLimitMs) {
      throw new Error("Quiz time has expired");
    }

    await ctx.db.patch(args.attemptId, { answers: args.answers });
    return null;
  },
});

// Get quiz attempt details with time remaining
export const getQuizAttempt = query({
  args: { attemptId: v.id("quizAttempts") },
  returns: v.union(
    v.object({
      _id: v.id("quizAttempts"),
      assignmentId: v.id("assignments"),
      studentId: v.id("users"),
      startedAt: v.number(),
      submittedAt: v.optional(v.number()),
      status: v.union(v.literal("in_progress"), v.literal("completed"), v.literal("expired")),
      answers: v.array(v.object({
        questionId: v.string(),
        value: v.string(),
      })),
      submissionId: v.optional(v.id("submissions")),
      remainingSeconds: v.number(),
      totalSeconds: v.number(),
      endsAt: v.number(),
      assignment: v.object({
        _id: v.id("assignments"),
        title: v.string(),
        instructions: v.string(),
        questions: v.array(v.object({
          id: v.string(),
          text: v.string(),
          options: v.optional(v.array(v.string())),
          correctOption: v.optional(v.number()),
        })),
        timeLimitMinutes: v.number(),
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

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) {
      return null;
    }

    // Only the student who started the attempt or a teacher can view it
    if (attempt.studentId !== user._id) {
      const assignment = await ctx.db.get(attempt.assignmentId);
      if (!assignment) return null;
      
      const cls = await ctx.db.get(assignment.classId);
      if (!cls || (cls.teacherId !== user._id && assignment.creatorId !== user._id)) {
        throw new Error("Not authorized to view this attempt");
      }
    }

    const assignment = await ctx.db.get(attempt.assignmentId);
    if (!assignment || !assignment.timeLimitMinutes) {
      return null;
    }

    const totalSeconds = assignment.timeLimitMinutes * 60;
    const elapsedSeconds = Math.floor((Date.now() - attempt.startedAt) / 1000);
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
    const endsAt = attempt.startedAt + (assignment.timeLimitMinutes * 60 * 1000);

    return {
      _id: attempt._id,
      assignmentId: attempt.assignmentId,
      studentId: attempt.studentId,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
      answers: attempt.answers,
      submissionId: attempt.submissionId,
      remainingSeconds,
      totalSeconds,
      endsAt,
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        instructions: assignment.instructions,
        questions: assignment.questions,
        timeLimitMinutes: assignment.timeLimitMinutes,
      },
    };
  },
});

// Get student's attempts for an assignment
export const getMyQuizAttempts = query({
  args: { assignmentId: v.id("assignments") },
  returns: v.array(v.object({
    _id: v.id("quizAttempts"),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    status: v.union(v.literal("in_progress"), v.literal("completed"), v.literal("expired")),
    submissionId: v.optional(v.id("submissions")),
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

    const attempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_student_and_assignment", (q) =>
        q.eq("studentId", user._id).eq("assignmentId", args.assignmentId)
      )
      .order("desc")
      .collect();

    return attempts.map(attempt => ({
      _id: attempt._id,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
      submissionId: attempt.submissionId,
    }));
  },
});

// Check if student has an active quiz attempt
export const getActiveQuizAttempt = query({
  args: { assignmentId: v.id("assignments") },
  returns: v.union(
    v.object({
      attemptId: v.id("quizAttempts"),
      startedAt: v.number(),
      timeLimitMinutes: v.number(),
      endsAt: v.number(),
      remainingSeconds: v.number(),
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

    const attempt = await ctx.db
      .query("quizAttempts")
      .withIndex("by_student_and_assignment", (q) =>
        q.eq("studentId", user._id).eq("assignmentId", args.assignmentId)
      )
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .unique();

    if (!attempt) {
      return null;
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment?.timeLimitMinutes) {
      return null;
    }

    const timeLimitMs = assignment.timeLimitMinutes * 60 * 1000;
    const endsAt = attempt.startedAt + timeLimitMs;
    const elapsedSeconds = Math.floor((Date.now() - attempt.startedAt) / 1000);
    const remainingSeconds = Math.max(0, assignment.timeLimitMinutes * 60 - elapsedSeconds);

    // If expired, return null
    if (remainingSeconds === 0) {
      return null;
    }

    return {
      attemptId: attempt._id,
      startedAt: attempt.startedAt,
      timeLimitMinutes: assignment.timeLimitMinutes,
      endsAt,
      remainingSeconds,
    };
  },
});

// Get all quiz attempts for a teacher to view
export const getQuizAttemptsForAssignment = query({
  args: { assignmentId: v.id("assignments") },
  returns: v.array(v.object({
    _id: v.id("quizAttempts"),
    studentId: v.id("users"),
    studentName: v.string(),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    status: v.union(v.literal("in_progress"), v.literal("completed"), v.literal("expired")),
    submissionId: v.optional(v.id("submissions")),
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

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const cls = await ctx.db.get(assignment.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    // Only teacher or creator can view all attempts
    if (cls.teacherId !== user._id && assignment.creatorId !== user._id && user.role !== "admin") {
      throw new Error("Only the teacher can view quiz attempts");
    }

    const attempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .order("desc")
      .collect();

    const attemptsWithStudentInfo = await Promise.all(
      attempts.map(async (attempt) => {
        const student = await ctx.db.get(attempt.studentId);
        return {
          _id: attempt._id,
          studentId: attempt.studentId,
          studentName: student?.displayName || "Unknown",
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          status: attempt.status,
          submissionId: attempt.submissionId,
        };
      })
    );

    return attemptsWithStudentInfo;
  },
});
