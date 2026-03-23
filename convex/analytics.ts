import { query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

async function requireAdminOrg(ctx: QueryCtx): Promise<Id<"organizations">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
    .unique();
  if (!user || !user.organizationId) {
    throw new Error("User not found");
  }
  if (user.role !== "admin") {
    throw new Error("Only admins can view analytics");
  }
  return user.organizationId;
}

export const getOrgAnalytics = query({
  args: {},
  returns: v.object({
    dauLast7: v.number(),
    sessionsThisMonth: v.number(),
    avgSessionDurationSeconds: v.number(),
    attendanceRatePercent: v.number(),
    dauByDay: v.array(v.object({ day: v.string(), count: v.number() })),
    staleClasses: v.array(
      v.object({
        classId: v.id("classes"),
        name: v.string(),
        daysSinceSession: v.number(),
      })
    ),
    lowAttendanceClasses: v.array(
      v.object({
        classId: v.id("classes"),
        name: v.string(),
        rate: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const orgId = await requireAdminOrg(ctx);
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * dayMs;
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth());
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartTs = monthStart.getTime();

    const orgUsers = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();

    const dauLast7 = orgUsers.filter(
      (u) => u.lastSeenAt !== undefined && u.lastSeenAt >= sevenDaysAgo
    ).length;

    const orgClasses = await ctx.db
      .query("classes")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();

    let sessionsThisMonth = 0;
    let totalDurationMs = 0;
    let endedSessions = 0;

    const dauByDayMap = new Map<string, Set<string>>();

    for (const cls of orgClasses) {
      const classSessions = await ctx.db
        .query("sessions")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect();

      for (const s of classSessions) {
        if (s.startedAt >= monthStartTs) {
          sessionsThisMonth += 1;
        }
        if (s.endedAt && s.startedAt) {
          totalDurationMs += s.endedAt - s.startedAt;
          endedSessions += 1;
        }
      }
    }

    for (const u of orgUsers) {
      if (u.lastSeenAt && u.lastSeenAt >= sevenDaysAgo) {
        const dayKey = new Date(u.lastSeenAt).toISOString().slice(0, 10);
        if (!dauByDayMap.has(dayKey)) {
          dauByDayMap.set(dayKey, new Set());
        }
        dauByDayMap.get(dayKey)!.add(u._id);
      }
    }

    const dauByDay: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const dayKey = d.toISOString().slice(0, 10);
      const count = dauByDayMap.get(dayKey)?.size ?? 0;
      dauByDay.push({ day: dayKey, count });
    }

    const avgSessionDurationSeconds =
      endedSessions > 0 ? Math.round(totalDurationMs / endedSessions / 1000) : 0;

    const staleClasses: { classId: Id<"classes">; name: string; daysSinceSession: number }[] = [];
    const lowAttendanceClasses: { classId: Id<"classes">; name: string; rate: number }[] = [];

    for (const cls of orgClasses) {
      if (cls.isArchived) continue;

      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_class_and_started_at", (q) => q.eq("classId", cls._id))
        .order("desc")
        .take(1);

      const last = sessions[0];
      const daysSinceSession = last
        ? Math.floor((now - last.startedAt) / dayMs)
        : 999;
      if (daysSinceSession > 7) {
        staleClasses.push({
          classId: cls._id,
          name: cls.name,
          daysSinceSession,
        });
      }

      const recentSessions = await ctx.db
        .query("sessions")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect();

      for (const s of recentSessions) {
        const logs = await ctx.db
          .query("sessionLogs")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .collect();

        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_class", (q) => q.eq("classId", cls._id))
          .collect();
        const activeEnroll = enrollments.filter((e) => e.status === "active").length;
        if (activeEnroll === 0) continue;

        const present = new Set(logs.map((l) => l.userId)).size;
        const rate = (present / activeEnroll) * 100;
        if (rate < 60) {
          lowAttendanceClasses.push({
            classId: cls._id,
            name: cls.name,
            rate: Math.round(rate),
          });
          break;
        }
      }
    }

    let attendanceRatePercent = 0;
    let attCount = 0;
    for (const cls of orgClasses) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .take(1);
      if (sessions.length === 0) continue;
      const s = sessions[0];
      const logs = await ctx.db
        .query("sessionLogs")
        .withIndex("by_session", (q) => q.eq("sessionId", s._id))
        .collect();
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect();
      const activeEnroll = enrollments.filter((e) => e.status === "active").length;
      if (activeEnroll === 0) continue;
      const present = new Set(logs.map((l) => l.userId)).size;
      attendanceRatePercent += (present / activeEnroll) * 100;
      attCount += 1;
    }
    if (attCount > 0) {
      attendanceRatePercent = Math.round(attendanceRatePercent / attCount);
    }

    return {
      dauLast7,
      sessionsThisMonth,
      avgSessionDurationSeconds,
      attendanceRatePercent,
      dauByDay,
      staleClasses,
      lowAttendanceClasses,
    };
  },
});

export const getStudentAnalytics = query({
  args: {},
  returns: v.union(
    v.object({
      totalClasses: v.number(),
      totalAssignments: v.number(),
      completedAssignments: v.number(),
      averageGrade: v.optional(v.number()),
      totalSessionsAttended: v.number(),
      totalHoursLearned: v.number(),
      weeklyActivity: v.array(v.object({
        day: v.string(),
        sessions: v.number(),
        assignments: v.number(),
        hours: v.number(),
      })),
      gradeDistribution: v.object({
        excellent: v.number(),
        good: v.number(),
        average: v.number(),
        belowAverage: v.number(),
        failing: v.number(),
      }),
      currentStreak: v.number(),
      longestStreak: v.number(),
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

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const totalClasses = enrollments.length;

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const weeklyActivity = [];
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i * oneDay);
      const dayEnd = dayStart + oneDay;
      const dayName = new Date(dayStart).toLocaleDateString("en-US", { weekday: "short" });
      
      let sessions = 0;
      let hours = 0;
      
      for (const enrollment of enrollments) {
        const classSessions = await ctx.db
          .query("sessions")
          .withIndex("by_class", (q) => q.eq("classId", enrollment.classId))
          .collect();
        
        for (const session of classSessions) {
          if (session.startedAt >= dayStart && session.startedAt < dayEnd) {
            sessions++;
            if (session.endedAt) {
              hours += (session.endedAt - session.startedAt) / (1000 * 60 * 60);
            }
          }
        }
      }
      
      let assignments = 0;
      for (const enrollment of enrollments) {
        const classAssignments = await ctx.db
          .query("assignments")
          .withIndex("by_class", (q) => q.eq("classId", enrollment.classId))
          .filter((q) => q.eq(q.field("isPublished"), true))
          .collect();
        
        for (const assignment of classAssignments) {
          if (assignment.dueDateAt && assignment.dueDateAt >= dayStart && assignment.dueDateAt < dayEnd) {
            assignments++;
          }
        }
      }
      
      weeklyActivity.push({
        day: dayName,
        sessions,
        assignments,
        hours: Math.round(hours * 10) / 10,
      });
    }

    const grades = await ctx.db
      .query("grades")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .collect();

    const gradeDistribution = {
      excellent: 0,
      good: 0,
      average: 0,
      belowAverage: 0,
      failing: 0,
    };

    let totalGrade = 0;
    for (const grade of grades) {
      const percentage = (grade.score / grade.maxScore) * 100;
      totalGrade += percentage;
      
      if (percentage >= 90) gradeDistribution.excellent++;
      else if (percentage >= 80) gradeDistribution.good++;
      else if (percentage >= 70) gradeDistribution.average++;
      else if (percentage >= 60) gradeDistribution.belowAverage++;
      else gradeDistribution.failing++;
    }

    const averageGrade = grades.length > 0 ? totalGrade / grades.length : undefined;
    const completedAssignments = grades.length;

    let totalAssignments = 0;
    for (const enrollment of enrollments) {
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", enrollment.classId))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .collect();
      totalAssignments += assignments.length;
    }

    let totalSessionsAttended = 0;
    let totalHoursLearned = 0;
    for (const enrollment of enrollments) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_class", (q) => q.eq("classId", enrollment.classId))
        .collect();
      totalSessionsAttended += sessions.length;
      
      for (const session of sessions) {
        if (session.endedAt && session.startedAt) {
          totalHoursLearned += (session.endedAt - session.startedAt) / (1000 * 60 * 60);
        }
      }
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (const day of weeklyActivity) {
      if (day.sessions > 0 || day.assignments > 0) {
        tempStreak++;
        currentStreak = tempStreak;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    return {
      totalClasses,
      totalAssignments,
      completedAssignments,
      averageGrade,
      totalSessionsAttended,
      totalHoursLearned: Math.round(totalHoursLearned * 10) / 10,
      weeklyActivity,
      gradeDistribution,
      currentStreak,
      longestStreak,
    };
  },
});

async function requireTeacher(ctx: QueryCtx): Promise<{ userId: Id<"users">; organizationId: Id<"organizations"> | undefined }> {
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
  if (user.role !== "teacher" && user.role !== "admin") {
    throw new Error("Only teachers can view teacher analytics");
  }
  return { userId: user._id, organizationId: user.organizationId };
}

async function requireTeacherForClass(ctx: QueryCtx, classId: Id<"classes">): Promise<void> {
  const cls = await ctx.db.get(classId);
  if (!cls) {
    throw new Error("Class not found");
  }
  const { userId } = await requireTeacher(ctx);
  if (cls.teacherId !== userId) {
    throw new Error("Only the class teacher can view this class analytics");
  }
}

export const getTeacherAnalytics = query({
  args: {},
  returns: v.union(
    v.object({
      classesTaught: v.number(),
      totalSessionsHosted: v.number(),
      totalStudentsReached: v.number(),
      totalTeachingHours: v.number(),
      averageSessionDuration: v.number(),
      weeklyActivity: v.array(v.object({
        day: v.string(),
        sessionsHosted: v.number(),
        hoursTaught: v.number(),
      })),
      classPerformance: v.array(v.object({
        classId: v.id("classes"),
        className: v.string(),
        averageAttendanceRate: v.number(),
        averageGrade: v.number(),
      })),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const { userId } = await requireTeacher(ctx);
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * dayMs;

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", userId))
      .collect();

    const activeClasses = classes.filter((c) => !c.isArchived);
    const classesTaught = activeClasses.length;

    let totalSessionsHosted = 0;
    let totalTeachingHours = 0;
    let sessionsWithDuration = 0;
    let totalDurationMs = 0;

    const uniqueStudents = new Set<Id<"users">>();

    const weeklyActivityMap = new Map<string, { sessionsHosted: number; hoursTaught: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const dayKey = d.toISOString().slice(0, 10);
      weeklyActivityMap.set(dayKey, { sessionsHosted: 0, hoursTaught: 0 });
    }

    const classPerformance: {
      classId: Id<"classes">;
      className: string;
      averageAttendanceRate: number;
      averageGrade: number;
    }[] = [];

    for (const cls of activeClasses) {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect();
      
      const activeEnrollments = enrollments.filter((e) => e.status === "active");
      activeEnrollments.forEach((e) => uniqueStudents.add(e.studentId));

      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect();

      totalSessionsHosted += sessions.length;

      for (const session of sessions) {
        if (session.endedAt && session.startedAt) {
          const durationMs = session.endedAt - session.startedAt;
          totalDurationMs += durationMs;
          sessionsWithDuration++;
          totalTeachingHours += durationMs / (1000 * 60 * 60);
        }

        if (session.startedAt >= sevenDaysAgo) {
          const dayKey = new Date(session.startedAt).toISOString().slice(0, 10);
          const activity = weeklyActivityMap.get(dayKey);
          if (activity) {
            activity.sessionsHosted++;
            if (session.endedAt && session.startedAt) {
              activity.hoursTaught += (session.endedAt - session.startedAt) / (1000 * 60 * 60);
            }
          }
        }
      }

      let totalAttendanceRate = 0;
      let attendanceCount = 0;
      
      for (const session of sessions.slice(-5)) {
        const logs = await ctx.db
          .query("sessionLogs")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();
        
        const presentCount = new Set(logs.map((l) => l.userId)).size;
        if (activeEnrollments.length > 0) {
          totalAttendanceRate += (presentCount / activeEnrollments.length) * 100;
          attendanceCount++;
        }
      }

      const grades = await ctx.db
        .query("grades")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect();

      let totalGradePercentage = 0;
      for (const grade of grades) {
        totalGradePercentage += (grade.score / grade.maxScore) * 100;
      }

      classPerformance.push({
        classId: cls._id,
        className: cls.name,
        averageAttendanceRate: attendanceCount > 0 ? Math.round(totalAttendanceRate / attendanceCount) : 0,
        averageGrade: grades.length > 0 ? Math.round(totalGradePercentage / grades.length) : 0,
      });
    }

    const weeklyActivity: { day: string; sessionsHosted: number; hoursTaught: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const dayKey = d.toISOString().slice(0, 10);
      const activity = weeklyActivityMap.get(dayKey) || { sessionsHosted: 0, hoursTaught: 0 };
      weeklyActivity.push({
        day: dayKey,
        sessionsHosted: activity.sessionsHosted,
        hoursTaught: Math.round(activity.hoursTaught * 10) / 10,
      });
    }

    return {
      classesTaught,
      totalSessionsHosted,
      totalStudentsReached: uniqueStudents.size,
      totalTeachingHours: Math.round(totalTeachingHours * 10) / 10,
      averageSessionDuration: sessionsWithDuration > 0 ? Math.round(totalDurationMs / sessionsWithDuration / 1000 / 60) : 0,
      weeklyActivity,
      classPerformance,
    };
  },
});

export const getClassPerformance = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.union(
    v.object({
      averageAttendanceRate: v.number(),
      averageGrade: v.number(),
      assignmentCompletionRate: v.number(),
      studentEngagementScore: v.number(),
      recentTrends: v.object({
        weeklyAttendance: v.array(v.object({
          week: v.string(),
          rate: v.number(),
        })),
        weeklyGrades: v.array(v.object({
          week: v.string(),
          average: v.number(),
        })),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireTeacherForClass(ctx, args.classId);
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const fourWeeksAgo = now - 4 * weekMs;

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    const activeEnrollments = enrollments.filter((e) => e.status === "active");
    const totalStudents = activeEnrollments.length;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    let totalAttendanceRate = 0;
    let attendanceCount = 0;
    
    const weeklyAttendanceMap = new Map<string, { present: number; total: number }>();
    for (let i = 3; i >= 0; i--) {
      const weekStart = now - i * weekMs;
      const weekKey = new Date(weekStart).toISOString().slice(0, 10);
      weeklyAttendanceMap.set(weekKey, { present: 0, total: 0 });
    }

    for (const session of sessions) {
      const logs = await ctx.db
        .query("sessionLogs")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      
      const presentCount = new Set(logs.map((l) => l.userId)).size;
      
      if (totalStudents > 0) {
        totalAttendanceRate += (presentCount / totalStudents) * 100;
        attendanceCount++;
      }

      if (session.startedAt >= fourWeeksAgo) {
        const weekKey = new Date(session.startedAt).toISOString().slice(0, 10);
        const weekData = weeklyAttendanceMap.get(weekKey);
        if (weekData) {
          weekData.present += presentCount;
          weekData.total += totalStudents;
        }
      }
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    let totalSubmissions = 0;
    let totalAssignmentsPublished = 0;

    for (const assignment of assignments) {
      if (assignment.isPublished) {
        totalAssignmentsPublished++;
        const submissions = await ctx.db
          .query("submissions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
          .collect();
        totalSubmissions += submissions.length;
      }
    }

    const assignmentCompletionRate = totalStudents > 0 && totalAssignmentsPublished > 0
      ? (totalSubmissions / (totalStudents * totalAssignmentsPublished)) * 100
      : 0;

    const grades = await ctx.db
      .query("grades")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    let totalGradePercentage = 0;
    const weeklyGradesMap = new Map<string, { total: number; count: number }>();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = now - i * weekMs;
      const weekKey = new Date(weekStart).toISOString().slice(0, 10);
      weeklyGradesMap.set(weekKey, { total: 0, count: 0 });
    }

    for (const grade of grades) {
      const percentage = (grade.score / grade.maxScore) * 100;
      totalGradePercentage += percentage;

      if (grade.gradedAt >= fourWeeksAgo) {
        const weekKey = new Date(grade.gradedAt).toISOString().slice(0, 10);
        const weekData = weeklyGradesMap.get(weekKey);
        if (weekData) {
          weekData.total += percentage;
          weekData.count++;
        }
      }
    }

    const averageGrade = grades.length > 0 ? totalGradePercentage / grades.length : 0;
    const averageAttendanceRate = attendanceCount > 0 ? totalAttendanceRate / attendanceCount : 0;

    const weeklyAttendance: { week: string; rate: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = now - i * weekMs;
      const weekKey = new Date(weekStart).toISOString().slice(0, 10);
      const weekData = weeklyAttendanceMap.get(weekKey);
      const rate = weekData && weekData.total > 0 ? (weekData.present / weekData.total) * 100 : 0;
      weeklyAttendance.push({ week: weekKey, rate: Math.round(rate) });
    }

    const weeklyGrades: { week: string; average: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = now - i * weekMs;
      const weekKey = new Date(weekStart).toISOString().slice(0, 10);
      const weekData = weeklyGradesMap.get(weekKey);
      const avg = weekData && weekData.count > 0 ? weekData.total / weekData.count : 0;
      weeklyGrades.push({ week: weekKey, average: Math.round(avg) });
    }

    const studentEngagementScore = (averageAttendanceRate * 0.5) + (assignmentCompletionRate * 0.5);

    return {
      averageAttendanceRate: Math.round(averageAttendanceRate),
      averageGrade: Math.round(averageGrade),
      assignmentCompletionRate: Math.round(assignmentCompletionRate),
      studentEngagementScore: Math.round(studentEngagementScore),
      recentTrends: {
        weeklyAttendance,
        weeklyGrades,
      },
    };
  },
});

export const getStudentEngagement = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.union(
    v.array(v.object({
      studentId: v.id("users"),
      name: v.string(),
      attendanceRate: v.number(),
      assignmentCompletionRate: v.number(),
      averageGrade: v.number(),
      lastActive: v.optional(v.number()),
      engagementLevel: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    })),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireTeacherForClass(ctx, args.classId);

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    const activeEnrollments = enrollments.filter((e) => e.status === "active");

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    const publishedAssignments = assignments.filter((a) => a.isPublished);
    const totalAssignments = publishedAssignments.length;

    const studentEngagement: {
      studentId: Id<"users">;
      name: string;
      attendanceRate: number;
      assignmentCompletionRate: number;
      averageGrade: number;
      lastActive?: number;
      engagementLevel: "high" | "medium" | "low";
    }[] = [];

    for (const enrollment of activeEnrollments) {
      const student = await ctx.db.get(enrollment.studentId);
      if (!student) continue;

      let sessionsAttended = 0;
      let lastActive: number | undefined;

      for (const session of sessions) {
        const logs = await ctx.db
          .query("sessionLogs")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();
        
        const attended = logs.some((l) => l.userId === enrollment.studentId);
        if (attended) {
          sessionsAttended++;
          if (session.startedAt > (lastActive || 0)) {
            lastActive = session.startedAt;
          }
        }
      }

      const attendanceRate = sessions.length > 0 ? (sessionsAttended / sessions.length) * 100 : 0;

      let assignmentsCompleted = 0;
      let totalGradePercentage = 0;
      let gradedAssignments = 0;

      for (const assignment of publishedAssignments) {
        const submission = await ctx.db
          .query("submissions")
          .withIndex("by_assignment_and_student", (q) => 
            q.eq("assignmentId", assignment._id).eq("studentId", enrollment.studentId)
          )
          .unique();
        
        if (submission) {
          assignmentsCompleted++;
          
          const grade = await ctx.db
            .query("grades")
            .withIndex("by_assignment_and_student", (q) => 
              q.eq("assignmentId", assignment._id).eq("studentId", enrollment.studentId)
            )
            .unique();
          
          if (grade) {
            totalGradePercentage += (grade.score / grade.maxScore) * 100;
            gradedAssignments++;
          }
        }
      }

      const assignmentCompletionRate = totalAssignments > 0 ? (assignmentsCompleted / totalAssignments) * 100 : 0;
      const averageGrade = gradedAssignments > 0 ? totalGradePercentage / gradedAssignments : 0;

      let engagementLevel: "high" | "medium" | "low" = "low";
      const engagementScore = (attendanceRate * 0.4) + (assignmentCompletionRate * 0.4) + (averageGrade * 0.2);
      
      if (engagementScore >= 75) {
        engagementLevel = "high";
      } else if (engagementScore >= 50) {
        engagementLevel = "medium";
      }

      studentEngagement.push({
        studentId: enrollment.studentId,
        name: student.displayName,
        attendanceRate: Math.round(attendanceRate),
        assignmentCompletionRate: Math.round(assignmentCompletionRate),
        averageGrade: Math.round(averageGrade),
        lastActive,
        engagementLevel,
      });
    }

    return studentEngagement;
  },
});

// Assignment Statistics & Analytics

export const getAssignmentStats = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.object({
    totalStudents: v.number(),
    submittedCount: v.number(),
    submissionRate: v.number(),
    lateSubmissions: v.number(),
    averageScore: v.optional(v.number()),
    medianScore: v.optional(v.number()),
    standardDeviation: v.optional(v.number()),
    minScore: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    scoreDistribution: v.object({
      A: v.number(),
      B: v.number(),
      C: v.number(),
      D: v.number(),
      F: v.number(),
    }),
    gradeRanges: v.array(v.object({
      range: v.string(),
      count: v.number(),
      percentage: v.number(),
    })),
    questionAnalysis: v.array(v.object({
      questionId: v.string(),
      questionText: v.string(),
      totalResponses: v.number(),
      correctCount: v.number(),
      correctPercentage: v.number(),
      difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    })),
    submissionTimeline: v.array(v.object({
      date: v.string(),
      count: v.number(),
    })),
    studentDetails: v.array(v.object({
      studentId: v.id("users"),
      name: v.string(),
      submittedAt: v.optional(v.number()),
      isLate: v.boolean(),
      score: v.optional(v.number()),
      maxScore: v.number(),
      grade: v.optional(v.string()),
      status: v.union(v.literal("not_submitted"), v.literal("submitted"), v.literal("graded")),
    })),
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

    if (cls.teacherId !== user._id && assignment.creatorId !== user._id && user.role !== "admin") {
      throw new Error("Only the teacher can view assignment stats");
    }

    // Get all enrolled students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", assignment.classId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const totalStudents = enrollments.length;

    // Get all submissions
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const submittedCount = submissions.length;
    const submissionRate = totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0;

    // Count late submissions
    let lateSubmissions = 0;
    if (assignment.dueDateAt) {
      for (const submission of submissions) {
        if (submission.submittedAt > assignment.dueDateAt) {
          lateSubmissions++;
        }
      }
    }

    // Get all grades for this assignment
    const grades = await ctx.db
      .query("grades")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    // Calculate score statistics
    let averageScore: number | undefined;
    let medianScore: number | undefined;
    let standardDeviation: number | undefined;
    let minScore: number | undefined;
    let maxScore: number | undefined;

    if (grades.length > 0) {
      const percentages = grades.map((g) => (g.score / g.maxScore) * 100);
      
      // Average
      averageScore = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
      
      // Median
      const sortedPercentages = [...percentages].sort((a, b) => a - b);
      const mid = Math.floor(sortedPercentages.length / 2);
      medianScore = sortedPercentages.length % 2 === 0
        ? (sortedPercentages[mid - 1] + sortedPercentages[mid]) / 2
        : sortedPercentages[mid];
      
      // Standard deviation
      const mean = averageScore;
      const squaredDiffs = percentages.map((p) => Math.pow(p - mean, 2));
      standardDeviation = Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / percentages.length);
      
      // Min and max
      minScore = Math.min(...percentages);
      maxScore = Math.max(...percentages);
    }

    // Grade distribution (A-F)
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    if (grades.length > 0) {
      grades.forEach((grade) => {
        const percentage = (grade.score / grade.maxScore) * 100;
        if (percentage >= 90) distribution.A++;
        else if (percentage >= 80) distribution.B++;
        else if (percentage >= 70) distribution.C++;
        else if (percentage >= 60) distribution.D++;
        else distribution.F++;
      });
    }

    // Grade ranges for histogram
    const ranges = [
      { range: "90-100", min: 90, max: 100 },
      { range: "80-89", min: 80, max: 89 },
      { range: "70-79", min: 70, max: 79 },
      { range: "60-69", min: 60, max: 69 },
      { range: "Below 60", min: 0, max: 59 },
    ];

    const gradeRanges = ranges.map((r) => {
      const count = grades.filter((g) => {
        const percentage = (g.score / g.maxScore) * 100;
        return percentage >= r.min && percentage <= r.max;
      }).length;
      const percentage = grades.length > 0 ? (count / grades.length) * 100 : 0;
      return { range: r.range, count, percentage: Math.round(percentage) };
    });

    // Question analysis (for multiple choice)
    const questionAnalysis: {
      questionId: string;
      questionText: string;
      totalResponses: number;
      correctCount: number;
      correctPercentage: number;
      difficulty: "easy" | "medium" | "hard";
    }[] = [];

    if (assignment.type === "multiple_choice") {
      for (const question of assignment.questions) {
        let correctCount = 0;
        let totalResponses = 0;

        for (const submission of submissions) {
          const answer = submission.answers.find((a) => a.questionId === question.id);
          if (answer) {
            totalResponses++;
            if (question.correctOption !== undefined && parseInt(answer.value) === question.correctOption) {
              correctCount++;
            }
          }
        }

        const correctPercentage = totalResponses > 0 ? (correctCount / totalResponses) * 100 : 0;
        
        let difficulty: "easy" | "medium" | "hard" = "medium";
        if (correctPercentage >= 80) difficulty = "easy";
        else if (correctPercentage <= 40) difficulty = "hard";

        questionAnalysis.push({
          questionId: question.id,
          questionText: question.text.slice(0, 100) + (question.text.length > 100 ? "..." : ""),
          totalResponses,
          correctCount,
          correctPercentage: Math.round(correctPercentage),
          difficulty,
        });
      }
    }

    // Submission timeline
    const timelineMap = new Map<string, number>();
    for (const submission of submissions) {
      const date = new Date(submission.submittedAt).toISOString().split("T")[0];
      timelineMap.set(date, (timelineMap.get(date) || 0) + 1);
    }

    const submissionTimeline = Array.from(timelineMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Student details
    const studentDetails: {
      studentId: Id<"users">;
      name: string;
      submittedAt?: number;
      isLate: boolean;
      score?: number;
      maxScore: number;
      grade?: string;
      status: "not_submitted" | "submitted" | "graded";
    }[] = [];

    for (const enrollment of enrollments) {
      const student = await ctx.db.get(enrollment.studentId);
      if (!student) continue;

      const submission = submissions.find((s) => s.studentId === enrollment.studentId);
      const grade = grades.find((g) => g.studentId === enrollment.studentId);

      let status: "not_submitted" | "submitted" | "graded" = "not_submitted";
      let isLate = false;
      let score: number | undefined;
      let gradeLetter: string | undefined;

      if (grade) {
        status = "graded";
        score = grade.score;
        const percentage = (grade.score / grade.maxScore) * 100;
        if (percentage >= 90) gradeLetter = "A";
        else if (percentage >= 80) gradeLetter = "B";
        else if (percentage >= 70) gradeLetter = "C";
        else if (percentage >= 60) gradeLetter = "D";
        else gradeLetter = "F";
      } else if (submission) {
        status = "submitted";
        if (assignment.dueDateAt) {
          isLate = submission.submittedAt > assignment.dueDateAt;
        }
      }

      studentDetails.push({
        studentId: enrollment.studentId,
        name: student.displayName,
        submittedAt: submission?.submittedAt,
        isLate,
        score,
        maxScore: 100,
        grade: gradeLetter,
        status,
      });
    }

    return {
      totalStudents,
      submittedCount,
      submissionRate,
      lateSubmissions,
      averageScore,
      medianScore,
      standardDeviation,
      minScore,
      maxScore,
      scoreDistribution: distribution,
      gradeRanges,
      questionAnalysis,
      submissionTimeline,
      studentDetails,
    };
  },
});

export const getStudentPerformance = query({
  args: {
    studentId: v.id("users"),
    classId: v.id("classes"),
  },
  returns: v.object({
    studentInfo: v.object({
      studentId: v.id("users"),
      name: v.string(),
      username: v.string(),
    }),
    overallStats: v.object({
      totalAssignments: v.number(),
      submittedCount: v.number(),
      submissionRate: v.number(),
      averageGrade: v.optional(v.number()),
      gradeTrend: v.union(v.literal("improving"), v.literal("declining"), v.literal("stable")),
      classRank: v.optional(v.number()),
    }),
    assignmentDetails: v.array(v.object({
      assignmentId: v.id("assignments"),
      title: v.string(),
      dueDateAt: v.optional(v.number()),
      submittedAt: v.optional(v.number()),
      isLate: v.boolean(),
      status: v.union(v.literal("not_submitted"), v.literal("submitted"), v.literal("graded")),
      score: v.optional(v.number()),
      maxScore: v.number(),
      percentage: v.optional(v.number()),
      grade: v.optional(v.string()),
      classAverage: v.optional(v.number()),
    })),
    performanceOverTime: v.array(v.object({
      date: v.string(),
      average: v.number(),
    })),
    strengths: v.array(v.string()),
    areasForImprovement: v.array(v.string()),
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

    // Check authorization
    const isTeacher = cls.teacherId === user._id;
    const isAdmin = user.role === "admin";
    const isStudent = user._id === args.studentId;
    
    if (!isTeacher && !isAdmin && !isStudent) {
      // Check if parent
      if (user.role === "parent") {
        const link = await ctx.db
          .query("parentLinks")
          .withIndex("by_parent_and_student", (q) =>
            q.eq("parentId", user._id).eq("studentId", args.studentId)
          )
          .unique();
        if (!link || !link.consentGiven) {
          throw new Error("Not authorized to view this student's performance");
        }
      } else {
        throw new Error("Not authorized to view this student's performance");
      }
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    // Get all published assignments
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    const totalAssignments = assignments.length;

    // Get student's submissions and grades
    const assignmentDetails: {
      assignmentId: Id<"assignments">;
      title: string;
      dueDateAt?: number;
      submittedAt?: number;
      isLate: boolean;
      status: "not_submitted" | "submitted" | "graded";
      score?: number;
      maxScore: number;
      percentage?: number;
      grade?: string;
      classAverage?: number;
    }[] = [];

    let submittedCount = 0;
    let gradedCount = 0;
    let totalGradePercentage = 0;

    for (const assignment of assignments) {
      const submission = await ctx.db
        .query("submissions")
        .withIndex("by_assignment_and_student", (q) =>
          q.eq("assignmentId", assignment._id).eq("studentId", args.studentId)
        )
        .unique();

      const grade = await ctx.db
        .query("grades")
        .withIndex("by_assignment_and_student", (q) =>
          q.eq("assignmentId", assignment._id).eq("studentId", args.studentId)
        )
        .unique();

      // Get class average for this assignment
      const allGrades = await ctx.db
        .query("grades")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
        .collect();

      let classAverage: number | undefined;
      if (allGrades.length > 0) {
        const totalPercentage = allGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0);
        classAverage = totalPercentage / allGrades.length;
      }

      let status: "not_submitted" | "submitted" | "graded" = "not_submitted";
      let isLate = false;
      let score: number | undefined;
      let percentage: number | undefined;
      let gradeLetter: string | undefined;

      if (grade) {
        status = "graded";
        score = grade.score;
        percentage = Math.round((grade.score / grade.maxScore) * 100);
        gradedCount++;
        totalGradePercentage += percentage;
        
        if (percentage >= 90) gradeLetter = "A";
        else if (percentage >= 80) gradeLetter = "B";
        else if (percentage >= 70) gradeLetter = "C";
        else if (percentage >= 60) gradeLetter = "D";
        else gradeLetter = "F";
      } else if (submission) {
        status = "submitted";
        submittedCount++;
        if (assignment.dueDateAt) {
          isLate = submission.submittedAt > assignment.dueDateAt;
        }
      }

      assignmentDetails.push({
        assignmentId: assignment._id,
        title: assignment.title,
        dueDateAt: assignment.dueDateAt,
        submittedAt: submission?.submittedAt,
        isLate,
        status,
        score,
        maxScore: grade?.maxScore || 100,
        percentage,
        grade: gradeLetter,
        classAverage,
      });
    }

    const submissionRate = totalAssignments > 0 ? (submittedCount + gradedCount) / totalAssignments * 100 : 0;
    const averageGrade = gradedCount > 0 ? totalGradePercentage / gradedCount : undefined;

    // Calculate grade trend
    let gradeTrend: "improving" | "declining" | "stable" = "stable";
    const gradedAssignments = assignmentDetails.filter((a) => a.status === "graded");
    if (gradedAssignments.length >= 3) {
      const firstHalf = gradedAssignments.slice(0, Math.floor(gradedAssignments.length / 2));
      const secondHalf = gradedAssignments.slice(Math.floor(gradedAssignments.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, a) => sum + (a.percentage || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, a) => sum + (a.percentage || 0), 0) / secondHalf.length;
      
      const diff = secondAvg - firstAvg;
      if (diff > 5) gradeTrend = "improving";
      else if (diff < -5) gradeTrend = "declining";
    }

    // Performance over time
    const performanceOverTime: { date: string; average: number }[] = [];
    const monthlyGrades = new Map<string, number[]>();
    
    for (const detail of assignmentDetails) {
      if (detail.percentage && detail.submittedAt) {
        const month = new Date(detail.submittedAt).toISOString().slice(0, 7);
        const existing = monthlyGrades.get(month) || [];
        existing.push(detail.percentage);
        monthlyGrades.set(month, existing);
      }
    }

    Array.from(monthlyGrades.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([month, percentages]) => {
        const avg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
        performanceOverTime.push({ date: month, average: Math.round(avg) });
      });

    // Determine strengths and areas for improvement
    const strengths: string[] = [];
    const areasForImprovement: string[] = [];

    if (averageGrade !== undefined) {
      if (averageGrade >= 90) strengths.push("Consistently excellent work");
      else if (averageGrade >= 80) strengths.push("Strong overall performance");
      
      if (averageGrade < 70) areasForImprovement.push("Focus on improving overall grade average");
      if (submissionRate < 80) areasForImprovement.push("Improve assignment submission rate");
    }

    const lateCount = assignmentDetails.filter((a) => a.isLate).length;
    if (lateCount > 0) areasForImprovement.push("Submit assignments on time");

    return {
      studentInfo: {
        studentId: student._id,
        name: student.displayName,
        username: student.username,
      },
      overallStats: {
        totalAssignments,
        submittedCount: submittedCount + gradedCount,
        submissionRate: Math.round(submissionRate),
        averageGrade: averageGrade ? Math.round(averageGrade) : undefined,
        gradeTrend,
        classRank: undefined, // Would need to calculate for all students
      },
      assignmentDetails,
      performanceOverTime,
      strengths,
      areasForImprovement,
    };
  },
});
