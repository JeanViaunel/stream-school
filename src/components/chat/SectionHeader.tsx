"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function SectionHeader({
  title,
  count,
  isExpanded,
  onToggle,
  className,
}: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center justify-between px-2 py-2 text-left",
        "transition-colors duration-200 rounded-lg",
        "hover:bg-white/5 group",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            isExpanded ? "rotate-0" : "-rotate-90"
          )}
        >
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
          {title}
        </span>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    </button>
  );
}
