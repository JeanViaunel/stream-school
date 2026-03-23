import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

const MAX_REACTIONS = 50;

export const sendReaction = mutation({
  args: {
    sessionId: v.id("sessions"),
    emoji: v.string(),
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

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Get existing reactions or initialize empty array
    const existingReactions = session.liveReactions || [];

    // Add new reaction
    const newReaction = {
      userId: user._id,
      emoji: args.emoji,
      timestamp: Date.now(),
    };

    // Keep only the last MAX_REACTIONS to prevent database bloat
    const updatedReactions = [...existingReactions, newReaction].slice(-MAX_REACTIONS);

    await ctx.db.patch(args.sessionId, {
      liveReactions: updatedReactions,
    });

    return null;
  },
});

export const getRecentReactions = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.array(v.object({
    userId: v.id("users"),
    emoji: v.string(),
    timestamp: v.number(),
  })),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return [];
    }

    // Return last 50 reactions (already limited in storage, but ensure limit here too)
    return (session.liveReactions || []).slice(-MAX_REACTIONS);
  },
});

export const clearReactions = mutation({
  args: {
    sessionId: v.id("sessions"),
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

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Only host can clear reactions
    if (session.hostId !== user._id) {
      throw new Error("Only the host can clear reactions");
    }

    await ctx.db.patch(args.sessionId, {
      liveReactions: [],
    });

    return null;
  },
});
