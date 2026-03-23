import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

export const recordGrade = mutation({
  args: {
    assignmentId: v.id("assignments"),
    studentId: v.id("users"),
    submissionId: v.optional(v.id("submissions")),
    score: v.number(),
    maxScore: v.number(),
    feedback: v.optional(v.string()),
  },
  returns: v.id("grades"),
  handler: async (ctx, args): Promise<Id<"grades">> => {
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

    if (cls.teacherId !== user._id && assignment.creatorId !== user._id && user.role !== "admin") {
      throw new Error("Only the teacher or an admin can record grades");
    }

    const existingGrade = await ctx.db
      .query("grades")
      .withIndex("by_assignment_and_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", args.studentId)
      )
      .unique();

    const gradeData = {
      assignmentId: args.assignmentId,
      studentId: args.studentId,
      submissionId: args.submissionId,
      score: args.score,
      maxScore: args.maxScore,
      feedback: args.feedback,
      gradedBy: user._id,
      gradedAt: Date.now(),
      classId: assignment.classId,
    };

    if (existingGrade) {
      await ctx.db.patch(existingGrade._id, gradeData);
      return existingGrade._id;
    } else {
      return await ctx.db.insert("grades", gradeData);
    }
  },
});

export const getGradebookByClass = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.object({
    students: v.array(
      v.object({
        id: v.id("users"),
        displayName: v.string(),
        username: v.string(),
      })
    ),
    assignments: v.array(
      v.object({
        id: v.id("assignments"),
        title: v.string(),
      })
    ),
    grades: v.array(
      v.object({
        studentId: v.id("users"),
        assignmentId: v.id("assignments"),
        score: v.number(),
        maxScore: v.number(),
      })
    ),
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

    if (cls.teacherId !== user._id && user.role !== "admin") {
      throw new Error("Only the teacher or an admin can view the gradebook");
    }

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const students = await Promise.all(
      enrollments.map(async (enrollment) => {
        const student = await ctx.db.get(enrollment.studentId);
        if (!student) {
          throw new Error("Student not found");
        }
        return {
          id: student._id,
          displayName: student.displayName,
          username: student.username,
        };
      })
    );

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    const assignmentData = assignments.map((a) => ({
      id: a._id,
      title: a.title,
    }));

    const grades = await ctx.db
      .query("grades")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    const gradeData = grades.map((g) => ({
      studentId: g.studentId,
      assignmentId: g.assignmentId,
      score: g.score,
      maxScore: g.maxScore,
    }));

    return {
      students,
      assignments: assignmentData,
      grades: gradeData,
    };
  },
});

export const getMyGrades = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.object({
    grades: v.array(
      v.object({
        _id: v.id("grades"),
        assignmentId: v.id("assignments"),
        assignmentTitle: v.string(),
        assignmentDueDate: v.optional(v.number()),
        score: v.number(),
        maxScore: v.number(),
        feedback: v.optional(v.string()),
        gradedAt: v.number(),
      })
    ),
    overallAverage: v.union(v.number(), v.null()),
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

    if (user.role !== "student") {
      throw new Error("Only students can view their grades");
    }

    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!isEnrolled) {
      throw new Error("Not enrolled in this class");
    }

    const grades = await ctx.db
      .query("grades")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .filter((q) => q.eq(q.field("classId"), args.classId))
      .collect();

    const gradesWithAssignmentInfo = await Promise.all(
      grades.map(async (grade) => {
        const assignment = await ctx.db.get(grade.assignmentId);
        if (!assignment) {
          throw new Error("Assignment not found");
        }
        return {
          _id: grade._id,
          assignmentId: grade.assignmentId,
          assignmentTitle: assignment.title,
          assignmentDueDate: assignment.dueDateAt,
          score: grade.score,
          maxScore: grade.maxScore,
          feedback: grade.feedback,
          gradedAt: grade.gradedAt,
        };
      })
    );

    let overallAverage: number | null = null;
    if (grades.length > 0) {
      const totalPercentage = grades.reduce((sum, g) => sum + (g.score / g.maxScore), 0);
      overallAverage = Math.round((totalPercentage / grades.length) * 100);
    }

    return {
      grades: gradesWithAssignmentInfo,
      overallAverage,
    };
  },
});

