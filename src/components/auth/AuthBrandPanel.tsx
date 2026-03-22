"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface FloatingParticle {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
}

const particles: FloatingParticle[] = [
  { id: 1, size: 4, x: 15, y: 20, duration: 20, delay: 0 },
  { id: 2, size: 3, x: 75, y: 35, duration: 25, delay: 2 },
  { id: 3, size: 5, x: 45, y: 60, duration: 18, delay: 1 },
  { id: 4, size: 2, x: 85, y: 75, duration: 22, delay: 3 },
  { id: 5, size: 4, x: 25, y: 80, duration: 24, delay: 1.5 },
  { id: 6, size: 3, x: 65, y: 15, duration: 19, delay: 0.5 },
  { id: 7, size: 2, x: 90, y: 45, duration: 21, delay: 2.5 },
  { id: 8, size: 5, x: 10, y: 55, duration: 23, delay: 4 },
];

interface AuthBrandPanelProps {
  headline: ReactNode;
  subheadline: string;
  features: { icon: React.ElementType; label: string }[];
  showSocialProof?: boolean;
}

export function AuthBrandPanel({ 
  headline, 
  subheadline, 
  features,
  showSocialProof = false 
}: AuthBrandPanelProps) {
  return (
    <div 
      className="relative flex flex-col justify-between h-full p-12 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #090715 0%, #0e0b22 50%, #13082e 100%)" }}
    >
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-30"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, oklch(0.672 0.200 268 / 15%) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, oklch(0.620 0.180 290 / 12%) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, oklch(0.700 0.160 260 / 10%) 0%, transparent 60%)
            `,
          }}
        />
      </div>

      {/* Atmospheric glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-[520px] w-[520px] rounded-full blur-[140px]"
        style={{ background: "oklch(0.672 0.200 268 / 12%)" }} />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-[420px] w-[420px] rounded-full blur-[120px]"
        style={{ background: "oklch(0.620 0.180 290 / 8%)" }} />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        style={{ background: "oklch(0.700 0.160 260 / 6%)" }} />

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.2, 0.6, 0.2],
            y: [0, -30, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            background: "oklch(0.672 0.200 268 / 40%)",
            boxShadow: `0 0 ${particle.size * 3}px oklch(0.672 0.200 268 / 30%)`,
          }}
        />
      ))}

      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ 
          backgroundImage: "linear-gradient(oklch(0.940 0.016 268) 1px, transparent 1px), linear-gradient(90deg, oklch(0.940 0.016 268) 1px, transparent 1px)", 
          backgroundSize: "40px 40px" 
        }} />

      {/* Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative z-10 flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/8 backdrop-blur-sm hover-lift">
          <span className="font-bold text-xl text-white" style={{ fontFamily: "var(--font-syne)" }}>S</span>
        </div>
        <span className="font-semibold text-white/85 text-base" style={{ fontFamily: "var(--font-syne)" }}>
          Stream School
        </span>
      </motion.div>

      {/* Headline */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10"
      >
        <h2 className="font-extrabold text-white leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(2.8rem, 4vw, 3.8rem)" }}>
          {headline}
        </h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-6 text-white/40 text-base leading-relaxed max-w-72"
        >
          {subheadline}
        </motion.p>
      </motion.div>

      {/* Feature cards with auto-rotation */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative z-10"
      >
        <FeatureCarousel features={features} />
      </motion.div>
    </div>
  );
}

function FeatureCarousel({ features }: { features: { icon: React.ElementType; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {features.map(({ icon: Icon, label }, index) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            delay: 0.6 + index * 0.1, 
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1]
          }}
          whileHover={{ scale: 1.05, y: -2 }}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 backdrop-blur-sm cursor-default"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: index * 0.5 }}
          >
            <Icon className="h-3.5 w-3.5 text-white/50" />
          </motion.div>
          <span className="text-xs font-medium text-white/55">{label}</span>
        </motion.div>
      ))}
    </div>
  );
}
