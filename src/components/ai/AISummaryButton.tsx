"use client";

import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, Wand2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionSummary } from "./SessionSummary";
import { useToast } from "@/hooks/use-toast";

interface AISummaryButtonProps {
  sessionId: Id<"sessions">;
  existingSummary?: string;
  existingKeyPoints?: string[];
  generatedAt?: number;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onSummaryGenerated?: (summary: string, keyPoints: string[]) => void;
}

export function AISummaryButton({
  sessionId,
  existingSummary,
  existingKeyPoints,
  generatedAt,
  variant = "outline",
  size = "default",
  className,
  onSummaryGenerated,
}: AISummaryButtonProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState(existingSummary);
  const [keyPoints, setKeyPoints] = useState(existingKeyPoints);
  const [lastGenerated, setLastGenerated] = useState(generatedAt);

  const generateSummary = useAction(api.ai.generateSessionSummary);
  const summarizeChat = useAction(api.ai.summarizeChat);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      // First try the main summarize action
      const result = await summarizeChat({ sessionId });
      
      setSummary(result.summary);
      setKeyPoints(result.keyPoints);
      setLastGenerated(Date.now());
      
      if (onSummaryGenerated) {
        onSummaryGenerated(result.summary, result.keyPoints);
      }
      
      toast({
        title: "Summary Generated",
        description: "Session summary has been created successfully",
      });
    } catch (err) {
      console.error("Failed to generate summary:", err);
      toast({
        title: "Generation Failed",
        description: err instanceof Error ? err.message : "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [sessionId, summarizeChat, onSummaryGenerated, toast]);

  const hasSummary = !!summary;

  if (hasSummary) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant={variant} size={size} className={cn("gap-2", className)}>
            <FileText className="h-4 w-4" />
            View Summary
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Session Summary
            </DialogTitle>
            <DialogDescription>
              AI-generated summary of the class session
            </DialogDescription>
          </DialogHeader>
          
          <SessionSummary
            sessionId={sessionId}
            summary={summary}
            keyPoints={keyPoints}
            generatedAt={lastGenerated}
            isTeacher={true}
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleGenerate}
      disabled={isGenerating}
      className={cn("gap-2", className)}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Generate Summary
        </>
      )}
    </Button>
  );
}
