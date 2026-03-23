"use client";

import { Suspense, type ReactNode } from "react";
import { OrgProvider } from "@/contexts/OrgContext";
import { GradeSkinProvider } from "@/contexts/GradeSkinContext";

/**
 * Org + grade skin must wrap the app shell but stay outside StreamContext (see EDU-T08).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <OrgProvider>
        <GradeSkinProvider>{children}</GradeSkinProvider>
      </OrgProvider>
    </Suspense>
  );
}
