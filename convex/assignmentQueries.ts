import { v } from "convex/values";
import { query } from "./_generated/server";

export const checkEnrollment = query({
  args: {
    classId: v.id("classes"),
    studentId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", args.studentId)
      )
      .unique();

    return enrollment !== null && enrollment.status === "active";
  },
});