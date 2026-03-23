import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { usernameFromIdentity } from "./authHelpers";

export const addAnnotation = mutation({
  args: {
    sessionId: v.id("sessions"),
    annotation: v.object({
      type: v.union(v.literal("draw"), v.literal("text"), v.literal("highlight")),
      data: v.object({
        x: v.number(),
        y: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        color: v.string(),
        strokeWidth: v.optional(v.number()),
        text: v.optional(v.string()),
        points: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
      }),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) throw new Error("User not found");
    
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    
    const cls = await ctx.db.get(session.classId);
    if (!cls || cls.teacherId !== user._id) {
      throw new Error("Only teachers can annotate");
    }
    
    const annotation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user._id,
      type: args.annotation.type,
      data: args.annotation.data,
      timestamp: Date.now(),
    };
    
    await ctx.db.patch(args.sessionId, {
      annotations: [...(session.annotations || []), annotation],
    });
    
    return null;
  },
});

export const clearAnnotations = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) throw new Error("User not found");
    
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    
    const cls = await ctx.db.get(session.classId);
    if (!cls || cls.teacherId !== user._id) {
      throw new Error("Only teachers can clear annotations");
    }
    
    await ctx.db.patch(args.sessionId, { annotations: [] });
    return null;
  },
});

export const getAnnotations = query({
  args: { sessionId: v.id("sessions") },
  returns: v.array(v.object({
    id: v.string(),
    userId: v.id("users"),
    type: v.union(v.literal("draw"), v.literal("text"), v.literal("highlight")),
    data: v.object({
      x: v.number(),
      y: v.number(),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      color: v.string(),
      strokeWidth: v.optional(v.number()),
      text: v.optional(v.string()),
      points: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
    }),
    timestamp: v.number(),
    page: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    return session?.annotations || [];
  },
});
