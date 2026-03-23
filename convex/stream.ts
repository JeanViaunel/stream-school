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

    const channelTypeName = "classroom";

    const channel = chatClient.channel(channelTypeName, channelId, {
      name,
      created_by_id: teacherStreamUserId,
    } as Record<string, unknown>);

    const isMissingChannelTypeError = (err: unknown): boolean => {
      const message = err instanceof Error ? err.message : String(err);
      return /channel type does not exist/i.test(message) || /not found/i.test(message);
    };

    try {
      await channel.create();
      return null;
    } catch (err: unknown) {
      if (!isMissingChannelTypeError(err)) {
        throw err;
      }

      // If the type doesn't exist yet (new Stream project / fresh environment),
      // create it and retry channel creation once.
      try {
        await chatClient.createChannelType({
          name: channelTypeName,
          // Match the intended classroom features from `EDU-SETUP.md`.
          typing_events: true,
          read_events: true,
          search: true,
          reactions: true,
          replies: true,
        });
      } catch (createErr: unknown) {
        const createMessage = createErr instanceof Error ? createErr.message : String(createErr);
        const isAlreadyExists =
          /already exists|duplicate|conflict/i.test(createMessage) ||
          /channel type does not exist/i.test(createMessage);
        if (!isAlreadyExists) {
          throw createErr;
        }
      }

      // Small delay helps in cases where Stream needs a brief propagation window.
      await new Promise((resolve) => setTimeout(resolve, 500));
      await channel.create();
      return null;
    }
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

// Ensures a member in a classroom channel has the desired Stream Chat channel role.
// We use this for server-side enforcement of "admin monitor-only" behavior.
export const setClassroomMemberChannelRole = internalAction({
  args: {
    channelId: v.string(),
    streamUserId: v.string(),
    channelRole: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, { channelId, streamUserId, channelRole }) => {
    const chatClient = StreamChat.getInstance(
      process.env.STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
    const channel = chatClient.channel("classroom", channelId);

    // Best-effort: assign roles first (works if user is already a member).
    try {
      await channel.assignRoles([
        { channel_role: channelRole, user_id: streamUserId },
      ]);
      return null;
    } catch {
      // If the member isn't present yet, add them and retry.
    }

    await channel.addMembers([streamUserId]);
    await channel.assignRoles([
      { channel_role: channelRole, user_id: streamUserId },
    ]);
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

export const deleteMessage = internalAction({
  args: {
    messageId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, { messageId }) => {
    const chatClient = StreamChat.getInstance(
      process.env.STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
    await chatClient.deleteMessage(messageId);
    return null;
  },
});

export const endVideoCall = internalAction({
  args: {
    callType: v.string(),
    callId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, { callType, callId }) => {
    const serverClient = new StreamClient(
      process.env.STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
    try {
      await serverClient.video.endCall({ type: callType, id: callId });
    } catch {
      // Best-effort: call may already be ended or never started
    }
    return null;
  },
});

export const getSessionChatMessages = internalAction({
  args: {
    channelId: v.string(),
  },
  returns: v.array(v.object({
    user: v.string(),
    text: v.string(),
    timestamp: v.optional(v.number()),
  })),
  handler: async (_ctx, { channelId }) => {
    const chatClient = StreamChat.getInstance(
      process.env.STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
    
    const channel = chatClient.channel("classroom", channelId);
    
    try {
      const response = await channel.query({
        messages: { limit: 200 },
      });
      
      return (response.messages || []).map((msg: any) => ({
        user: msg.user?.name || msg.user?.id || "Unknown",
        text: msg.text || "",
        timestamp: msg.created_at ? new Date(msg.created_at).getTime() : undefined,
      }));
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
      return [];
    }
  },
});
