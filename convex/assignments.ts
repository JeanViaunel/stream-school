import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const createAssignment = mutation({
  args: {
    classId: v.id("classes"),
    title: v.string(),
    instructions: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
    questions: v.array(v.object({
      id: v.string(),
      text: v.string(),
      options: v.optional(v.array(v.string())),
      correctOption: v.optional(v.number()),
    })),
    dueDateAt: v.optional(v.number()),
    sessionId: v.optional(v.id("sessions")),
  },
  returns: v.id("assignments"),
  handler: async (ctx, args): Promise<Id<"assignments">> => {
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

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    if (cls.teacherId !== user._id) {
      throw new Error("Only the teacher can create assignments");
    }

    return await ctx.db.insert("assignments", {
      classId: args.classId,
      creatorId: user._id,
      title: args.title,
      instructions: args.instructions,
      type: args.type,
      questions: args.questions,
      dueDateAt: args.dueDateAt,
      sessionId: args.sessionId,
      isPublished: false,
      createdAt: Date.now(),
    });
  },
});

export const publishAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
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

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.creatorId !== user._id) {
      throw new Error("Only the creator can publish assignments");
    }

    await ctx.db.patch(args.assignmentId, { isPublished: true });
    return null;
  },
});

export const getAssignmentsByClass = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.array(
    v.object({
      _id: v.id("assignments"),
      _creationTime: v.number(),
      classId: v.id("classes"),
      creatorId: v.id("users"),
      title: v.string(),
      instructions: v.string(),
      type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
      questions: v.array(v.object({
        id: v.string(),
        text: v.string(),
        options: v.optional(v.array(v.string())),
        correctOption: v.optional(v.number()),
      })),
      dueDateAt: v.optional(v.number()),
      sessionId: v.optional(v.id("sessions")),
      isPublished: v.boolean(),
      createdAt: v.number(),
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

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isTeacher && !isEnrolled) {
      throw new Error("Not authorized to view assignments for this class");
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    return assignments;
  },
});

export const getAssignmentById = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.union(
    v.object({
      _id: v.id("assignments"),
      _creationTime: v.number(),
      classId: v.id("classes"),
      creatorId: v.id("users"),
      title: v.string(),
      instructions: v.string(),
      type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
      questions: v.array(v.object({
        id: v.string(),
        text: v.string(),
        options: v.optional(v.array(v.string())),
        correctOption: v.optional(v.number()),
      })),
      dueDateAt: v.optional(v.number()),
      sessionId: v.optional(v.id("sessions")),
      isPublished: v.boolean(),
      createdAt: v.number(),
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

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      return null;
    }

    const cls = await ctx.db.get(assignment.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id;
    const isCreator = assignment.creatorId === user._id;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", assignment.classId).eq("studentId", user._id)
      )
      .unique();

    if (!isTeacher && !isCreator && !isEnrolled) {
      throw new Error("Not authorized to view this assignment");
    }

    if (!assignment.isPublished && !isTeacher && !isCreator) {
      throw new Error("Assignment not yet published");
    }

    return assignment;
  },
});
