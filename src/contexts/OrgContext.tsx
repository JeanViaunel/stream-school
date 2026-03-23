"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
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

export function OrgProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.organizationId) {
      setOrgId(session.organizationId);
    }
  }, [session]);

  const org = useQuery(
    api.organizations.getById,
    orgId ? { id: orgId as any } : "skip"
  );

  const orgSettings = org?.settings ?? {
    studentDmsEnabled: false,
    recordingEnabled: false,
    lobbyEnabled: true,
    maxClassSize: 30,
    dataRetentionDays: 365,
  };

  const value: OrgContextValue = {
    org: org as Organization | null,
    orgSettings,
    userRole: session?.role ?? null,
    isLoading: org === undefined,
  };

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
