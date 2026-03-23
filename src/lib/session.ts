const SESSION_KEY = "stream_app_session";

export interface Session {
  userId: string;
  username?: string;
  displayName: string;
  streamUserId: string;
  /** Stream Chat / Video token (not Convex auth). */
  token: string;
  /** JWT for Convex `ctx.auth` — set on login/register. */
  convexAuthToken?: string;
  organizationId?: string;
  role?: "student" | "teacher" | "co_teacher" | "parent" | "admin";
  gradeLevel?: number;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
