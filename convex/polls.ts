import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

export const createPoll = mutation({
  args: {
    sessionId: v.id("sessions"),
    classId: v.id("classes"),
    question: v.string(),
    options: v.array(v.string()),
  },
  returns: v.id("polls"),
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

    if (!user.role || (user.role !== "teacher" && user.role !== "school_admin" && user.role !== "platform_admin")) {
      throw new Error("Only teachers can create polls");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.classId !== args.classId) {
      throw new Error("Session does not belong to the specified class");
    }

    const pollId = await ctx.db.insert("polls", {
      sessionId: args.sessionId,
      classId: args.classId,
      creatorId: user._id,
      question: args.question,
      options: args.options,
      isOpen: true,
      createdAt: Date.now(),
    });

    return pollId;
  },
});

export const closePoll = mutation({
  args: {
    pollId: v.id("polls"),
  },
  returns: v.null(),
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

    const poll = await ctx.db.get(args.pollId);
    if (!poll) {
      throw new Error("Poll not found");
    }

    const cls = await ctx.db.get(poll.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isCreator = poll.creatorId === user._id;
    const isClassTeacher = cls.teacherId === user._id;
    const isAdmin = user.role === "school_admin" || user.role === "platform_admin";

    if (!isCreator && !isClassTeacher && !isAdmin) {
      throw new Error("Only the creator, class teacher, or admin can close a poll");
    }

    await ctx.db.patch(args.pollId, { isOpen: false });
    return null;
  },
});

export const submitPollResponse = mutation({
  args: {
    pollId: v.id("polls"),
    selectedOption: v.number(),
  },
  returns: v.null(),
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

    if (!user.role || user.role !== "student") {
      throw new Error("Only students can submit poll responses");
    }

    const poll = await ctx.db.get(args.pollId);
    if (!poll) {
      throw new Error("Poll not found");
    }

    if (!poll.isOpen) {
      throw new Error("Poll is closed");
    }

    if (args.selectedOption < 0 || args.selectedOption >= poll.options.length) {
      throw new Error("Invalid option index");
    }

    const existingResponse = await ctx.db
      .query("pollResponses")
      .withIndex("by_poll_and_student", (q) =>
        q.eq("pollId", args.pollId).eq("studentId", user._id)
      )
      .unique();

    if (existingResponse) {
      throw new Error("You have already responded to this poll");
    }

    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", poll.classId).eq("studentId", user._id)
      )
      .unique();

    if (!enrollment || enrollment.status !== "active") {
      throw new Error("You are not enrolled in this class");
    }

    await ctx.db.insert("pollResponses", {
      pollId: args.pollId,
      studentId: user._id,
      selectedOption: args.selectedOption,
      respondedAt: Date.now(),
    });

    return null;
  },
});

export const getPollResults = query({
  args: {
    pollId: v.id("polls"),
  },
  returns: v.object({
    poll: v.object({
      question: v.string(),
      options: v.array(v.string()),
      isOpen: v.boolean(),
    }),
    responses: v.optional(v.array(v.object({
      studentId: v.id("users"),
      selectedOption: v.number(),
    }))),
    counts: v.array(v.number()),
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

    const poll = await ctx.db.get(args.pollId);
    if (!poll) {
      throw new Error("Poll not found");
    }

    const cls = await ctx.db.get(poll.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id || 
                      user.role === "school_admin" || 
                      user.role === "platform_admin";
    
    let isEnrolledStudent = false;
    if (!isTeacher) {
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_class_and_student", (q) =>
          q.eq("classId", poll.classId).eq("studentId", user._id)
        )
        .unique();
      isEnrolledStudent = enrollment !== null && enrollment.status === "active";
    }

    if (!isTeacher && !isEnrolledStudent) {
      throw new Error("Not authorized to view poll results");
    }

    const responses = await ctx.db
      .query("pollResponses")
      .withIndex("by_poll", (q) => q.eq("pollId", args.pollId))
      .collect();

    const counts = new Array(poll.options.length).fill(0);
    for (const response of responses) {
      if (response.selectedOption >= 0 && response.selectedOption < counts.length) {
        counts[response.selectedOption]++;
      }
    }

    if (isTeacher) {
      return {
        poll: {
          question: poll.question,
          options: poll.options,
          isOpen: poll.isOpen,
        },
        responses: responses.map(r => ({
          studentId: r.studentId,
          selectedOption: r.selectedOption,
        })),
        counts,
      };
    } else {
      return {
        poll: {
          question: poll.question,
          options: poll.options,
          isOpen: poll.isOpen,
        },
        counts,
      };
    }
  },
});

export const getPollsBySession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.array(v.object({
    _id: v.id("polls"),
    _creationTime: v.number(),
    sessionId: v.id("sessions"),
    classId: v.id("classes"),
    creatorId: v.id("users"),
    question: v.string(),
    options: v.array(v.string()),
    isOpen: v.boolean(),
    createdAt: v.number(),
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

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const cls = await ctx.db.get(session.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    const isTeacher = cls.teacherId === user._id || 
                      user.role === "school_admin" || 
                      user.role === "platform_admin";
    
    let isEnrolledStudent = false;
    if (!isTeacher) {
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_class_and_student", (q) =>
          q.eq("classId", session.classId).eq("studentId", user._id)
        )
        .unique();
      isEnrolledStudent = enrollment !== null && enrollment.status === "active";
    }

    if (!isTeacher && !isEnrolledStudent) {
      throw new Error("Not authorized to view polls for this session");
    }

    return await ctx.db
      .query("polls")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();
  },
});
