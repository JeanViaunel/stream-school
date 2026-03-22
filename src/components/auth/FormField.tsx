"use client";

import { useState, ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  suffix?: ReactNode;
}

export function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  error,
  required,
  autoComplete,
  disabled,
  suffix,
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const isPassword = type === "password";
  const inputType = isPassword ? (isPasswordVisible ? "text" : "password") : type;
  const hasValue = value.length > 0;
  const isFloating = isFocused || hasValue;

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Icon prefix */}
        {icon && (
          <motion.div 
            initial={false}
            animate={{ 
              color: isFocused ? "oklch(0.672 0.200 268)" : "oklch(0.520 0.044 268)"
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors duration-200"
          >
            {icon}
          </motion.div>
        )}
        
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
          className="absolute left-4 top-1/2 -translate-y-1/2 origin-left pointer-events-none font-medium text-sm"
          style={{ left: icon ? "48px" : "16px" }}
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </motion.label>

        {/* Input */}
        <input
          id={id}
          type={inputType}
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
            ${icon ? "pl-12" : "pl-4"}
            ${suffix || (isPassword && !suffix) ? "pr-12" : "pr-4"}
            ${error 
              ? "border-destructive/50 focus:border-destructive focus:ring-2 focus:ring-destructive/20" 
              : "border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            focus:outline-none focus:bg-card
          `}
        />

        {/* Password toggle or custom suffix */}
        {isPassword && !suffix && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            tabIndex={-1}
          >
            {isPasswordVisible ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        )}
        
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -5, height: 0 }}
          className="flex items-center gap-1.5 text-destructive text-xs"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}
