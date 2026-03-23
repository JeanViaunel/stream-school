import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

export const getMyClassesOverview = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("classes"),
      name: v.string(),
      subject: v.string(),
      gradeLevel: v.number(),
      studentCount: v.number(),
      lastSessionDate: v.union(v.number(), v.null()),
      upcomingSessionsCount: v.number(),
    })
  ),
  handler: async (ctx) => {
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

    if (user.role !== "teacher") {
      throw new Error("Only teachers can view class overview");
    }

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

    const classesOverview = await Promise.all(
      classes.map(async (cls) => {
        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_class", (q) => q.eq("classId", cls._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        const studentCount = enrollments.length;

        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_class_and_started_at", (q) => q.eq("classId", cls._id))
          .order("desc")
          .take(1);

        const lastSessionDate = sessions.length > 0 ? sessions[0].startedAt : null;

        const scheduledSessions = await ctx.db
          .query("scheduledSessions")
          .withIndex("by_class_and_scheduled_at", (q) => q.eq("classId", cls._id))
          .filter((q) => q.gt(q.field("scheduledAt"), now))
          .filter((q) => q.lt(q.field("scheduledAt"), sevenDaysFromNow))
          .filter((q) => q.eq(q.field("isArchived"), false))
          .collect();

        return {
          _id: cls._id,
          name: cls.name,
          subject: cls.subject,
          gradeLevel: cls.gradeLevel,
          studentCount,
          lastSessionDate,
          upcomingSessionsCount: scheduledSessions.length,
        };
      })
    );

    return classesOverview;
  },
});

export const getPendingSubmissions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("submissions"),
      studentName: v.string(),
      assignmentTitle: v.string(),
      submittedAt: v.number(),
      className: v.string(),
    })
  ),
  handler: async (ctx) => {
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

    if (user.role !== "teacher") {
      throw new Error("Only teachers can view pending submissions");
    }

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .collect();

    const pendingSubmissions: {
      _id: Id<"submissions">;
      studentName: string;
      assignmentTitle: string;
      submittedAt: number;
      className: string;
    }[] = [];

    for (const cls of classes) {
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect();

      for (const assignment of assignments) {
        const submissions = await ctx.db
          .query("submissions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
          .collect();

        for (const submission of submissions) {
          const existingGrade = await ctx.db
            .query("grades")
            .withIndex("by_assignment_and_student", (q) =>
              q.eq("assignmentId", assignment._id).eq("studentId", submission.studentId)
            )
            .unique();

          if (!existingGrade) {
            const student = await ctx.db.get(submission.studentId);
            if (student) {
              pendingSubmissions.push({
                _id: submission._id,
                studentName: student.displayName,
                assignmentTitle: assignment.title,
                submittedAt: submission.submittedAt,
                className: cls.name,
              });
            }
          }
        }
      }
    }

    pendingSubmissions.sort((a, b) => a.submittedAt - b.submittedAt);

    return pendingSubmissions;
  },
});

