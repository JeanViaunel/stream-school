"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Command } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = "Search conversations...",
  className 
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showCommandK, setShowCommandK] = useState(true);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.getElementById("channel-search") as HTMLInputElement;
        input?.focus();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  return (
    <div className={cn("relative", className)}>
      <Search 
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
          isFocused ? "text-primary" : "text-muted-foreground"
        )} 
      />
      <Input
        id="channel-search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setIsFocused(true);
          setShowCommandK(false);
        }}
        onBlur={() => {
          setIsFocused(false);
          if (!value) setShowCommandK(true);
        }}
        placeholder={placeholder}
        className={cn(
          "pl-9 pr-12 h-10 bg-secondary/50 border-border/50 text-sm",
          "placeholder:text-muted-foreground/60",
          "transition-all duration-200 ease-out",
          "focus:bg-secondary focus:border-primary/30 focus:shadow-depth-1",
          isFocused && "scale-[1.02] shadow-depth-1"
        )}
      />
      <div 
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all duration-200",
          showCommandK && !value ? "opacity-100" : "opacity-0"
        )}
      >
        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border/50">
          <Command className="h-3 w-3" />
          <span>K</span>
        </kbd>
      </div>
    </div>
  );
}
