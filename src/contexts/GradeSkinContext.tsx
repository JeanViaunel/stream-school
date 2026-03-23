"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

type GradeBand = "primary" | "middle" | "high";

interface GradeSkinContextValue {
  gradeBand: GradeBand;
  isBand: (band: GradeBand) => boolean;
}

const GradeSkinContext = createContext<GradeSkinContextValue | null>(null);

function getGradeBand(gradeLevel?: number): GradeBand {
  if (gradeLevel === undefined) return "high";
  if (gradeLevel <= 3) return "primary";
  if (gradeLevel <= 8) return "middle";
  return "high";
}

export function GradeSkinProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  const gradeBand = useMemo(() => {
    if (!session) return "high";
    // Teachers, admins, parents always get "high" band
    if (session.role && session.role !== "student") {
      return "high";
    }
    return getGradeBand(session.gradeLevel);
  }, [session]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.setAttribute("data-grade-band", gradeBand);
    }
  }, [gradeBand]);

  const value: GradeSkinContextValue = {
    gradeBand,
    isBand: (band: GradeBand) => gradeBand === band,
  };

  return (
    <GradeSkinContext.Provider value={value}>
      {children}
    </GradeSkinContext.Provider>
  );
}

export function useGradeSkin() {
  const ctx = useContext(GradeSkinContext);
  if (!ctx) throw new Error("useGradeSkin must be used within GradeSkinProvider");
  return ctx;
}
