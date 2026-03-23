"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, X, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Tip {
  id: string;
  title: string;
  content: string;
  category: "general" | "keyboard" | "feature" | "productivity";
}

const TIPS: Tip[] = [
  {
    id: "1",
    title: "Keyboard Shortcuts",
    content: "Press '?' to see all available keyboard shortcuts. Use 'g' then 'd' to go to dashboard quickly!",
    category: "keyboard",
  },
  {
    id: "2",
    title: "Quick Navigation",
    content: "Press 'g' followed by 'a' to jump to assignments, or 'g' then 'm' for messages.",
    category: "keyboard",
  },
  {
    id: "3",
    title: "Theme Switching",
    content: "Go to Settings to switch between Light, Dark, or System theme preferences.",
    category: "feature",
  },
  {
    id: "4",
    title: "Assignment Filters",
    content: "Use the tabs on the Assignments page to filter by status: Pending, Submitted, Graded, or Overdue.",
    category: "feature",
  },
  {
    id: "5",
    title: "Calendar Export",
    content: "Export your schedule to iCal format from the Calendar page to sync with your favorite calendar app.",
    category: "productivity",
  },
  {
    id: "6",
    title: "Notification Center",
    content: "Click the bell icon in the sidebar to see all your notifications in one place.",
    category: "feature",
  },
  {
    id: "7",
    title: "Streak Tracking",
    content: "Visit your Analytics page to see your learning streak and stay motivated!",
    category: "productivity",
  },
  {
    id: "8",
    title: "Achievement Badges",
    content: "Complete tasks and maintain streaks to earn achievement badges. View them in your Achievements page!",
    category: "feature",
  },
  {
    id: "9",
    title: "Bulk Actions",
    content: "Select multiple assignments to mark them as read or perform other bulk actions.",
    category: "productivity",
  },
  {
    id: "10",
    title: "Dark Mode",
    content: "Working late? Switch to Dark Mode in Settings to reduce eye strain.",
    category: "general",
  },
];

const STORAGE_KEY = "tips_dismissed_at";
const TIP_INTERVAL = 5 * 60 * 1000; // Show tip every 5 minutes

export function TipsWidget() {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if tips were recently dismissed
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const timeSinceDismiss = Date.now() - parseInt(dismissedAt);
      if (timeSinceDismiss < TIP_INTERVAL) {
        setIsDismissed(true);
        // Show again after interval
        const timeout = setTimeout(() => {
          setIsDismissed(false);
          setIsVisible(true);
        }, TIP_INTERVAL - timeSinceDismiss);
        return () => clearTimeout(timeout);
      }
    }

    // Show first tip after delay
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, 30000); // Show after 30 seconds

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isVisible || isDismissed) return;

    // Rotate tips every 2 minutes
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isVisible, isDismissed]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }, []);

  const nextTip = useCallback(() => {
    setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
  }, []);

  const prevTip = useCallback(() => {
    setCurrentTipIndex((prev) => (prev - 1 + TIPS.length) % TIPS.length);
  }, []);

  const currentTip = TIPS[currentTipIndex];

  if (!isVisible || isDismissed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 left-4 z-50 gap-2 md:bottom-4"
      >
        <Lightbulb className="h-4 w-4" />
        Tips
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, x: -20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: 20, x: -20 }}
        className="fixed bottom-20 left-4 z-50 w-80 md:bottom-4"
      >
        <Card className="border-2 border-yellow-500/20 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-yellow-500/10">
                  <Lightbulb className="h-4 w-4 text-yellow-600" />
                </div>
                <span className="text-xs font-medium text-yellow-600 uppercase tracking-wider">
                  Did you know?
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={dismiss}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            <h4 className="font-semibold text-sm mb-1">{currentTip.title}</h4>
            <p className="text-xs text-muted-foreground mb-3">
              {currentTip.content}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {TIPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 w-1 rounded-full ${
                      i === currentTipIndex ? "bg-yellow-500" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={prevTip}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={nextTip}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
