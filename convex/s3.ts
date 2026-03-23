"use node";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";

export const generateUploadUrl = internalAction({
  args: {
    key: v.string(),
    contentType: v.string(),
    expiresInSeconds: v.optional(v.number()),
  },
  returns: v.object({
    uploadUrl: v.string(),
    fileUrl: v.string(),
  }),
  handler: async (_ctx, args) => {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: args.key,
      ContentType: args.contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: args.expiresInSeconds || 300, // 5 minutes default
    });

    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${args.key}`;

    return { uploadUrl, fileUrl };
  },
});

export const uploadBufferToS3 = internalAction({
  args: {
    buffer: v.bytes(),
    key: v.string(),
    contentType: v.string(),
  },
  returns: v.string(),
  handler: async (_ctx, args) => {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: args.key,
      Body: Buffer.from(args.buffer),
      ContentType: args.contentType,
    });

    await s3Client.send(command);

    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${args.key}`;
  },
});