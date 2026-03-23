"use client";

import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Calendar, 
  Sparkles, 
  Share2, 
  Download, 
  CheckCircle,
  AlertCircle,
  Loader2,
  KeyRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface SessionSummaryProps {
  sessionId: Id<"sessions">;
  summary?: string;
  keyPoints?: string[];
  generatedAt?: number;
  className?: string;
  isTeacher?: boolean;
  onGenerate?: () => void;
}

export function SessionSummary({
  sessionId,
  summary,
  keyPoints,
  generatedAt,
  className,
  isTeacher = false,
  onGenerate,
}: SessionSummaryProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleShare = useCallback(() => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      toast({
        title: "Summary copied",
        description: "Session summary copied to clipboard",
      });
    }
  }, [summary, toast]);

  const handleExport = useCallback(() => {
    if (!summary) return;
    
    const content = [
      "# Session Summary",
      "",
      `Generated: ${generatedAt ? format(generatedAt, "PPP") : "Unknown"}`,
      "",
      "## Overview",
      summary,
      "",
      "## Key Points",
      ...(keyPoints || []).map((point, i) => `${i + 1}. ${point}`),
    ].join("\n");

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-summary-${sessionId}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Summary exported",
      description: "Session summary downloaded as Markdown",
    });
  }, [summary, keyPoints, generatedAt, sessionId, toast]);

  const hasSummary = !!summary;

  if (!hasSummary) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-muted rounded-full">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">No Summary Available</h3>
              <p className="text-sm text-muted-foreground">
                {isTeacher
                  ? "Generate a summary of the session to share with students"
                  : "The teacher hasn't generated a summary for this session yet"}
              </p>
            </div>
            {isTeacher && onGenerate && (
              <Button onClick={onGenerate} className="mt-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Summary
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="border-b bg-muted/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Session Summary</CardTitle>
              {generatedAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Generated {format(generatedAt, "PPp")}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className={cn("px-4", isExpanded ? "h-[400px]" : "h-[200px]")}>
          <div className="py-4 space-y-4">
            {/* Summary Text */}
            <div className="prose prose-sm max-w-none">
              <p className="text-sm leading-relaxed">{summary}</p>
            </div>

            {/* Key Points */}
            {keyPoints && keyPoints.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Key Points
                </h4>
                <ul className="space-y-2">
                  {keyPoints.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI Generated
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show Less" : "Show More"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
