"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { SignJWT, importPKCS8 } from "jose";
import { CONVEX_AUTH_AUDIENCE, CONVEX_AUTH_ISSUER } from "./authConstants";

/**
 * RS256 JWT for Convex `ctx.auth.getUserIdentity()`.
 * Set `CONVEX_AUTH_PRIVATE_KEY` (PEM) in the Convex dashboard.
 */
export const signConvexAuthToken = internalAction({
  args: { username: v.string() },
  returns: v.string(),
  handler: async (_ctx, args) => {
    const pk = process.env.CONVEX_AUTH_PRIVATE_KEY;
    if (!pk) {
      throw new Error(
        "CONVEX_AUTH_PRIVATE_KEY is not set. Run scripts/generate-convex-jwt-keys.mjs and add the key to Convex env (see SETUP.md).",
      );
    }
    const key = await importPKCS8(pk, "RS256");
    return await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "streamschool-1" })
      .setSubject(args.username)
      .setIssuer(CONVEX_AUTH_ISSUER)
      .setAudience(CONVEX_AUTH_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(key);
  },
});
