"use client";

import { Button } from "@/components/ui/button";
import { MicOff } from "lucide-react";

interface MuteAllButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function MuteAllButton({ onClick, disabled }: MuteAllButtonProps) {
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2"
    >
      <MicOff className="w-4 h-4" />
      Mute All
    </Button>
  );
}
