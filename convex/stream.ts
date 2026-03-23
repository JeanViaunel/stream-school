"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { StreamClient } from "@stream-io/node-sdk";
import { StreamChat } from "stream-chat";

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

export const createClassChannel = internalAction({
  args: {
    channelId: v.string(),
    name: v.string(),
    teacherStreamUserId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, { channelId, name, teacherStreamUserId }) => {
    const chatClient = StreamChat.getInstance(
      process.env.STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
    const channel = chatClient.channel("classroom", channelId, {
      name,
      created_by_id: teacherStreamUserId,
    } as Record<string, unknown>);
    await channel.create();
    return null;
  },
});

export const addMemberToChannel = internalAction({
  args: {
    channelId: v.string(),
    streamUserId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, { channelId, streamUserId }) => {
    const chatClient = StreamChat.getInstance(
      process.env.STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
    const channel = chatClient.channel("classroom", channelId);
    await channel.addMembers([streamUserId]);
    return null;
  },
});

export const removeMemberFromChannel = internalAction({
  args: {
    channelId: v.string(),
    streamUserId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, { channelId, streamUserId }) => {
    const chatClient = StreamChat.getInstance(
      process.env.STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
    const channel = chatClient.channel("classroom", channelId);
    await channel.removeMembers([streamUserId]);
    return null;
  },
});
