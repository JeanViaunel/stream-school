"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  showStrength?: boolean;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  autoComplete,
  disabled,
  showStrength = false,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const hasValue = value.length > 0;
  const isFloating = isFocused || hasValue;

  // Password strength calculation
  const getStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    const levels = [
      { label: "Very weak", color: "oklch(0.65 0.22 27)" },
      { label: "Weak", color: "oklch(0.70 0.18 45)" },
      { label: "Fair", color: "oklch(0.75 0.15 85)" },
      { label: "Good", color: "oklch(0.72 0.16 160)" },
      { label: "Strong", color: "oklch(0.65 0.20 145)" },
    ];
    
    return { score, ...levels[score] };
  };

  const strength = getStrength(value);

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Lock icon */}
        <motion.div 
          initial={false}
          animate={{ 
            color: isFocused ? "oklch(0.672 0.200 268)" : "oklch(0.520 0.044 268)"
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </motion.div>
        
        {/* Floating label */}
        <motion.label
          htmlFor={id}
          initial={false}
          animate={{
            y: isFloating ? -28 : 0,
            scale: isFloating ? 0.85 : 1,
            color: isFloating 
              ? (isFocused ? "oklch(0.672 0.200 268)" : "oklch(0.520 0.044 268)")
              : "oklch(0.520 0.044 268)",
          }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-12 top-1/2 -translate-y-1/2 origin-left pointer-events-none font-medium text-sm"
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </motion.label>

        {/* Input */}
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isFloating ? placeholder : ""}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`
            w-full h-12 rounded-xl border bg-card/60 backdrop-blur-sm
            transition-all duration-200 ease-out
            pl-12 pr-12
            ${error 
              ? "border-destructive/50 focus:border-destructive focus:ring-2 focus:ring-destructive/20" 
              : "border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            focus:outline-none focus:bg-card
          `}
        />

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          tabIndex={-1}
        >
          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {/* Password strength indicator */}
      {showStrength && hasValue && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-1.5"
        >
          <div className="flex gap-1 h-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: i < strength.score ? strength.color : "oklch(0.2 0.02 268)",
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Password strength</span>
            <span style={{ color: strength.color }}>{strength.label}</span>
          </div>
        </motion.div>
      )}

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-destructive text-xs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}
