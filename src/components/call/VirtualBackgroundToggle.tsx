"use client";

import { useState, useEffect } from "react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";
import { Camera, Blur, Image, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";

const PRESET_BACKGROUNDS = [
  { name: "Classroom", url: "/backgrounds/classroom.jpg", icon: "🏫" },
  { name: "Office", url: "/backgrounds/office.jpg", icon: "🏢" },
  { name: "Library", url: "/backgrounds/library.jpg", icon: "📚" },
  { name: "Nature", url: "/backgrounds/nature.jpg", icon: "🌳" },
  { name: "Space", url: "/backgrounds/space.jpg", icon: "🚀" },
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
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const isCameraOn = !isCameraMuted;

  // Check if browser supports background effects
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Check for background blur support
        if (typeof camera?.toggleBackgroundBlur === "function") {
          setIsSupported(true);
        } else {
          // Try to detect support through capabilities
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities?.() || {};
          
          // Clean up
          track.stop();
          stream.getTracks().forEach(t => t.stop());
          
          // Check for background removal support (Chrome 94+ with specific flags)
          setIsSupported("backgroundBlur" in capabilities || "backgroundReplacement" in capabilities);
        }
      } catch {
        setIsSupported(false);
      }
    };

    checkSupport();
  }, [camera]);

  const handleToggleBlur = async () => {
    if (!camera) return;
    
    try {
      if (state.mode === "blur") {
        // Turn off blur
        await camera.toggleBackgroundBlur?.();
        setState({ mode: "none", imageUrl: null });
      } else {
        // Turn on blur
        await camera.toggleBackgroundBlur?.();
        setState({ mode: "blur", imageUrl: null });
      }
    } catch (error) {
      console.error("Failed to toggle background blur:", error);
    }
  };

  const handleSetBackground = async (url: string) => {
    if (!camera) return;

    try {
      // Disable blur if active
      if (state.mode === "blur") {
        await camera.toggleBackgroundBlur?.();
      }
      
      await camera.setBackgroundImage?.(url);
      setState({ mode: "image", imageUrl: url });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to set background image:", error);
    }
  };

  const handleClearBackground = async () => {
    if (!camera) return;

    try {
      if (state.mode === "blur") {
        await camera.toggleBackgroundBlur?.();
      } else if (state.mode === "image") {
        await camera.setBackgroundImage?.(null);
      }
      setState({ mode: "none", imageUrl: null });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to clear background:", error);
    }
  };

  // Don't show if camera is off or background effects aren't supported
  if (!isCameraOn || isSupported === false) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
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
            </PopoverTrigger>
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
                    <Blur className="h-5 w-5" />
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

                {isSupported === null && (
                  <p className="text-xs text-white/40 text-center">
                    Checking browser support...
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Virtual Background</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
