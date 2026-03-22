"use client";

import { useState, useRef, useEffect } from "react";
import { useCallStateHooks, ParticipantView } from "@stream-io/video-react-sdk";
import { Move, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelfViewProps {
  className?: string;
}

export function SelfView({ className }: SelfViewProps) {
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const [isPinned, setIsPinned] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Initialize position to bottom-right
  useEffect(() => {
    setPosition({
      x: window.innerWidth - 240,
      y: window.innerHeight - 180,
    });
  }, []);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPinned) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Constrain position within viewport
  useEffect(() => {
    const updatePosition = () => {
      const maxX = window.innerWidth - 240;
      const maxY = window.innerHeight - 180;
      setPosition((prev) => ({
        x: Math.max(10, Math.min(prev.x, maxX)),
        y: Math.max(10, Math.min(prev.y, maxY)),
      }));
    };

    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  return (
    <div
      ref={dragRef}
      className={cn(
        "fixed z-30 rounded-2xl overflow-hidden border-2 transition-all duration-200 shadow-2xl",
        isDragging ? "cursor-grabbing scale-105" : "cursor-grab hover:scale-[1.02]",
        isPinned ? "border-purple-500/50" : "border-white/20 hover:border-white/40",
        localParticipant?.isSpeaking && "border-emerald-500/50 shadow-emerald-500/20",
        className
      )}
      style={{
        width: 200,
        height: 150,
        right: isPinned ? "auto" : undefined,
        bottom: isPinned ? "auto" : undefined,
        ...(!isPinned && { left: position.x, top: position.y }),
        ...(isPinned && { right: 20, bottom: 100 }),
      }}
      onMouseDown={handleMouseDown}
    >
      {localParticipant && (
        <ParticipantView
          participant={localParticipant}
          className="w-full h-full"
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsPinned(!isPinned);
          }}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            isPinned
              ? "bg-purple-500/50 text-white"
              : "bg-black/40 text-white/60 hover:text-white hover:bg-black/60"
          )}
        >
          {isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
        </button>
      </div>

      {/* Label */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="text-xs text-white/80 font-medium">You</span>
        {localParticipant?.isSpeaking && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </div>

      {/* Drag hint */}
      {!isPinned && (
        <div className="absolute top-2 left-2 opacity-0 hover:opacity-100 transition-opacity">
          <Move className="h-3 w-3 text-white/40" />
        </div>
      )}
    </div>
  );
}
