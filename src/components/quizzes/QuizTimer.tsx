"use client";

import { useEffect, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { AlertCircle, Clock } from "lucide-react";

interface QuizTimerProps {
  attemptId: Id<"quizAttempts">;
  initialRemainingSeconds: number;
  totalSeconds: number;
  onTimeExpired: () => void;
  onTimeWarning?: (remainingSeconds: number) => void;
}

export function QuizTimer({
  attemptId,
  initialRemainingSeconds,
  totalSeconds,
  onTimeExpired,
  onTimeWarning,
}: QuizTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(initialRemainingSeconds);
  const [isPulsing, setIsPulsing] = useState(false);
  
  // Calculate percentage for progress bar
  const percentage = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));
  
  // Determine color based on time remaining
  const getColorClass = () => {
    if (remainingSeconds <= 60) return "text-red-600 bg-red-100 border-red-300";
    if (remainingSeconds <= 300) return "text-yellow-600 bg-yellow-100 border-yellow-300";
    return "text-blue-600 bg-blue-100 border-blue-300";
  };
  
  const getProgressColor = () => {
    if (remainingSeconds <= 60) return "bg-red-600";
    if (remainingSeconds <= 300) return "bg-yellow-500";
    return "bg-blue-600";
  };
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  
  // Handle time expiration
  const handleTimeExpired = useCallback(() => {
    onTimeExpired();
  }, [onTimeExpired]);
  
  // Timer effect
  useEffect(() => {
    if (remainingSeconds <= 0) {
      handleTimeExpired();
      return;
    }
    
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newValue = prev - 1;
        
        // Trigger warning callback at 5 minutes and 1 minute
        if (onTimeWarning) {
          if (newValue === 300 || newValue === 60) {
            onTimeWarning(newValue);
          }
        }
        
        // Start pulsing animation when under 1 minute
        if (newValue <= 60 && newValue > 0) {
          setIsPulsing(true);
        }
        
        return newValue;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [remainingSeconds, handleTimeExpired, onTimeWarning]);
  
  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 flex items-center gap-3 transition-all duration-300 ${
        isPulsing ? "animate-pulse" : ""
      } ${getColorClass()}`}
    >
      <div className="relative">
        {remainingSeconds <= 60 ? (
          <AlertCircle className="w-6 h-6" />
        ) : (
          <Clock className="w-6 h-6" />
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">
            {remainingSeconds <= 60
              ? "Time Almost Up!"
              : remainingSeconds <= 300
              ? "Time Running Low"
              : "Time Remaining"}
          </span>
          <span className="text-2xl font-bold tabular-nums">
            {formatTime(remainingSeconds)}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
