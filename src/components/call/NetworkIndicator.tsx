"use client";

import { useState } from "react";
import {
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type NetworkQuality = "excellent" | "good" | "poor" | "unknown";

interface NetworkStats {
  latency: number;
  packetLoss: number;
  bitrate: number;
}

interface NetworkIndicatorProps {
  quality?: NetworkQuality;
  stats?: NetworkStats;
  className?: string;
}

const qualityConfig = {
  excellent: {
    icon: SignalHigh,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
    label: "Excellent",
  },
  good: {
    icon: SignalMedium,
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
    label: "Good",
  },
  poor: {
    icon: SignalLow,
    color: "text-red-400",
    bgColor: "bg-red-500/15",
    borderColor: "border-red-500/30",
    label: "Poor",
  },
  unknown: {
    icon: Signal,
    color: "text-white/40",
    bgColor: "bg-white/5",
    borderColor: "border-white/10",
    label: "Unknown",
  },
};

export function NetworkIndicator({
  quality = "unknown",
  stats,
  className,
}: NetworkIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const config = qualityConfig[quality];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          onClick={() => setShowDetails(!showDetails)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-200",
            config.bgColor,
            config.borderColor,
            className
          )}
        >
          <Icon className={cn("h-4 w-4", config.color)} />
          <span className={cn("text-xs font-medium", config.color)}>
            {config.label}
          </span>
          {quality === "poor" && (
            <AlertCircle className="h-3 w-3 text-red-400 animate-pulse" />
          )}
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="glass-strong border-white/10 p-4 min-w-[200px]"
        >
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Connection Stats</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/50">Latency</span>
                <span className="text-white/80 font-mono">
                  {stats?.latency ?? "--"} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Packet Loss</span>
                <span className="text-white/80 font-mono">
                  {stats?.packetLoss ?? "--"}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Bitrate</span>
                <span className="text-white/80 font-mono">
                  {stats?.bitrate ?? "--"} kbps
                </span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function NetworkBanner({
  quality,
}: {
  quality: NetworkQuality;
}) {
  if (quality !== "poor") return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 animate-slide-in-right">
      <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/20 backdrop-blur-md px-4 py-2 shadow-lg">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <span className="text-sm font-medium text-red-200">
          Poor connection - check your network
        </span>
      </div>
    </div>
  );
}
