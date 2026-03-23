import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const enrollmentsForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      classId: v.id("classes"),
      enrolledAt: v.number(),
      status: v.union(v.literal("active"), v.literal("removed")),
    })
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.userId))
      .collect();
    return rows.map((r) => ({
      classId: r.classId,
      enrolledAt: r.enrolledAt,
      status: r.status,
    }));
  },
});
