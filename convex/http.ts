import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/webhook/stream",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    
    if (body.type === "message.new") {
      const message = body.message;
      
      // Check message toxicity
      const checkResult = await ctx.runAction(internal.moderationActions.checkMessage, {
        text: message.text,
      });
      
      if (checkResult.hold) {
        // Flag the message for moderation
        await ctx.runMutation(internal.moderation.flagMessage, {
          messageId: message.id,
          channelId: message.channel_id,
          userId: message.user.id,
          messageText: message.text,
          toxicityScore: checkResult.score,
          severeToxicityScore: checkResult.severeToxicity,
          identityAttackScore: checkResult.identityAttack,
        });
        
        // Return 200 to acknowledge webhook
        // Message is flagged but we still acknowledge receipt
        return new Response(JSON.stringify({ flagged: true }), { status: 200 });
      }
    }
    
    // Handle recording started webhook
    // Sent when recording begins server-side (may be triggered by client or auto-on)
    if (body.type === "call.recording_started") {
      const { call_cid } = body;
      
      console.log(`Recording started for call: ${call_cid}`);
      
      // Find the session associated with this call
      const session = await ctx.runQuery(internal.sessions.getSessionByStreamCallIdInternal, {
        streamCallId: call_cid,
      });
      
      if (session) {
        await ctx.runMutation(internal.recordings.markRecordingStartedInternal, {
          sessionId: session._id,
        });
        console.log(`Marked recording started for session: ${session._id}`);
      } else {
        console.warn(`No session found for call: ${call_cid}`);
      }
      
      return new Response("Recording start acknowledged", { status: 200 });
    }
    
    // Handle recording stopped webhook
    // Sent when recording stops server-side
    if (body.type === "call.recording_stopped") {
      const { call_cid } = body;
      
      console.log(`Recording stopped for call: ${call_cid}`);
      
      // Find the session associated with this call
      const session = await ctx.runQuery(internal.sessions.getSessionByStreamCallIdInternal, {
        streamCallId: call_cid,
      });
      
      if (session) {
        await ctx.runMutation(internal.recordings.markRecordingEndedInternal, {
          sessionId: session._id,
        });
        console.log(`Marked recording ended for session: ${session._id}`);
      } else {
        console.warn(`No session found for call: ${call_cid}`);
      }
      
      return new Response("Recording stop acknowledged", { status: 200 });
    }
    
    // Handle recording ready webhook
    // Sent when the recording file is available for download
    if (body.type === "call.recording_ready") {
      const { call_cid, filename, url } = body;
      
      console.log(`Recording ready for call: ${call_cid}, filename: ${filename}`);
      
      // Store recording via internal action (downloads from Stream URL and uploads to S3)
      const storeResult = await ctx.runAction(internal.recordingsNode.storeRecording, {
        recordingUrl: url,
        callId: call_cid,
        filename: filename,
      });
      
      // Update session with recording URL
      if (storeResult.success) {
        await ctx.runMutation(internal.sessions.updateRecordingUrl, {
          callCid: call_cid,
          recordingUrl: storeResult.s3Url ?? url,
        });
        console.log(`Recording URL updated for call: ${call_cid}`);
      } else {
        console.error(`Failed to store recording: ${storeResult.error}`);
      }
      
      return new Response("Recording processed", { status: 200 });
    }
    
    // Handle recording failed webhook
    // Sent when recording fails for any reason
    if (body.type === "call.recording_failed") {
      const { call_cid } = body;
      
      console.error(`Recording failed for call: ${call_cid}`);
      
      return new Response("Recording failure acknowledged", { status: 200 });
    }
    
    return new Response("OK", { status: 200 });
  }),
});

export default http;
