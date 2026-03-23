"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useAuth } from "./AuthContext";

interface Organization {
  _id: string;
  _creationTime: number;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt: number;
  settings: {
    studentDmsEnabled: boolean;
    recordingEnabled: boolean;
    lobbyEnabled: boolean;
    maxClassSize: number;
    dataRetentionDays: number;
  };
}

interface OrgContextValue {
  org: Organization | null;
  orgSettings: Organization["settings"];
  userRole: string | null;
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

function useClientSubdomainSlug(): string | null {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      setSlug(null);
      return;
    }
    const parts = h.split(".");
    if (parts.length >= 3) {
      setSlug(parts[0]);
    } else {
      setSlug(null);
    }
  }, []);
  return slug;
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const subSlug = useClientSubdomainSlug();

  const paramOrg = searchParams.get("org");
  const slugForLookup = paramOrg ?? subSlug ?? undefined;

  const orgBySlug = useQuery(
    api.organizations.getBySlug,
    slugForLookup ? { slug: slugForLookup } : "skip"
  );

  const orgIdFromSession = session?.organizationId
    ? (session.organizationId as Id<"organizations">)
    : undefined;

  const resolvedOrgId: Id<"organizations"> | undefined =
    orgIdFromSession ?? (orgBySlug?._id as Id<"organizations"> | undefined);

  const org = useQuery(
    api.organizations.getById,
    resolvedOrgId !== undefined ? { id: resolvedOrgId } : "skip"
  );

  const orgSettings = org?.settings ?? {
    studentDmsEnabled: false,
    recordingEnabled: false,
    lobbyEnabled: true,
    maxClassSize: 30,
    dataRetentionDays: 365,
  };

  const loadingSlug = slugForLookup !== undefined && orgBySlug === undefined;
  const loadingOrg = resolvedOrgId !== undefined && org === undefined;
  const isLoading = loadingSlug || loadingOrg;

  const value: OrgContextValue = {
    org: org as Organization | null,
    orgSettings,
    userRole: session?.role ?? null,
    isLoading,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
