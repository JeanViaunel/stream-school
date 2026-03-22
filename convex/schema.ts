import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    streamUserId: v.string(),
    displayName: v.string(),
    createdAt: v.number(),
  }).index("by_username", ["username"]),
});
