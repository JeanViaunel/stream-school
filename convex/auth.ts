import { action, query, type ActionCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { type Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";

type AuthResult = {
  userId: Id<"users">;
  displayName: string;
  streamUserId: string;
  token: string;
};

export const register = action({
  args: {
    username: v.string(),
    password: v.string(),
    displayName: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    displayName: v.string(),
    streamUserId: v.string(),
    token: v.string(),
  }),
  handler: async (
    ctx: ActionCtx,
    args: { username: string; password: string; displayName: string }
  ): Promise<AuthResult> => {
    const passwordHash: string = await bcrypt.hash(args.password, 10);
    const streamUserId: string = `user_${args.username}`;

    const userId: Id<"users"> = await ctx.runMutation(internal.users.createUser, {
      username: args.username,
      passwordHash,
      displayName: args.displayName,
      streamUserId,
    });
    const token: string = await ctx.runAction(internal.stream.generateToken, {
      userId: streamUserId,
    });

    await ctx.runAction(internal.stream.upsertStreamUser, {
      userId: streamUserId,
      displayName: args.displayName,
    });

    return { userId, displayName: args.displayName, streamUserId, token };
  },
});

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
  }),
  handler: async (
    ctx: ActionCtx,
    args: { username: string; password: string }
  ): Promise<AuthResult> => {
    const user: {
      _id: Id<"users">;
      _creationTime: number;
      passwordHash: string;
      displayName: string;
      streamUserId: string;
    } | null = await ctx.runQuery(internal.users.getUserByUsername, {
      username: args.username,
    });
    if (user === null) throw new Error("Invalid username or password");

    const valid: boolean = await bcrypt.compare(args.password, user.passwordHash);
    if (!valid) throw new Error("Invalid username or password");

    const token: string = await ctx.runAction(internal.stream.generateToken, {
      userId: user.streamUserId,
    });

    return {
      userId: user._id,
      displayName: user.displayName,
      streamUserId: user.streamUserId,
      token,
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
