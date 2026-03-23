"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const storeRecording = internalAction({
  args: {
    recordingUrl: v.string(),
    callId: v.string(),
    filename: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), s3Url: v.optional(v.string()) }),
  handler: async (_ctx, args) => {
    try {
      // Download recording from Stream
      const response = await fetch(args.recordingUrl);
      
      if (!response.ok) {
        console.error(`Failed to download recording: ${response.status} ${response.statusText}`);
        return { success: false };
      }
      
      const blob = await response.blob();
      
      // TODO: Upload to S3
      // For now, return the original URL (implement S3 later)
      // const s3Url = await uploadToS3(blob, `recordings/${args.callId}/${args.filename || 'recording.mp4'}`);
      
      console.log(`Recording downloaded successfully: ${args.callId}, size: ${blob.size} bytes`);
      
      return { success: true, s3Url: args.recordingUrl };
    } catch (error) {
      console.error("Error storing recording:", error);
      return { success: false };
    }
  },
});
