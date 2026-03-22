"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { StreamContext } from "@/contexts/StreamContext";
import { IncomingCallModal } from "@/components/call/IncomingCallModal";

export function AppShell({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session === null) {
      router.replace("/login");
    }
  }, [session, router]);

  if (session === null) return null;

  return (
    <StreamContext>
      <IncomingCallModal />
      {children}
    </StreamContext>
  );
}
