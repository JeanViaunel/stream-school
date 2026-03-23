"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Check message toxicity using Perspective API
export const checkMessage = internalAction({
  args: { text: v.string() },
  returns: v.object({ 
    hold: v.boolean(), 
    score: v.number(),
    severeToxicity: v.number(),
    identityAttack: v.number(),
  }),
  handler: async (_ctx, args) => {
    const response = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.PERSPECTIVE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: { text: args.text },
          languages: ["en"],
          requestedAttributes: { 
            TOXICITY: {}, 
            SEVERE_TOXICITY: {}, 
            IDENTITY_ATTACK: {} 
          },
          doNotStore: true,
        }),
      }
    );
    
    const data = await response.json();
    const toxicity = data.attributeScores?.TOXICITY?.summaryScore?.value || 0;
    const severeToxicity = data.attributeScores?.SEVERE_TOXICITY?.summaryScore?.value || 0;
    const identityAttack = data.attributeScores?.IDENTITY_ATTACK?.summaryScore?.value || 0;
    
    const shouldHold = toxicity > 0.7 || severeToxicity > 0.5 || identityAttack > 0.6;
    return { 
      hold: shouldHold, 
      score: toxicity,
      severeToxicity,
      identityAttack,
    };
  },
});

// Public action to review a flagged message and optionally delete it
// This is needed because client components cannot call internal actions directly
type ReviewResult = { success: boolean; messageId?: string; shouldDelete: boolean };

export const reviewAndDelete = action({
  args: {
    flagId: v.id("moderationFlags"),
    status: v.union(
      v.literal("reviewed"),
      v.literal("actioned"),
      v.literal("dismissed")
    ),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    shouldDelete: v.boolean(),
  }),
  handler: async (ctx, args): Promise<ReviewResult> => {
    // Call internal mutation to review the flag
    const result: ReviewResult = await ctx.runMutation(internal.moderation.reviewFlag, {
      flagId: args.flagId,
      status: args.status,
    });

    // If deletion is needed, call the internal action
    if (result.shouldDelete && result.messageId) {
      await ctx.runAction(internal.stream.deleteMessage, {
        messageId: result.messageId,
      });
    }

    return result;
  },
});
