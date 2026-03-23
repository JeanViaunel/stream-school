"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  MessageSquare,
  Settings,
  User,
  X,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  link: string;
  completed: boolean;
}

const STORAGE_KEY = "welcome_checklist";

export function WelcomeChecklist() {
  const { session } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: "profile",
      label: "Complete your profile",
      description: "Add a bio and update your information",
      icon: User,
      link: "/profile",
      completed: false,
    },
    {
      id: "classes",
      label: "Join your first class",
      description: "Use a join code to enroll in a class",
      icon: BookOpen,
      link: "/dashboard",
      completed: false,
    },
    {
      id: "assignments",
      label: "View your assignments",
      description: "Check out upcoming assignments",
      icon: GraduationCap,
      link: "/assignments",
      completed: false,
    },
    {
      id: "messages",
      label: "Send a message",
      description: "Connect with classmates or teachers",
      icon: MessageSquare,
      link: "/messages",
      completed: false,
    },
    {
      id: "settings",
      label: "Customize settings",
      description: "Set your preferences and notifications",
      icon: Settings,
      link: "/settings",
      completed: false,
    },
  ]);

  useEffect(() => {
    // Load saved progress
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          completed: parsed[item.id] || false,
        }))
      );
    }
    
    // Check if checklist was dismissed
    const dismissed = localStorage.getItem(`${STORAGE_KEY}_dismissed`);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const toggleItem = (id: string) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      
      // Save progress
      const progress = updated.reduce(
        (acc, item) => ({ ...acc, [item.id]: item.completed }),
        {}
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      
      return updated;
    });
  };

  const dismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(`${STORAGE_KEY}_dismissed`, "true");
    setTimeout(() => setIsVisible(false), 300);
  };

  const completedCount = items.filter((item) => item.completed).length;
  const progress = (completedCount / items.length) * 100;

  if (!isVisible || !session) return null;

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6"
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Welcome to StreamSchool!
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete these steps to get started
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={dismiss}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Progress value={progress} className="flex-1" />
                <span className="text-sm font-medium text-muted-foreground">
                  {completedCount}/{items.length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        item.completed ? "bg-muted/50" : "hover:bg-muted"
                      }`}
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => toggleItem(item.id)}
                        id={item.id}
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={item.id}
                          className={`font-medium text-sm cursor-pointer ${
                            item.completed ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {item.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <Link href={item.link}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Icon className="h-4 w-4" />
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
