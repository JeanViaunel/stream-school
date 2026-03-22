import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getUserByUsername = internalQuery({
  args: { username: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      username: v.string(),
      passwordHash: v.string(),
      displayName: v.string(),
      streamUserId: v.string(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, { username }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
  },
});

export const createUser = internalMutation({
  args: {
    username: v.string(),
    passwordHash: v.string(),
    displayName: v.string(),
    streamUserId: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, { username, passwordHash, displayName, streamUserId }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (existing !== null) throw new Error("Username already taken");
    return await ctx.db.insert("users", {
      username,
      passwordHash,
      streamUserId,
      displayName,
      createdAt: Date.now(),
    });
  },
});
