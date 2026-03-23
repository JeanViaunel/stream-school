"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";

type EnrolledRow = {
  classId: Id<"classes">;
  enrolledAt: number;
  status: "active" | "removed";
};

async function exportBundleJson(
  ctx: ActionCtx,
  args: { username: string; password: string },
): Promise<string> {
  const user = await ctx.runQuery(internal.users.getUserByUsername, {
    username: args.username,
  });
  if (!user) {
    throw new Error("Invalid credentials");
  }
  const valid = await bcrypt.compare(args.password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const enrollments: Array<EnrolledRow> = await ctx.runQuery(
    internal.privacyQueries.enrollmentsForUser,
    {
      userId: user._id,
    },
  );

  const bundle: {
    exportedAt: number;
    user: {
      username: string;
      displayName: string;
      role: Doc<"users">["role"];
      gradeLevel: Doc<"users">["gradeLevel"];
      organizationId: Doc<"users">["organizationId"];
      createdAt: number;
    };
    enrollments: Array<EnrolledRow>;
  } = {
    exportedAt: Date.now(),
    user: {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      gradeLevel: user.gradeLevel,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
    },
    enrollments,
  };

  return JSON.stringify(bundle, null, 2);
}

export const exportMyDataJson = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => exportBundleJson(ctx, args),
});

export const requestAccountDeletion = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: args.username,
    });
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const valid = await bcrypt.compare(args.password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    await ctx.runMutation(internal.users.scheduleDeletion, { userId: user._id });
    return null;
  },
});
