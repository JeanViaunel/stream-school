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
    
    // Handle recording webhook
    if (body.type === "call.recording_ready") {
      const { call_cid, filename, url } = body;
      
      // Store recording via internal action
      const storeResult = await ctx.runAction(internal.recordings.storeRecording, {
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
      }
      
      return new Response("Recording processed", { status: 200 });
    }
    
    return new Response("OK", { status: 200 });
  }),
});

export default http;
