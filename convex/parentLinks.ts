import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
// import { internal } from "./_generated/api";
// import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

export const createLink = mutation({
  args: {
    studentId: v.id("users"),
    parentEmail: v.string()
  },
  returns: v.id("parentLinks"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity))
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    if (student.role !== "student") {
      throw new Error("Can only link to student accounts");
    }

    const existingLink = await ctx.db
      .query("parentLinks")
      .withIndex("by_parent_and_student", (q) =>
        q.eq("parentId", user._id).eq("studentId", args.studentId)
      )
      .unique();

    if (existingLink) {
      throw new Error("Link already exists");
    }

    const linkId = await ctx.db.insert("parentLinks", {
      parentId: user._id,
      studentId: args.studentId,
      linkedAt: Date.now(),
      consentGiven: false,
      consentMethod: "pending"
    });

    return linkId;
  }
});

export const acceptLink = mutation({
  args: {
    linkId: v.id("parentLinks"),
    consentMethod: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    await ctx.db.patch(args.linkId, {
      consentGiven: true,
      consentMethod: args.consentMethod
    });

    return null;
  }
});

export const getLinksByParent = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("parentLinks"),
      _creationTime: v.number(),
      parentId: v.id("users"),
      studentId: v.id("users"),
      linkedAt: v.number(),
      consentGiven: v.boolean(),
      consentMethod: v.string()
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity))
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db
      .query("parentLinks")
      .withIndex("by_parent", (q) => q.eq("parentId", user._id))
      .collect();
  }
});

export const getLinksByStudent = query({
  args: { studentId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("parentLinks"),
      _creationTime: v.number(),
      parentId: v.id("users"),
      studentId: v.id("users"),
      linkedAt: v.number(),
      consentGiven: v.boolean(),
      consentMethod: v.string()
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", usernameFromIdentity(identity))
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin") {
      throw new Error("Only admins can view all parent links for a student");
    }

    return await ctx.db
      .query("parentLinks")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
  }
});
