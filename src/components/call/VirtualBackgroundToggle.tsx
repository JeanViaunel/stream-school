"use client";

import { useState, useEffect, useCallback } from "react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";
import { Camera, Sparkles } from "lucide-react";
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
  const { useCameraState } = useCallStateHooks();
  const { camera, isMute: isCameraMuted } = useCameraState();
  const [state, setState] = useState<VirtualBackgroundState>({
    mode: "none",
    imageUrl: null,
  });
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);

  const isCameraOn = !isCameraMuted;

  // Check if browser supports background effects
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        const hasWebGL = !!gl;
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        track.stop();
        stream.getTracks().forEach(t => t.stop());
        
        setIsSupported(hasWebGL);
      } catch {
        setIsSupported(false);
      }
    };

    if (isCameraOn) {
      checkSupport();
    }
  }, [isCameraOn]);

  // Apply background blur using CSS/Canvas fallback approach
  const applyBlur = useCallback(async (enabled: boolean) => {
    try {
      const videoElement = document.querySelector("video[data-testid='camera-video']") as HTMLVideoElement;
      if (!videoElement) return;

      if (enabled) {
        videoElement.style.filter = "blur(8px)";
        const parent = videoElement.parentElement;
        if (parent) {
          parent.style.overflow = "hidden";
          parent.style.borderRadius = "12px";
        }
      } else {
        videoElement.style.filter = "";
      }
    } catch (error) {
      console.error("Failed to apply blur:", error);
    }
  }, []);

  // Apply background image using CSS approach
  const applyBackgroundImage = useCallback(async (url: string | null) => {
    try {
      const videoElement = document.querySelector("video[data-testid='camera-video']") as HTMLVideoElement;
      if (!videoElement) return;

      const parent = videoElement.parentElement;
      if (!parent) return;

      if (url) {
        let bgLayer = parent.querySelector(".virtual-background-layer") as HTMLElement;
        if (!bgLayer) {
          bgLayer = document.createElement("div");
          bgLayer.className = "virtual-background-layer";
          bgLayer.style.cssText = `
            position: absolute;
            inset: 0;
            background-size: cover;
            background-position: center;
            z-index: 0;
          `;
          parent.insertBefore(bgLayer, videoElement);
        }
        bgLayer.style.backgroundImage = `url(${url})`;
        videoElement.style.mixBlendMode = "multiply";
        videoElement.style.opacity = "0.9";
      } else {
        const bgLayer = parent.querySelector(".virtual-background-layer");
        if (bgLayer) {
          bgLayer.remove();
        }
        videoElement.style.mixBlendMode = "";
        videoElement.style.opacity = "";
      }
    } catch (error) {
      console.error("Failed to apply background:", error);
    }
  }, []);

  const handleToggleBlur = async () => {
    if (state.mode === "blur") {
      await applyBlur(false);
      setState({ mode: "none", imageUrl: null });
    } else {
      if (state.mode === "image") {
        await applyBackgroundImage(null);
      }
      await applyBlur(true);
      setState({ mode: "blur", imageUrl: null });
    }
  };

  const handleSetBackground = async (url: string) => {
    if (state.mode === "blur") {
      await applyBlur(false);
    }
    
    await applyBackgroundImage(url);
    setState({ mode: "image", imageUrl: url });
    setIsOpen(false);
  };

  const handleClearBackground = async () => {
    if (state.mode === "blur") {
      await applyBlur(false);
    } else if (state.mode === "image") {
      await applyBackgroundImage(null);
    }
    setState({ mode: "none", imageUrl: null });
    setIsOpen(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.mode === "blur") {
        applyBlur(false);
      } else if (state.mode === "image") {
        applyBackgroundImage(null);
      }
    };
  }, [state.mode, applyBlur, applyBackgroundImage]);

  // Don't show if camera is off
  if (!isCameraOn) {
    return null;
  }

  const triggerButton = (
    <button
      className={cn(
        "group relative flex h-14 w-14 items-center justify-center rounded-2xl",
        "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        state.mode !== "none"
          ? "bg-purple-500/30 text-purple-400 border border-purple-500/40"
          : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 hover:border-white/15"
      )}
    >
      <Camera className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
    </button>
  );

  return (
    <TooltipProvider>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger render={triggerButton} />
          <TooltipContent side="top">
            <p>Virtual Background</p>
          </TooltipContent>
        </Tooltip>
        <PopoverTrigger>{triggerButton}</PopoverTrigger>
        <PopoverContent 
          align="center" 
          side="top" 
          className="w-72 p-4 glass-strong border-white/10"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">
                Virtual Background
              </h4>
              {state.mode !== "none" && (
                <button
                  onClick={handleClearBackground}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Blur toggle */}
            <button
              onClick={handleToggleBlur}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-150",
                state.mode === "blur"
                  ? "bg-purple-500/20 border-purple-500/40 text-white"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Background Blur</span>
              {state.mode === "blur" && (
                <span className="ml-auto text-purple-400">✓</span>
              )}
            </button>

            {/* Preset backgrounds */}
            <div className="space-y-2">
              <p className="text-xs text-white/50">Preset Backgrounds</p>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.url}
                    onClick={() => handleSetBackground(bg.url)}
                    className={cn(
                      "group relative aspect-video rounded-lg border overflow-hidden transition-all duration-150",
                      state.mode === "image" && state.imageUrl === bg.url
                        ? "border-purple-500 ring-2 ring-purple-500/30"
                        : "border-white/10 hover:border-white/30"
                    )}
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900/80 to-purple-900/80">
                      <span className="text-2xl">{bg.icon}</span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1">
                      <p className="text-[10px] text-white text-center truncate px-1">
                        {bg.name}
                      </p>
                    </div>
                    {state.mode === "image" && state.imageUrl === bg.url && (
                      <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-purple-500 flex items-center justify-center">
                        <span className="text-[10px] text-white">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {!isSupported && (
              <p className="text-xs text-white/40 text-center">
                Some effects may not be fully supported in your browser
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
