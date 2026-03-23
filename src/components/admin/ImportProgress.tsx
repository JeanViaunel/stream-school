"use client";

import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ImportProgressProps {
  current: number;
  total: number;
  status: "validating" | "importing" | "complete" | "error";
}

export function ImportProgress({ current, total, status }: ImportProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  const getStatusMessage = () => {
    switch (status) {
      case "validating":
        return `Validating ${current} of ${total} rows...`;
      case "importing":
        return `Importing ${current} of ${total} students...`;
      case "complete":
        return `Import complete! ${current} of ${total} students imported.`;
      case "error":
        return "Import failed. Please check the errors below.";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{getStatusMessage()}</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <Progress 
        value={percentage} 
        className={status === "error" ? "bg-destructive/20" : undefined}
      />
      {(status === "validating" || status === "importing") && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Please wait...
        </div>
      )}
    </div>
  );
}
