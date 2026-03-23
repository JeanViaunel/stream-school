import type { UserIdentity } from "convex/server";

/**
 * Map Convex auth identity to our `users.username` field.
 * Custom JWT uses `sub` (→ `subject`); some setups use `issuer|subject` in `tokenIdentifier`.
 */
export function usernameFromIdentity(identity: UserIdentity): string {
  const subject = identity.subject?.trim();
  if (subject) {
    return subject;
  }
  const tid = identity.tokenIdentifier ?? "";
  const pipe = tid.lastIndexOf("|");
  if (pipe >= 0) {
    return tid.slice(pipe + 1);
  }
  return tid;
}
