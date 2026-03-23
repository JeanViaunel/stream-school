"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { StreamClient } from "@stream-io/node-sdk";

// Internal action to create Stream call for breakout room
export const createBreakoutRoomCall = internalAction({
  args: {
    callId: v.string(),
    parentSessionId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const serverClient = new StreamClient(
      process.env.STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
    
    try {
      const call = serverClient.video.call("default", args.callId);
      await call.create({
        data: {
          created_by_id: "system",
          custom: {
            parentSessionId: args.parentSessionId,
            isBreakoutRoom: true,
          },
        },
      });
    } catch (error) {
      // Call may already exist
      console.log("Breakout room call creation (may already exist):", error);
    }
    
    return null;
  },
});

// Internal action to end Stream call for breakout room
export const endBreakoutRoomCall = internalAction({
  args: {
    callId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const serverClient = new StreamClient(
      process.env.STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );
    
    try {
      await serverClient.video.endCall({ type: "default", id: args.callId });
    } catch {
      // Best-effort: call may already be ended
    }
    
    return null;
  },
});

// Internal action to send broadcast message to a breakout room
// Note: Broadcasting is handled client-side as server-side custom events 
// are not supported in the Stream Node SDK
export const sendBroadcastMessage = internalAction({
  args: {
    callId: v.string(),
    message: v.string(),
    senderName: v.string(),
  },
  returns: v.null(),
  handler: async () => {
    // Broadcasting will be handled client-side
    // The teacher's client will send custom events to each breakout room
    return null;
  },
});