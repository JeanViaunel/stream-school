"use node";

import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Get a session by its Stream call ID (internal query)
 */
export const getSessionByStreamCallId = internalQuery({
  args: {
    streamCallId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("sessions"),
      classId: v.id("classes"),
      hostId: v.id("users"),
      streamCallId: v.string(),
      recordingUrl: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .first();
    
    if (!session) return null;
    
    return {
      _id: session._id,
      classId: session.classId,
      hostId: session.hostId,
      streamCallId: session.streamCallId,
      recordingUrl: session.recordingUrl,
    };
  },
});

/**
 * Update session recording URL (internal mutation)
 */
export const updateSessionRecordingUrl = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    recordingUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      recordingUrl: args.recordingUrl,
    });
    return null;
  },
});

/**
 * Mark recording as started (internal mutation)
 */
export const markRecordingStarted = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      recordingStartedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Mark recording as ended (internal mutation)
 */
export const markRecordingEnded = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      recordingEndedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Upload recording to S3 (internal action)
 * Downloads recording from Stream and uploads to S3 for permanent storage
 */
export const uploadToS3 = internalAction({
  args: {
    sourceUrl: v.string(),
    filename: v.string(),
    sessionId: v.id("sessions"),
  },
  returns: v.object({
    success: v.boolean(),
    s3Url: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Download recording from Stream
      const response = await fetch(args.sourceUrl);
      
      if (!response.ok) {
        console.error(`Failed to download recording: ${response.status} ${response.statusText}`);
        return { 
          success: false, 
          error: `Failed to download: ${response.statusText}` 
        };
      }
      
      const buffer = await response.arrayBuffer();
      
      // Check if AWS credentials are configured
      if (!process.env.AWS_REGION || !process.env.S3_BUCKET_NAME) {
        console.warn("AWS S3 not configured, returning Stream URL");
        // Return the original URL if S3 is not configured
        return { 
          success: true, 
          s3Url: args.sourceUrl 
        };
      }
      
      // Initialize S3 client
      const s3Client = new S3Client({ 
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      });
      
      // Upload to S3
      const key = `recordings/${args.sessionId}/${args.filename}`;
      
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: "video/mp4",
        Metadata: {
          "session-id": args.sessionId.toString(),
          "uploaded-at": new Date().toISOString(),
        },
      }));
      
      // Construct S3 URL
      const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      
      console.log(`Recording uploaded to S3: ${s3Url}`);
      
      return { 
        success: true, 
        s3Url 
      };
    } catch (error) {
      console.error("Error uploading recording to S3:", error);
      // Return the source URL as fallback
      return { 
        success: true, 
        s3Url: args.sourceUrl,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

/**
 * Legacy function for backward compatibility
 * Stores recording URL and triggers S3 upload
 */
export const storeRecording = internalAction({
  args: {
    recordingUrl: v.string(),
    callId: v.string(),
    filename: v.optional(v.string()),
  },
  returns: v.object({ 
    success: v.boolean(), 
    s3Url: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Find session by call ID
      const session = await ctx.runQuery(internal.recordings.getSessionByStreamCallId, {
        streamCallId: args.callId,
      });
      
      if (!session) {
        console.error(`Session not found for call: ${args.callId}`);
        return { 
          success: false, 
          error: "Session not found" 
        };
      }
      
      // Upload to S3
      const filename = args.filename || `recording_${Date.now()}.mp4`;
      const uploadResult = await ctx.runAction(internal.recordings.uploadToS3, {
        sourceUrl: args.recordingUrl,
        filename,
        sessionId: session._id,
      });
      
      if (uploadResult.success && uploadResult.s3Url) {
        // Update session with S3 URL
        await ctx.runMutation(internal.recordings.updateSessionRecordingUrl, {
          sessionId: session._id,
          recordingUrl: uploadResult.s3Url,
        });
      }
      
      return uploadResult;
    } catch (error) {
      console.error("Error storing recording:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});
