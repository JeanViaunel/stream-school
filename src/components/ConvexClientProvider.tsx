"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getSession } from "@/lib/session";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Convex auth: pass RS256 JWT from session so `ctx.auth.getUserIdentity()` works.
 * Must match `convex/auth.config.ts` and keys in Convex env.
 */
function useConvexAuthFromSession() {
  const { session } = useAuth();
  return {
    isLoading: false,
    isAuthenticated: !!session?.convexAuthToken,
    fetchAccessToken: useCallback(
      async (_args: { forceRefreshToken: boolean }) => {
        const s = getSession();
        return s?.convexAuthToken ?? null;
      },
      [],
    ),
  };
}

function ConvexAuthInner({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuthFromSession}>
      {children}
    </ConvexProviderWithAuth>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ConvexAuthInner>{children}</ConvexAuthInner>
    </AuthProvider>
  );
}