export const getChildGrades = query({
  args: {
    classId: v.id("classes"),
    childId: v.id("users"),
  },
  returns: v.object({
    grades: v.array(
      v.object({
        _id: v.id("grades"),
        assignmentId: v.id("assignments"),
        assignmentTitle: v.string(),
        assignmentDueDate: v.optional(v.number()),
        score: v.number(),
        maxScore: v.number(),
        feedback: v.optional(v.string()),
        gradedAt: v.number(),
      })
    ),
    overallAverage: v.union(v.number(), v.null()),
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

    if (user.role !== "parent") {
      throw new Error("Only parents can view child grades");
    }

    const link = await ctx.db
      .query("parentLinks")
      .withIndex("by_parent_and_student", (q) =>
        q.eq("parentId", user._id).eq("studentId", args.childId)
      )
      .unique();

    if (!link || !link.consentGiven) {
      throw new Error("Parent is not linked to this child");
    }

    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", args.childId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!isEnrolled) {
      throw new Error("Child is not enrolled in this class");
    }

    const grades = await ctx.db
      .query("grades")
      .withIndex("by_student", (q) => q.eq("studentId", args.childId))
      .filter((q) => q.eq(q.field("classId"), args.classId))
      .collect();

    const gradesWithAssignmentInfo = await Promise.all(
      grades.map(async (grade) => {
        const assignment = await ctx.db.get(grade.assignmentId);
        if (!assignment) {
          throw new Error("Assignment not found");
        }
        return {
          _id: grade._id,
          assignmentId: grade.assignmentId,
          assignmentTitle: assignment.title,
          assignmentDueDate: assignment.dueDateAt,
          score: grade.score,
          maxScore: grade.maxScore,
          feedback: grade.feedback,
          gradedAt: grade.gradedAt,
        };
      })
    );

    let overallAverage: number | null = null;
    if (grades.length > 0) {
      const totalPercentage = grades.reduce((sum, g) => sum + (g.score / g.maxScore), 0);
      overallAverage = Math.round((totalPercentage / grades.length) * 100);
    }

    return {
      grades: gradesWithAssignmentInfo,
      overallAverage,
    };
  },
});

export const getClassAverage = query({
  args: {
    classId: v.id("classes"),
    assignmentId: v.id("assignments"),
  },
  returns: v.union(v.number(), v.null()),
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

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const isTeacher = cls.teacherId === user._id;
    const isAdmin = user.role === "admin";
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!isTeacher && !isAdmin && !isEnrolled) {
      throw new Error("Not authorized to view this class average");
    }

    const grades = await ctx.db
      .query("grades")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    if (grades.length === 0) {
      return null;
    }

    const totalPercentage = grades.reduce((sum, g) => sum + (g.score / g.maxScore), 0);
    return Math.round((totalPercentage / grades.length) * 100);
  },
});

export const getGradeStatistics = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.object({
    classAverage: v.union(v.number(), v.null()),
    gradeDistribution: v.object({
      A: v.number(),
      B: v.number(),
      C: v.number(),
      D: v.number(),
      F: v.number(),
    }),
    assignmentAverages: v.array(
      v.object({
        assignmentId: v.id("assignments"),
        title: v.string(),
        average: v.number(),
      })
    ),
    trendsOverTime: v.array(
      v.object({
        weekLabel: v.string(),
        average: v.union(v.number(), v.null()),
      })
    ),
    highestGrade: v.union(v.number(), v.null()),
    lowestGrade: v.union(v.number(), v.null()),
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

    if (cls.teacherId !== user._id && user.role !== "admin") {
      throw new Error("Only the teacher or an admin can view grade statistics");
    }

    const grades = await ctx.db
      .query("grades")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    if (grades.length === 0) {
      return {
        classAverage: null,
        gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
        assignmentAverages: [],
        trendsOverTime: [],
        highestGrade: null,
        lowestGrade: null,
      };
    }

    const percentages = grades.map((g) => (g.score / g.maxScore) * 100);
    const classAverage = Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);

    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    percentages.forEach((p) => {
      if (p >= 90) distribution.A++;
      else if (p >= 80) distribution.B++;
      else if (p >= 70) distribution.C++;
      else if (p >= 60) distribution.D++;
      else distribution.F++;
    });

    const highestGrade = Math.max(...percentages);
    const lowestGrade = Math.min(...percentages);

    const assignmentIds = [...new Set(grades.map((g) => g.assignmentId))];
    const assignmentAverages = await Promise.all(
      assignmentIds.map(async (assignmentId) => {
        const assignment = await ctx.db.get(assignmentId);
        const assignmentGrades = grades.filter((g) => g.assignmentId === assignmentId);
        const avg = Math.round(
          assignmentGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) /
            assignmentGrades.length
        );
        return {
          assignmentId,
          title: assignment?.title || "Unknown Assignment",
          average: avg,
        };
      })
    );

    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const trendsOverTime = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = now - (i + 1) * oneWeek;
      const weekEnd = now - i * oneWeek;
      const weekGrades = grades.filter((g) => g.gradedAt >= weekStart && g.gradedAt < weekEnd);
      
      const weekLabel = i === 0 ? "This Week" : `${i} Week${i > 1 ? "s" : ""} Ago`;
      
      if (weekGrades.length > 0) {
        const weekAvg = Math.round(
          weekGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / weekGrades.length
        );
        trendsOverTime.push({ weekLabel, average: weekAvg });
      } else {
        trendsOverTime.push({ weekLabel, average: null });
      }
    }

    return {
      classAverage,
      gradeDistribution: distribution,
      assignmentAverages,
      trendsOverTime,
      highestGrade,
      lowestGrade,
    };
  },
});