export const getRecentActivity = query({
  args: {},
  returns: v.array(
    v.object({
      type: v.union(
        v.literal("submission"),
        v.literal("attendance"),
        v.literal("enrollment")
      ),
      timestamp: v.number(),
      classId: v.id("classes"),
      className: v.string(),
      details: v.string(),
    })
  ),
  handler: async (ctx) => {
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

    if (user.role !== "teacher") {
      throw new Error("Only teachers can view recent activity");
    }

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .collect();

    const classMap = new Map(classes.map((c) => [c._id, c]));
    const classIds = classes.map((c) => c._id);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const activities: {
      type: "submission" | "attendance" | "enrollment";
      timestamp: number;
      classId: Id<"classes">;
      className: string;
      details: string;
    }[] = [];

    for (const classId of classIds) {
      const cls = classMap.get(classId)!;

      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", classId))
        .collect();

      for (const assignment of assignments) {
        const submissions = await ctx.db
          .query("submissions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
          .collect();

        for (const submission of submissions) {
          if (submission.submittedAt >= sevenDaysAgo) {
            const student = await ctx.db.get(submission.studentId);
            if (student) {
              activities.push({
                type: "submission",
                timestamp: submission.submittedAt,
                classId,
                className: cls.name,
                details: `${student.displayName} submitted "${assignment.title}"`,
              });
            }
          }
        }
      }

      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_class", (q) => q.eq("classId", classId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      for (const enrollment of enrollments) {
        if (enrollment.enrolledAt >= sevenDaysAgo) {
          const student = await ctx.db.get(enrollment.studentId);
          if (student) {
            activities.push({
              type: "enrollment",
              timestamp: enrollment.enrolledAt,
              classId,
              className: cls.name,
              details: `${student.displayName} enrolled`,
            });
          }
        }
      }

      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_class_and_started_at", (q) => q.eq("classId", classId))
        .collect();

      for (const session of sessions) {
        if (session.startedAt >= sevenDaysAgo) {
          const logs = await ctx.db
            .query("sessionLogs")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .collect();

          const attendanceCount = logs.filter((log) => log.joinedAt >= sevenDaysAgo).length;

          if (attendanceCount > 0) {
            activities.push({
              type: "attendance",
              timestamp: session.startedAt,
              classId,
              className: cls.name,
              details: `${attendanceCount} students attended session`,
            });
          }
        }
      }
    }

    activities.sort((a, b) => b.timestamp - a.timestamp);

    return activities.slice(0, 20);
  },
});

