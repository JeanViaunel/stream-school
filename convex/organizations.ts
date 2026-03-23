import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createOrganization = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    settings: v.optional(
      v.object({
        studentDmsEnabled: v.boolean(),
        recordingEnabled: v.boolean(),
        lobbyEnabled: v.boolean(),
        maxClassSize: v.number(),
        dataRetentionDays: v.number(),
      })
    ),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      logoUrl: args.logoUrl,
      primaryColor: args.primaryColor,
      createdAt: Date.now(),
      settings: args.settings ?? {
        studentDmsEnabled: false,
        recordingEnabled: false,
        lobbyEnabled: true,
        maxClassSize: 30,
        dataRetentionDays: 365,
      },
    });
    return orgId;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      logoUrl: v.optional(v.string()),
      primaryColor: v.optional(v.string()),
      createdAt: v.number(),
      settings: v.object({
        studentDmsEnabled: v.boolean(),
        recordingEnabled: v.boolean(),
        lobbyEnabled: v.boolean(),
        maxClassSize: v.number(),
        dataRetentionDays: v.number(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return org;
  },
});

export const getById = query({
  args: { id: v.id("organizations") },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      logoUrl: v.optional(v.string()),
      primaryColor: v.optional(v.string()),
      createdAt: v.number(),
      settings: v.object({
        studentDmsEnabled: v.boolean(),
        recordingEnabled: v.boolean(),
        lobbyEnabled: v.boolean(),
        maxClassSize: v.number(),
        dataRetentionDays: v.number(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
