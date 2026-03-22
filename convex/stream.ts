"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { StreamClient } from "@stream-io/node-sdk";

export const generateToken = internalAction({
  args: {
    userId: v.string(),
  },
  returns: v.string(),
  handler: async (_ctx, { userId }) => {
    const serverClient = new StreamClient(
      process.env.STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
    // Short-lived token: 1 hour
    const token = serverClient.generateUserToken({
      user_id: userId,
      validity_in_seconds: 3600,
    });
    return token;
  },
});

export const upsertStreamUser = internalAction({
  args: {
    userId: v.string(),
    displayName: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, { userId, displayName }) => {
    const serverClient = new StreamClient(
      process.env.STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
    await serverClient.upsertUsers([
      {
        id: userId,
        name: displayName,
      },
    ]);
    return null;
  },
});
