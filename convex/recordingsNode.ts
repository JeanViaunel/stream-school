"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
      const response = await fetch(args.sourceUrl);

      if (!response.ok) {
        console.error(
          `Failed to download recording: ${response.status} ${response.statusText}`
        );
        return {
          success: false,
          error: `Failed to download: ${response.statusText}`,
        };
      }

      const buffer = await response.arrayBuffer();

      if (!process.env.AWS_REGION || !process.env.S3_BUCKET_NAME) {
        console.warn("AWS S3 not configured, returning Stream URL");
        return {
          success: true,
          s3Url: args.sourceUrl,
        };
      }

      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      });

      const key = `recordings/${args.sessionId}/${args.filename}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
          Body: Buffer.from(buffer),
          ContentType: "video/mp4",
          Metadata: {
            "session-id": args.sessionId.toString(),
            "uploaded-at": new Date().toISOString(),
          },
        })
      );

      const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      console.log(`Recording uploaded to S3: ${s3Url}`);

      return {
        success: true,
        s3Url,
      };
    } catch (error) {
      console.error("Error uploading recording to S3:", error);
      return {
        success: true,
        s3Url: args.sourceUrl,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Stores recording URL and triggers S3 upload (Node runtime: S3 + Buffer).
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
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; s3Url?: string; error?: string }> => {
    try {
      const session = await ctx.runQuery(
        internal.sessions.getSessionByStreamCallIdInternal,
        {
          streamCallId: args.callId,
        }
      );

      if (!session) {
        console.error(`Session not found for call: ${args.callId}`);
        return {
          success: false,
          error: "Session not found",
        };
      }

      const filename = args.filename || `recording_${Date.now()}.mp4`;

      const response = await fetch(args.recordingUrl);

      if (!response.ok) {
        console.error(
          `Failed to download recording: ${response.status} ${response.statusText}`
        );
        return {
          success: false,
          error: `Failed to download: ${response.statusText}`,
        };
      }

      const buffer = await response.arrayBuffer();

      let s3Url: string;
      if (!process.env.AWS_REGION || !process.env.S3_BUCKET_NAME) {
        console.warn("AWS S3 not configured, returning Stream URL");
        s3Url = args.recordingUrl;
      } else {
        const s3Client = new S3Client({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
          },
        });

        const key = `recordings/${session._id}/${filename}`;

        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: Buffer.from(buffer),
            ContentType: "video/mp4",
            Metadata: {
              "session-id": session._id.toString(),
              "uploaded-at": new Date().toISOString(),
            },
          })
        );

        s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        console.log(`Recording uploaded to S3: ${s3Url}`);
      }

      await ctx.runMutation(internal.sessions.updateRecordingUrl, {
        callCid: args.callId,
        recordingUrl: s3Url,
      });

      return {
        success: true,
        s3Url,
      };
    } catch (error) {
      console.error("Error storing recording:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
