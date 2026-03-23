"use client";

import { Trophy, Target, Calendar, Star, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MilestoneBadgeProps {
  name: string;
  description: string;
  completed: boolean;
  completedAt?: number;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export function MilestoneBadge({
  name,
  description,
  completed,
  completedAt,
  size = "md",
  showTooltip = true,
}: MilestoneBadgeProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const badge = (
    <div
      className={cn(
        "rounded-full flex items-center justify-center transition-all duration-300",
        sizeClasses[size],
        completed
          ? "bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/20"
          : "bg-muted border-2 border-dashed border-muted-foreground/30"
      )}
    >
      {completed ? (
        <Trophy className={cn(iconSizes[size], "text-white")} />
      ) : (
        <Target className={cn(iconSizes[size], "text-muted-foreground/50")} />
      )}
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
            {completed && completedAt && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Completed {new Date(completedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface MilestoneProgressProps {
  completed: number;
  total: number;
  size?: "sm" | "md" | "lg";
}

export function MilestoneProgress({ completed, total, size = "md" }: MilestoneProgressProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full flex items-center justify-center border-2 border-background",
              size === "sm" && "w-6 h-6",
              size === "md" && "w-8 h-8",
              size === "lg" && "w-10 h-10",
              i < completed
                ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                : "bg-muted"
            )}
          >
            {i < completed ? (
              <Star className={cn(
                size === "sm" && "w-3 h-3",
                size === "md" && "w-4 h-4",
                size === "lg" && "w-5 h-5",
                "text-white fill-white"
              )} />
            ) : (
              <div className={cn(
                size === "sm" && "w-2 h-2",
                size === "md" && "w-2.5 h-2.5",
                size === "lg" && "w-3 h-3",
                "rounded-full bg-muted-foreground/30"
              )} />
            )}
          </div>
        ))}
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        {completed}/{total}
      </span>
    </div>
  );
}
