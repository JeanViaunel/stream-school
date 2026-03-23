#!/usr/bin/env node
/**
 * Generates an RS256 key pair for Convex custom JWT auth.
 *
 * Writes:
 * - `convex/convexAuthJwks.ts` — public JWKS (safe to commit)
 * - `convex/.convex-auth-private-key.pem` — private key (gitignored via `*.pem`)
 *
 * Then set the private key in Convex:
 *   npx convex env set CONVEX_AUTH_PRIVATE_KEY "$(cat convex/.convex-auth-private-key.pem)"
 *
 * Issuer / audience must match `convex/authConstants.ts`.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { exportPKCS8, exportJWK, generateKeyPair } from "jose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const convexDir = join(root, "convex");

const KID = "streamschool-1";

async function main() {
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  const pkcs8 = await exportPKCS8(privateKey);
  const pubJwk = await exportJWK(publicKey);
  pubJwk.kid = KID;
  pubJwk.use = "sig";
  pubJwk.alg = "RS256";

  const jwks = { keys: [pubJwk] };
  const dataUri =
    "data:application/json;base64," +
    Buffer.from(JSON.stringify(jwks), "utf8").toString("base64");

  writeFileSync(
    join(convexDir, "convexAuthJwks.ts"),
    `// Dev JWKS (public). Must match CONVEX_AUTH_PRIVATE_KEY in Convex env.\n` +
      `// Regenerate: node scripts/generate-convex-jwt-keys.mjs\n` +
      `export const CONVEX_AUTH_JWKS_DATA_URI = ${JSON.stringify(dataUri)} as const;\n`,
  );
  writeFileSync(join(convexDir, ".convex-auth-private-key.pem"), pkcs8);

  console.log("Wrote convex/convexAuthJwks.ts and convex/.convex-auth-private-key.pem");
  console.log(
    "Set Convex env:\n  npx convex env set CONVEX_AUTH_PRIVATE_KEY \"$(cat convex/.convex-auth-private-key.pem)\"",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
