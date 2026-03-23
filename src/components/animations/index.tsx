"use client";

import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

const cardVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.95 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      delay: 0,
    }
  },
  hover: {
    y: -4,
    scale: 1.02,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
    }
  },
  tap: {
    scale: 0.98,
  }
};

export function AnimatedCard({ children, className = "", delay = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      variants={{
        ...cardVariants,
        animate: {
          ...cardVariants.animate,
          transition: {
            type: "spring" as const,
            stiffness: 300,
            damping: 30,
            delay,
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function AnimatedContainer({ 
  children, 
  className = "",
  staggerDelay = 0.1 
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({ 
  children, 
  className = "" 
}: AnimatedCardProps) {
  const itemVariants: Variants = {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.95,
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
      }
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// Fade in animation for sections
export function FadeIn({ 
  children, 
  className = "",
  delay = 0,
  direction = "up"
}: AnimatedCardProps & { direction?: "up" | "down" | "left" | "right" }) {
  const directions = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { y: 0, x: 20 },
    right: { y: 0, x: -20 },
  };

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        ...directions[direction]
      }}
      animate={{ 
        opacity: 1, 
        y: 0,
        x: 0,
      }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale animation for buttons and interactive elements
export function ScaleOnHover({ 
  children, 
  className = "" 
}: AnimatedCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring" as const, stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Pulse animation for notifications and badges
export function Pulse({ 
  children, 
  className = "" 
}: AnimatedCardProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide in animation for side panels
export function SlideIn({ 
  children, 
  className = "",
  from = "right"
}: AnimatedCardProps & { from?: "left" | "right" | "top" | "bottom" }) {
  const fromPositions = {
    left: { x: -100, y: 0 },
    right: { x: 100, y: 0 },
    top: { x: 0, y: -100 },
    bottom: { x: 0, y: 100 },
  };

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        ...fromPositions[from]
      }}
      animate={{ 
        opacity: 1, 
        x: 0,
        y: 0,
      }}
      transition={{
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Number counter animation
export function CountUp({ 
  value, 
  className = "" 
}: { value: number; className?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {value}
      </motion.span>
    </motion.span>
  );
}

// Loading skeleton with shimmer animation
export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`relative overflow-hidden bg-muted ${className}`}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
        }}
        animate={{
          translateX: ["0%", "200%"],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </motion.div>
  );
}