export const getStudentsNeedingAttention = query({
  args: {},
  returns: v.array(
    v.object({
      studentId: v.id("users"),
      studentName: v.string(),
      classId: v.id("classes"),
      className: v.string(),
      issues: v.array(v.string()),
      attendanceRate: v.number(),
      assignmentCompletionRate: v.number(),
      averageGrade: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx) => {
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

    if (user.role !== "teacher") {
      throw new Error("Only teachers can view students needing attention");
    }

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .collect();

    const studentsNeedingAttention: {
      studentId: Id<"users">;
      studentName: string;
      classId: Id<"classes">;
      className: string;
      issues: string[];
      attendanceRate: number;
      assignmentCompletionRate: number;
      averageGrade: number | null;
    }[] = [];

    for (const cls of classes) {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      for (const enrollment of enrollments) {
        const student = await ctx.db.get(enrollment.studentId);
        if (!student) continue;

        const issues: string[] = [];

        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_class", (q) => q.eq("classId", cls._id))
          .collect();

        let attendedSessions = 0;
        for (const session of sessions) {
          const logs = await ctx.db
            .query("sessionLogs")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .filter((q) => q.eq(q.field("userId"), enrollment.studentId))
            .collect();

          if (logs.length > 0) {
            attendedSessions++;
          }
        }

        const attendanceRate = sessions.length > 0 ? attendedSessions / sessions.length : 1;

        if (attendanceRate < 0.6) {
          issues.push("Low attendance");
        }

        const assignments = await ctx.db
          .query("assignments")
          .withIndex("by_class", (q) => q.eq("classId", cls._id))
          .filter((q) => q.eq(q.field("isPublished"), true))
          .collect();

        let submittedCount = 0;
        for (const assignment of assignments) {
          const submission = await ctx.db
            .query("submissions")
            .withIndex("by_assignment_and_student", (q) =>
              q.eq("assignmentId", assignment._id).eq("studentId", enrollment.studentId)
            )
            .unique();

          if (submission) {
            submittedCount++;
          }
        }

        const assignmentCompletionRate = assignments.length > 0 ? submittedCount / assignments.length : 1;

        if (assignmentCompletionRate < 0.5) {
          issues.push("Missing assignments");
        }

        const grades = await ctx.db
          .query("grades")
          .withIndex("by_student", (q) => q.eq("studentId", enrollment.studentId))
          .filter((q) => q.eq(q.field("classId"), cls._id))
          .collect();

        let averageGrade: number | null = null;
        if (grades.length > 0) {
          const totalPercentage = grades.reduce((sum, g) => sum + (g.score / g.maxScore), 0);
          averageGrade = Math.round((totalPercentage / grades.length) * 100);
        }

        if (averageGrade !== null && averageGrade < 60) {
          issues.push("Failing grades");
        }

        if (issues.length > 0) {
          studentsNeedingAttention.push({
            studentId: enrollment.studentId,
            studentName: student.displayName,
            classId: cls._id,
            className: cls.name,
            issues,
            attendanceRate: Math.round(attendanceRate * 100),
            assignmentCompletionRate: Math.round(assignmentCompletionRate * 100),
            averageGrade,
          });
        }
      }
    }

    return studentsNeedingAttention;
  },
});

export const getClassComparison = query({
  args: {},
  returns: v.array(
    v.object({
      classId: v.id("classes"),
      className: v.string(),
      subject: v.string(),
      gradeLevel: v.number(),
      studentCount: v.number(),
      averageAttendance: v.number(),
      averageGrade: v.union(v.number(), v.null()),
      assignmentCompletionRate: v.number(),
    })
  ),
  handler: async (ctx) => {
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

    if (user.role !== "teacher") {
      throw new Error("Only teachers can view class comparison");
    }

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .collect();

    const classComparisons = await Promise.all(
      classes.map(async (cls) => {
        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_class", (q) => q.eq("classId", cls._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        const studentCount = enrollments.length;

        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_class", (q) => q.eq("classId", cls._id))
          .collect();

        let totalAttendanceRate = 0;
        for (const enrollment of enrollments) {
          let attendedCount = 0;
          for (const session of sessions) {
            const logs = await ctx.db
              .query("sessionLogs")
              .withIndex("by_session", (q) => q.eq("sessionId", session._id))
              .filter((q) => q.eq(q.field("userId"), enrollment.studentId))
              .collect();

            if (logs.length > 0) {
              attendedCount++;
            }
          }
          const attendanceRate = sessions.length > 0 ? attendedCount / sessions.length : 1;
          totalAttendanceRate += attendanceRate;
        }

        const averageAttendance = studentCount > 0
          ? Math.round((totalAttendanceRate / studentCount) * 100)
          : 0;

        const assignments = await ctx.db
          .query("assignments")
          .withIndex("by_class", (q) => q.eq("classId", cls._id))
          .filter((q) => q.eq(q.field("isPublished"), true))
          .collect();

        let totalCompletionRate = 0;
        let totalGradePercentage = 0;
        let gradedStudentCount = 0;

        for (const enrollment of enrollments) {
          let submittedCount = 0;
          const studentGrades: number[] = [];

          for (const assignment of assignments) {
            const submission = await ctx.db
              .query("submissions")
              .withIndex("by_assignment_and_student", (q) =>
                q.eq("assignmentId", assignment._id).eq("studentId", enrollment.studentId)
              )
              .unique();

            if (submission) {
              submittedCount++;
            }

            const grade = await ctx.db
              .query("grades")
              .withIndex("by_assignment_and_student", (q) =>
                q.eq("assignmentId", assignment._id).eq("studentId", enrollment.studentId)
              )
              .unique();

            if (grade) {
              studentGrades.push(grade.score / grade.maxScore);
            }
          }

          const completionRate = assignments.length > 0 ? submittedCount / assignments.length : 1;
          totalCompletionRate += completionRate;

          if (studentGrades.length > 0) {
            const studentAverage = studentGrades.reduce((sum, g) => sum + g, 0) / studentGrades.length;
            totalGradePercentage += studentAverage;
            gradedStudentCount++;
          }
        }

        const assignmentCompletionRate = studentCount > 0
          ? Math.round((totalCompletionRate / studentCount) * 100)
          : 0;

        const averageGrade = gradedStudentCount > 0
          ? Math.round((totalGradePercentage / gradedStudentCount) * 100)
          : null;

        return {
          classId: cls._id,
          className: cls.name,
          subject: cls.subject,
          gradeLevel: cls.gradeLevel,
          studentCount,
          averageAttendance,
          averageGrade,
          assignmentCompletionRate,
        };
      })
    );

    return classComparisons;
  },
});
