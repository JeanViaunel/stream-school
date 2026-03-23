"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "color-coded";
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  size = "md",
  variant = "color-coded",
  className,
}: ProgressBarProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));
  
  // Determine color based on value for color-coded variant
  const getColorClass = () => {
    if (variant !== "color-coded") return "bg-primary";
    if (clampedValue >= 80) return "bg-emerald-500";
    if (clampedValue >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-sm font-medium text-foreground">{label}</span>
          )}
          {showPercentage && (
            <span className={cn(
              "text-sm font-semibold",
              variant === "color-coded" && clampedValue >= 80 && "text-emerald-600",
              variant === "color-coded" && clampedValue >= 60 && clampedValue < 80 && "text-yellow-600",
              variant === "color-coded" && clampedValue < 60 && "text-red-600",
              variant === "default" && "text-foreground"
            )}>
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", sizeClasses[size])}>
        <div
          className={cn("h-full transition-all duration-500 ease-out rounded-full", getColorClass())}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
