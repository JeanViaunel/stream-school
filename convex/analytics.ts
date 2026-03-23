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
