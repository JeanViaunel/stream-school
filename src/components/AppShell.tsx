"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { StreamContext } from "@/contexts/StreamContext";
import { UIActionsProvider } from "@/contexts/UIActionsContext";
import { IncomingCallModal } from "@/components/call/IncomingCallModal";
import { CommandPalette } from "@/components/CommandPalette";
import { Skeleton } from "@/components/ui/skeleton";

function AppLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm px-8">
        {/* Logo skeleton */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-card animate-pulse">
          <span className="text-2xl font-bold text-primary/50" style={{ fontFamily: "var(--font-syne)" }}>S</span>
        </div>
        
        {/* Content skeleton */}
        <div className="w-full space-y-4">
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-3 w-1/2 mx-auto" />
        </div>
        
        {/* Progress indicator */}
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Loading</span>
            <span className="animate-pulse">...</span>
          </div>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-primary animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session === null) {
      router.replace("/login");
    }
  }, [session, router]);

  if (session === null) {
    return <AppLoadingScreen />;
  }

  return (
    <UIActionsProvider>
      <StreamContext>
        <CommandPalette />
        <IncomingCallModal />
        {children}
      </StreamContext>
    </UIActionsProvider>
  );
}