export const getStudentsWithoutGrades = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.array(
    v.object({
      studentId: v.id("users"),
      name: v.string(),
      submittedAt: v.number(),
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

    if (cls.teacherId !== user._id && assignment.creatorId !== user._id && user.role !== "admin") {
      throw new Error("Only the teacher or an admin can view ungraded submissions");
    }

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const existingGrades = await ctx.db
      .query("grades")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const gradedStudentIds = new Set(existingGrades.map((g) => g.studentId));

    const ungradedSubmissions = submissions.filter(
      (s) => !gradedStudentIds.has(s.studentId)
    );

    const studentsWithoutGrades = await Promise.all(
      ungradedSubmissions.map(async (submission) => {
        const student = await ctx.db.get(submission.studentId);
        return {
          studentId: submission.studentId,
          name: student?.displayName || "Unknown Student",
          submittedAt: submission.submittedAt,
        };
      })
    );

    return studentsWithoutGrades.sort((a, b) => a.submittedAt - b.submittedAt);
  },
});

export const getGradebookSummary = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.object({
    totalAssignments: v.number(),
    totalSubmissions: v.number(),
    submissionsGraded: v.number(),
    submissionsPending: v.number(),
    classAverage: v.union(v.number(), v.null()),
    lastGradedDate: v.union(v.number(), v.null()),
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

    if (cls.teacherId !== user._id && user.role !== "admin") {
      throw new Error("Only the teacher or an admin can view the gradebook summary");
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    const totalAssignments = assignments.length;

    const assignmentIds = assignments.map((a) => a._id);
    let totalSubmissions = 0;
    let submissionsGraded = 0;

    for (const assignmentId of assignmentIds) {
      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
        .collect();
      totalSubmissions += submissions.length;
    }

    const grades = await ctx.db
      .query("grades")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    submissionsGraded = grades.length;
    const submissionsPending = totalSubmissions - submissionsGraded;

    let classAverage: number | null = null;
    if (grades.length > 0) {
      const totalPercentage = grades.reduce((sum, g) => sum + (g.score / g.maxScore), 0);
      classAverage = Math.round((totalPercentage / grades.length) * 100);
    }

    let lastGradedDate: number | null = null;
    if (grades.length > 0) {
      lastGradedDate = Math.max(...grades.map((g) => g.gradedAt));
    }

    return {
      totalAssignments,
      totalSubmissions,
      submissionsGraded,
      submissionsPending,
      classAverage,
      lastGradedDate,
    };
  },
});

export const getStudentGradeHistory = query({
  args: {
    studentId: v.id("users"),
    classId: v.id("classes"),
  },
  returns: v.object({
    grades: v.array(
      v.object({
        assignmentId: v.id("assignments"),
        assignmentTitle: v.string(),
        score: v.number(),
        maxScore: v.number(),
        percentage: v.number(),
        gradedAt: v.number(),
      })
    ),
    studentAverage: v.union(v.number(), v.null()),
    classAverage: v.union(v.number(), v.null()),
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

    const isTeacher = cls.teacherId === user._id;
    const isAdmin = user.role === "admin";
    const isStudent = user._id === args.studentId && user.role === "student";
    const isParent = user.role === "parent";

    if (!isTeacher && !isAdmin && !isStudent) {
      if (isParent) {
        const link = await ctx.db
          .query("parentLinks")
          .withIndex("by_parent_and_student", (q) =>
            q.eq("parentId", user._id).eq("studentId", args.studentId)
          )
          .unique();
        if (!link || !link.consentGiven) {
          throw new Error("Parent is not linked to this child");
        }
      } else {
        throw new Error("Not authorized to view this student's grade history");
      }
    }

    const grades = await ctx.db
      .query("grades")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .filter((q) => q.eq(q.field("classId"), args.classId))
      .collect();

    const gradesWithDetails = await Promise.all(
      grades.map(async (grade) => {
        const assignment = await ctx.db.get(grade.assignmentId);
        return {
          assignmentId: grade.assignmentId,
          assignmentTitle: assignment?.title || "Unknown Assignment",
          score: grade.score,
          maxScore: grade.maxScore,
          percentage: Math.round((grade.score / grade.maxScore) * 100),
          gradedAt: grade.gradedAt,
        };
      })
    );

    gradesWithDetails.sort((a, b) => a.gradedAt - b.gradedAt);

    let studentAverage: number | null = null;
    if (grades.length > 0) {
      const totalPercentage = grades.reduce((sum, g) => sum + (g.score / g.maxScore), 0);
      studentAverage = Math.round((totalPercentage / grades.length) * 100);
    }

    const allClassGrades = await ctx.db
      .query("grades")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    let classAverage: number | null = null;
    if (allClassGrades.length > 0) {
      const totalPercentage = allClassGrades.reduce((sum, g) => sum + (g.score / g.maxScore), 0);
      classAverage = Math.round((totalPercentage / allClassGrades.length) * 100);
    }

    return {
      grades: gradesWithDetails,
      studentAverage,
      classAverage,
    };
  },
});
