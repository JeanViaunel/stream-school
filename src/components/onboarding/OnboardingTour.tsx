"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronRight, ChevronLeft, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  action?: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='dashboard']",
    title: "Welcome to Your Dashboard",
    content: "This is your home base. See upcoming sessions, assignments, and your schedule at a glance.",
    placement: "bottom",
  },
  {
    target: "[data-tour='up-next']",
    title: "Up Next",
    content: "Never miss a thing! This section shows your next session or assignment that needs attention.",
    placement: "right",
  },
  {
    target: "[data-tour='sidebar']",
    title: "Navigation Sidebar",
    content: "Access all your classes, messages, and settings from here. Look for the notification bell for updates!",
    placement: "right",
  },
  {
    target: "[data-tour='assignments']",
    title: "Your Assignments",
    content: "Track all your assignments across classes. Filter by status: pending, submitted, graded, or overdue.",
    placement: "bottom",
  },
  {
    target: "[data-tour='analytics']",
    title: "Track Your Progress",
    content: "Visit your analytics page to see your learning streak, grade distribution, and weekly activity.",
    placement: "left",
  },
];

const STORAGE_KEY = "onboarding_completed";

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Delay start to let page render
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isActive && currentStep < TOUR_STEPS.length) {
      const step = TOUR_STEPS[currentStep];
      const element = document.querySelector(step.target);
      setTargetElement(element);
      
      if (element) {
        // Scroll element into view
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        
        // Highlight element
        element.classList.add("tour-highlight");
        
        return () => {
          element.classList.remove("tour-highlight");
        };
      }
    }
  }, [isActive, currentStep]);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
    
    // Execute any final action
    const finalStep = TOUR_STEPS[currentStep];
    if (finalStep?.action) {
      finalStep.action();
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  if (!isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={restartTour}
        className="fixed bottom-20 right-4 z-50 gap-2 md:bottom-4"
      >
        <Sparkles className="h-4 w-4" />
        Restart Tour
      </Button>
    );
  }

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 pointer-events-none" />
      
      {/* Tour Popup */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed z-50"
          style={{
            // Position near target element or center if not found
            ...(targetElement
              ? getPosition(targetElement, step.placement || "bottom")
              : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }),
          }}
        >
          <Card className="w-80 shadow-xl border-2 border-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Step {currentStep + 1} of {TOUR_STEPS.length}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={skipTour}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{step.content}</p>
              
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i === currentStep ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                
                <Button size="sm" onClick={nextStep}>
                  {isLastStep ? "Finish" : "Next"}
                  {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function getPosition(element: Element, placement: string): React.CSSProperties {
  const rect = element.getBoundingClientRect();
  const spacing = 16;
  
  switch (placement) {
    case "top":
      return {
        top: rect.top - spacing,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
      };
    case "bottom":
      return {
        top: rect.bottom + spacing,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
      };
    case "left":
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - spacing,
        transform: "translate(-100%, -50%)",
      };
    case "right":
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + spacing,
        transform: "translateY(-50%)",
      };
    default:
      return {
        top: rect.bottom + spacing,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
      };
  }
}
