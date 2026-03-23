"use client";

import { useState, useCallback } from "react";
import { useBackgroundFilters } from "@stream-io/video-react-sdk";
import { Camera, Sparkles, X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PRESET_BACKGROUNDS = [
  { name: "Classroom", url: "/backgrounds/classroom.svg", icon: "🏫" },
  { name: "Office", url: "/backgrounds/office.svg", icon: "🏢" },
  { name: "Library", url: "/backgrounds/library.svg", icon: "📚" },
  { name: "Nature", url: "/backgrounds/nature.svg", icon: "🌳" },
  { name: "Space", url: "/backgrounds/space.svg", icon: "🚀" },
];

type BackgroundMode = "none" | "blur" | "image";

interface VirtualBackgroundState {
  mode: BackgroundMode;
  imageUrl: string | null;
}

export function VirtualBackgroundToggle() {
  const {
    isSupported,
    isReady,
    isLoading,
    disableBackgroundFilter,
    applyBackgroundBlurFilter,
    applyBackgroundImageFilter,
    performance,
  } = useBackgroundFilters();

  const [state, setState] = useState<VirtualBackgroundState>({
    mode: "none",
    imageUrl: null,
  });
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleBlur = useCallback(async () => {
    if (state.mode === "blur") {
      await disableBackgroundFilter();
      setState({ mode: "none", imageUrl: null });
    } else {
      await applyBackgroundBlurFilter("medium");
      setState({ mode: "blur", imageUrl: null });
    }
  }, [state.mode, disableBackgroundFilter, applyBackgroundBlurFilter]);

  const handleSetBackground = useCallback(async (url: string) => {
    await applyBackgroundImageFilter(url);
    setState({ mode: "image", imageUrl: url });
    setIsOpen(false);
  }, [applyBackgroundImageFilter]);

  const handleClearBackground = useCallback(async () => {
    await disableBackgroundFilter();
    setState({ mode: "none", imageUrl: null });
    setIsOpen(false);
  }, [disableBackgroundFilter]);

  // Don't render if background filters are not supported
  if (!isSupported) {
    return null;
  }

  const triggerClassName = cn(
    "group relative flex h-14 w-14 items-center justify-center rounded-2xl",
    "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
    !isReady || isLoading
      ? "bg-white/5 text-white/30 cursor-not-allowed border border-white/5"
      : state.mode !== "none"
        ? "bg-purple-500/30 text-purple-400 border border-purple-500/40"
        : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 hover:border-white/15"
  );

  return (
    <TooltipProvider>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger>
                <button type="button" disabled={!isReady || isLoading} className={triggerClassName}>
                  {isLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Camera className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                  )}
                  {state.mode !== "none" && isReady && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                  )}
                </button>
              </PopoverTrigger>
            }
          />
          <TooltipContent side="top">
            <p>
              {!isReady
                ? "Initializing background filters..."
                : state.mode !== "none"
                  ? "Background effect active"
                  : "Virtual Background"}
            </p>
          </TooltipContent>
        </Tooltip>

        <PopoverContent 
          align="center" 
          side="top" 
          className="w-80 p-4 glass-strong border-white/10"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Virtual Background
              </h4>
              {state.mode !== "none" && (
                <button
                  onClick={handleClearBackground}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-6 text-white/60">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-purple-400 mr-3" />
                <span className="text-sm">Loading filters...</span>
              </div>
            )}

            {/* Performance warning */}
            {performance?.degraded && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                <p className="text-xs text-amber-400">
                  ⚠️ Performance degraded. Consider disabling background effects.
                </p>
              </div>
            )}

            {!isLoading && (
              <>
                {/* Blur toggle */}
                <button
                  onClick={handleToggleBlur}
                  disabled={!isReady}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-150",
                    state.mode === "blur"
                      ? "bg-purple-500/20 border-purple-500/40 text-white"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    state.mode === "blur" ? "bg-purple-500/20" : "bg-white/10"
                  )}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium block">Background Blur</span>
                    <span className="text-xs text-white/50">Medium intensity</span>
                  </div>
                  {state.mode === "blur" && (
                    <span className="text-purple-400 text-lg">✓</span>
                  )}
                </button>

                {/* Preset backgrounds */}
                <div className="space-y-2">
                  <p className="text-xs text-white/50 flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Preset Backgrounds
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.url}
                        onClick={() => handleSetBackground(bg.url)}
                        disabled={!isReady}
                        className={cn(
                          "group relative aspect-video rounded-lg border overflow-hidden transition-all duration-150",
                          state.mode === "image" && state.imageUrl === bg.url
                            ? "border-purple-500 ring-2 ring-purple-500/30"
                            : "border-white/10 hover:border-white/30 hover:scale-105"
                        )}
                      >
                        {/* Background preview */}
                        <div 
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${bg.url})` }}
                        />
                        
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                        
                        {/* Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl drop-shadow-lg">{bg.icon}</span>
                        </div>
                        
                        {/* Label */}
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1.5">
                          <p className="text-[10px] text-white text-center truncate px-1">
                            {bg.name}
                          </p>
                        </div>
                        
                        {/* Selected indicator */}
                        {state.mode === "image" && state.imageUrl === bg.url && (
                          <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                            <span className="text-[10px] text-white font-bold">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Browser support note */}
            <p className="text-xs text-white/40 text-center">
              Powered by Stream Video AI background segmentation
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
