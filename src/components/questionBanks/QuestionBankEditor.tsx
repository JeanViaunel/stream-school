"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, X, BookOpen, GraduationCap, Tag, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuestionBankEditorProps {
  organizationId: Id<"organizations">;
  initialData?: {
    _id: Id<"questionBanks">;
    name: string;
    description?: string;
    subject?: string;
    gradeLevel?: number;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function QuestionBankEditor({
  organizationId,
  initialData,
  onSuccess,
  onCancel,
}: QuestionBankEditorProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [gradeLevel, setGradeLevel] = useState<string>(initialData?.gradeLevel?.toString() || "");
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBank = useMutation(api.questionBanks.createQuestionBank);
  const updateBank = useMutation(api.questionBanks.updateQuestionBank);

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!name.trim()) {
      newErrors.push("Bank name is required");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (initialData) {
        // Update existing bank
        await updateBank({
          bankId: initialData._id,
          name: name.trim(),
          description: description.trim() || undefined,
          subject: subject.trim() || undefined,
          gradeLevel: gradeLevel ? parseInt(gradeLevel) : undefined,
        });
      } else {
        // Create new bank
        await createBank({
          name: name.trim(),
          description: description.trim() || undefined,
          subject: subject.trim() || undefined,
          gradeLevel: gradeLevel ? parseInt(gradeLevel) : undefined,
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save question bank:", error);
      setErrors(["Failed to save question bank. Please try again."]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = !!initialData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {isEditing ? "Edit Question Bank" : "Create Question Bank"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isEditing
                  ? "Update your question bank details"
                  : "Create a new collection of reusable questions"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Bank Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Mathematics - Algebra Basics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn("h-11", !name.trim() && errors.length > 0 && "border-destructive")}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Description <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose and content of this question bank..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Subject and Grade Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Subject <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="subject"
                placeholder="e.g., Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradeLevel" className="text-sm font-medium flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                Grade Level <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="gradeLevel"
                type="number"
                min={1}
                max={12}
                placeholder="e.g., 8"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          {/* Preview Tags */}
          {(subject || gradeLevel) && (
            <div className="flex flex-wrap gap-2">
              {subject && (
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {subject}
                </Badge>
              )}
              {gradeLevel && (
                <Badge variant="secondary" className="gap-1">
                  <GraduationCap className="h-3 w-3" />
                  Grade {gradeLevel}
                </Badge>
              )}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
            >
              <ul className="text-sm text-destructive space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Bank"}
        </Button>
      </div>
    </motion.div>
  );
}
