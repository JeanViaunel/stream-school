import type { AuthConfig } from "convex/server";
import { CONVEX_AUTH_ISSUER } from "./authConstants";
import { CONVEX_AUTH_JWKS_DATA_URI } from "./convexAuthJwks";

/**
 * Public JWKS is committed in `convexAuthJwks.ts` (must match `CONVEX_AUTH_PRIVATE_KEY` in Convex env).
 * Regenerate both with `node scripts/generate-convex-jwt-keys.mjs`.
 */
export default {
  providers: [
    {
      type: "customJwt",
      applicationID: "stream-school",
      issuer: CONVEX_AUTH_ISSUER,
      jwks: CONVEX_AUTH_JWKS_DATA_URI,
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
