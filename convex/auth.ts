import { action, query, type ActionCtx, type QueryCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { type Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";

const userRoleReturn = v.union(
  v.literal("student"),
  v.literal("teacher"),
  v.literal("co_teacher"),
  v.literal("parent"),
  v.literal("admin")
);

type AuthResult = {
  userId: Id<"users">;
  displayName: string;
  streamUserId: string;
  token: string;
  /** RS256 JWT for Convex `ctx.auth` (not the Stream token). */
  convexAuthToken: string;
  role: "student" | "teacher" | "co_teacher" | "parent" | "admin";
  organizationId: Id<"organizations"> | undefined;
  gradeLevel: number | undefined;
};

export const register = action({
  args: {
    username: v.string(),
    password: v.string(),
    displayName: v.string(),
    organizationId: v.optional(v.id("organizations")),
    gradeLevel: v.optional(v.number()),
  },
  returns: v.object({
    userId: v.id("users"),
    displayName: v.string(),
    streamUserId: v.string(),
    token: v.string(),
    convexAuthToken: v.string(),
    role: userRoleReturn,
    organizationId: v.optional(v.id("organizations")),
    gradeLevel: v.optional(v.number()),
  }),
  handler: async (
    ctx: ActionCtx,
    args: { username: string; password: string; displayName: string; organizationId?: Id<"organizations">; gradeLevel?: number }
  ): Promise<AuthResult> => {
    const passwordHash: string = await bcrypt.hash(args.password, 10);
    const streamUserId: string = `user_${args.username}`;

    const organizationId: Id<"organizations"> =
      args.organizationId ?? (await getDefaultOrgId(ctx));
    const role = "student" as const;

    const userId: Id<"users"> = await ctx.runMutation(internal.users.createUser, {
      username: args.username,
      passwordHash,
      displayName: args.displayName,
      streamUserId,
      role,
      organizationId,
      gradeLevel: args.gradeLevel,
      isActive: true,
    });
    const token: string = await ctx.runAction(internal.stream.generateToken, {
      userId: streamUserId,
    });

    await ctx.runAction(internal.stream.upsertStreamUser, {
      userId: streamUserId,
      displayName: args.displayName,
    });

    const convexAuthToken: string = await ctx.runAction(internal.convexJwt.signConvexAuthToken, {
      username: args.username,
    });

    return {
      userId,
      displayName: args.displayName,
      streamUserId,
      token,
      convexAuthToken,
      role,
      organizationId,
      gradeLevel: args.gradeLevel,
    };
  },
});

async function getDefaultOrgId(ctx: ActionCtx): Promise<Id<"organizations">> {
  const org = await ctx.runQuery(api.organizations.getBySlug, { slug: "default" });
  if (org) {
    return org._id;
  }
  return await ctx.runMutation(internal.organizations.createOrganization, {
    name: "Default Organization",
    slug: "default",
    settings: {
      studentDmsEnabled: false,
      recordingEnabled: false,
      lobbyEnabled: true,
      maxClassSize: 30,
      dataRetentionDays: 365,
    },
  });
}

export const login = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    displayName: v.string(),
    streamUserId: v.string(),
    token: v.string(),
    convexAuthToken: v.string(),
    role: userRoleReturn,
    organizationId: v.optional(v.id("organizations")),
    gradeLevel: v.optional(v.number()),
  }),
  handler: async (
    ctx: ActionCtx,
    args: { username: string; password: string }
  ): Promise<AuthResult> => {
    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: args.username,
    });
    if (user === null) throw new Error("Invalid username or password");

    const valid: boolean = await bcrypt.compare(args.password, user.passwordHash);
    if (!valid) throw new Error("Invalid username or password");

    const token: string = await ctx.runAction(internal.stream.generateToken, {
      userId: user.streamUserId,
    });

    const role =
      user.role ??
      ("student" as "student" | "teacher" | "co_teacher" | "parent" | "admin");

    const convexAuthToken: string = await ctx.runAction(internal.convexJwt.signConvexAuthToken, {
      username: user.username,
    });

    return {
      userId: user._id,
      displayName: user.displayName,
      streamUserId: user.streamUserId,
      token,
      convexAuthToken,
      role,
      organizationId: user.organizationId,
      gradeLevel: user.gradeLevel,
    };
  },
});

export const refreshToken = action({
  args: { streamUserId: v.string() },
  returns: v.string(),
  handler: async (
    ctx: ActionCtx,
    args: { streamUserId: string }
  ): Promise<string> => {
    const token: string = await ctx.runAction(internal.stream.generateToken, {
      userId: args.streamUserId,
    });
    return token;
  },
});

export const getMe = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      username: v.string(),
      displayName: v.string(),
      streamUserId: v.string(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<"users"> }
  ) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      streamUserId: user.streamUserId,
      createdAt: user.createdAt,
    };
  },
});
