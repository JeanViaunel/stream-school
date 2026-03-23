"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, X, HelpCircle, Trash2, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface QuestionFormData {
  id?: string;
  text: string;
  type: "multiple_choice" | "short_answer";
  options?: string[];
  correctOption?: number;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags: string[];
}

interface QuestionFormProps {
  initialData?: QuestionFormData;
  onSubmit: (data: QuestionFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function QuestionForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Add Question",
}: QuestionFormProps) {
  const [text, setText] = useState(initialData?.text || "");
  const [type, setType] = useState<"multiple_choice" | "short_answer">(initialData?.type || "multiple_choice");
  const [options, setOptions] = useState<string[]>(initialData?.options || ["", ""]);
  const [correctOption, setCorrectOption] = useState<number | undefined>(initialData?.correctOption);
  const [explanation, setExplanation] = useState(initialData?.explanation || "");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | undefined>(initialData?.difficulty);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    if (correctOption === index) {
      setCorrectOption(undefined);
    } else if (correctOption !== undefined && correctOption > index) {
      setCorrectOption(correctOption - 1);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!text.trim()) {
      newErrors.push("Question text is required");
    }

    if (type === "multiple_choice") {
      if (options.length < 2) {
        newErrors.push("Multiple choice questions need at least 2 options");
      }
      if (options.some((opt) => !opt.trim())) {
        newErrors.push("All options must have text");
      }
      if (correctOption === undefined) {
        newErrors.push("Please select the correct answer");
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      id: initialData?.id,
      text: text.trim(),
      type,
      options: type === "multiple_choice" ? options : undefined,
      correctOption: type === "multiple_choice" ? correctOption : undefined,
      explanation: explanation.trim() || undefined,
      difficulty,
      tags,
    });
  };

  return (
    <div className="space-y-5">
      {/* Question Type */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Question Type</Label>
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v as "multiple_choice" | "short_answer");
            if (v === "short_answer") {
              setOptions([]);
              setCorrectOption(undefined);
            } else {
              setOptions(["", ""]);
            }
          }}
        >
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
            <SelectItem value="short_answer">Short Answer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Question Text */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Question Text <span className="text-destructive">*</span>
        </Label>
        <Textarea
          placeholder="Enter your question here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className={cn("resize-none", !text.trim() && errors.length > 0 && "border-destructive")}
        />
      </div>

      {/* Multiple Choice Options */}
      {type === "multiple_choice" && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            Options <span className="text-destructive">*</span>
          </Label>

          <RadioGroup
            value={correctOption?.toString()}
            onValueChange={(v) => setCorrectOption(parseInt(v))}
            className="space-y-2"
          >
            <AnimatePresence>
              {options.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    correctOption === index
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem
                    value={index.toString()}
                    id={`option-${index}`}
                    className="data-[state=checked]:border-green-500 data-[state=checked]:text-green-500"
                  />
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className={cn(
                      "flex-1 border-0 bg-transparent focus-visible:ring-0 px-0",
                      !option.trim() && errors.length > 0 && "placeholder:text-destructive/60"
                    )}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </RadioGroup>

          <Button
            variant="ghost"
            size="sm"
            onClick={addOption}
            className="text-muted-foreground hover:text-primary"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Option
          </Button>

          {correctOption === undefined && errors.length > 0 && (
            <p className="text-sm text-destructive">Please select the correct answer</p>
          )}
        </div>
      )}

      {/* Short Answer Preview */}
      {type === "short_answer" && (
        <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Students will provide a text response to this question
          </p>
        </div>
      )}

      {/* Difficulty */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Difficulty Level</Label>
        <Select
          value={difficulty}
          onValueChange={(v) => setDifficulty(v as "easy" | "medium" | "hard" | undefined)}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select difficulty (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                  Easy
                </Badge>
              </div>
            </SelectItem>
            <SelectItem value="medium">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                  Medium
                </Badge>
              </div>
            </SelectItem>
            <SelectItem value="hard">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100">
                  Hard
                </Badge>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Explanation */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Explanation <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="Provide an explanation for the correct answer..."
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tags</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          <AnimatePresence>
            {tags.map((tag) => (
              <motion.div
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 hover:bg-transparent"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={addTag} disabled={!newTag.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <ul className="text-sm text-destructive space-y-1">
              {errors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>{submitLabel}</Button>
      </div>
    </div>
  );
}
