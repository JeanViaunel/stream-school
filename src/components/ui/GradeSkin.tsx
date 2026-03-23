"use client";

import type { CSSProperties, ReactNode } from "react";
import { useGradeSkin } from "@/contexts/GradeSkinContext";
import { generateGradeCSSVariables, getGradeTheme } from "@/lib/gradeTheme";

export function GradeSkin({ children, className }: { children: ReactNode; className?: string }) {
  const { gradeBand } = useGradeSkin();
  const theme = getGradeTheme(gradeBand);
  const vars = generateGradeCSSVariables(theme) as Record<string, string>;
  const style = vars as CSSProperties;

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
