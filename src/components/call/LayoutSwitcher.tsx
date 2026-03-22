"use client";

import {
  LayoutGrid,
  Users,
  Presentation,
  Maximize2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type CallLayout = "spotlight" | "grid" | "sidebar";

interface LayoutSwitcherProps {
  currentLayout: CallLayout;
  onLayoutChange: (layout: CallLayout) => void;
  className?: string;
}

const layouts: { value: CallLayout; label: string; icon: React.ElementType }[] = [
  { value: "spotlight", label: "Spotlight", icon: Maximize2 },
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "sidebar", label: "Sidebar", icon: Presentation },
];

export function LayoutSwitcher({
  currentLayout,
  onLayoutChange,
  className,
}: LayoutSwitcherProps) {
  const current = layouts.find((l) => l.value === currentLayout);
  const Icon = current?.icon || LayoutGrid;

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                className={cn(
                  "group relative flex h-12 w-12 items-center justify-center rounded-2xl",
                  "transition-all duration-150 focus-visible:outline-none",
                  "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white",
                  "border border-white/5 hover:border-white/15"
                )}
              />
            }
          >
            <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Change layout</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align="center"
          className="glass-strong border-white/10 min-w-[160px]"
        >
          {layouts.map((layout) => {
            const LayoutIcon = layout.icon;
            return (
              <DropdownMenuItem
                key={layout.value}
                onClick={() => onLayoutChange(layout.value)}
                className={cn(
                  "flex items-center gap-3 cursor-pointer",
                  "text-white/80 hover:text-white focus:text-white",
                  "hover:bg-white/10 focus:bg-white/10",
                  currentLayout === layout.value && "bg-white/10 text-white"
                )}
              >
                <LayoutIcon className="h-4 w-4" />
                <span>{layout.label}</span>
                {currentLayout === layout.value && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}

interface LayoutButtonProps {
  layout: CallLayout;
  isActive: boolean;
  onClick: () => void;
}

export function LayoutButton({ layout, isActive, onClick }: LayoutButtonProps) {
  const config = layouts.find((l) => l.value === layout);
  if (!config) return null;

  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200",
        isActive
          ? "bg-white/15 text-white"
          : "text-white/50 hover:text-white/80 hover:bg-white/5"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{config.label}</span>
    </button>
  );
}
