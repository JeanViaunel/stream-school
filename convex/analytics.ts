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
  if (user.role !== "school_admin" && user.role !== "platform_admin") {
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
