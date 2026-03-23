"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, CalendarIcon, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Question {
  id: string;
  text: string;
  options?: string[];
  correctOption?: number;
}

interface AssignmentCreatorProps {
  classId: Id<"classes">;
  sessionId?: Id<"sessions">;
  onSuccess?: () => void;
}

export function AssignmentCreator({ classId, sessionId, onSuccess }: AssignmentCreatorProps) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [type, setType] = useState<"multiple_choice" | "short_answer">("multiple_choice");
  const [questions, setQuestions] = useState<Question[]>([
    { id: crypto.randomUUID(), text: "", options: ["", ""], correctOption: 0 }
  ]);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createAssignment = useMutation(api.assignments.createAssignment);
  const publishAssignment = useMutation(api.assignments.publishAssignment);

  const addQuestion = () => {
    const newQuestion: Question = type === "multiple_choice"
      ? { id: crypto.randomUUID(), text: "", options: ["", ""], correctOption: 0 }
      : { id: crypto.randomUUID(), text: "" };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionId: string) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const updateQuestionText = (questionId: string, text: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, text } : q
    ));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId && q.options
        ? { ...q, options: [...q.options, ""] }
        : q
    ));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options && q.options.length > 2) {
        const newOptions = q.options.filter((_, i) => i !== optionIndex);
        const newCorrectOption = q.correctOption !== undefined && q.correctOption >= optionIndex
          ? Math.max(0, q.correctOption - 1)
          : q.correctOption;
        return { ...q, options: newOptions, correctOption: newCorrectOption };
      }
      return q;
    }));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const setCorrectOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, correctOption: optionIndex } : q
    ));
  };

  const validateForm = (): boolean => {
    if (!title.trim()) return false;
    if (questions.length === 0) return false;
    
    for (const q of questions) {
      if (!q.text.trim()) return false;
      if (type === "multiple_choice" && q.options) {
        if (q.options.length < 2) return false;
        if (q.options.some(opt => !opt.trim())) return false;
        if (q.correctOption === undefined) return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const assignmentId = await createAssignment({
        classId,
        title: title.trim(),
        instructions: instructions.trim(),
        type,
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          options: q.options,
          correctOption: q.correctOption,
        })),
        dueDateAt: dueDate?.getTime(),
        sessionId,
      });
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save draft:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const assignmentId = await createAssignment({
        classId,
        title: title.trim(),
        instructions: instructions.trim(),
        type,
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          options: q.options,
          correctOption: q.correctOption,
        })),
        dueDateAt: dueDate?.getTime(),
        sessionId,
      });
      
      await publishAssignment({ assignmentId });
      onSuccess?.();
    } catch (error) {
      console.error("Failed to publish assignment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create New Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Enter assignment title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Instructions</Label>
          <Textarea
            id="instructions"
            placeholder="Enter instructions for students"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Assignment Type</Label>
          <Select value={type} onValueChange={(v) => {
            setType(v as "multiple_choice" | "short_answer");
            setQuestions([{ 
              id: crypto.randomUUID(), 
              text: "", 
              options: v === "multiple_choice" ? ["", ""] : undefined 
            }]);
          }}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="short_answer">Short Answer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Due Date (Optional)</Label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Questions</Label>
            <Button variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="mr-1 h-4 w-4" />
              Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {questions.map((question, qIndex) => (
              <Card key={question.id} className="border-muted">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground mt-2">
                      {qIndex + 1}.
                    </span>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Enter question text"
                        value={question.text}
                        onChange={(e) => updateQuestionText(question.id, e.target.value)}
                      />
                      
                      {type === "multiple_choice" && question.options && (
                        <div className="space-y-2 pl-4">
                          <RadioGroup
                            value={question.correctOption?.toString()}
                            onValueChange={(v) => setCorrectOption(question.id, parseInt(v))}
                          >
                            {question.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex items-center gap-2">
                                <RadioGroupItem
                                  value={oIndex.toString()}
                                  id={`${question.id}-option-${oIndex}`}
                                />
                                <Input
                                  placeholder={`Option ${oIndex + 1}`}
                                  value={option}
                                  onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                                  className="flex-1"
                                />
                                {question.options!.length > 2 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeOption(question.id, oIndex)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </RadioGroup>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addOption(question.id)}
                            className="text-muted-foreground"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Option
                          </Button>
                        </div>
                      )}
                    </div>
                    {questions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={!validateForm() || isSubmitting}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
        <Button
          onClick={handlePublish}
          disabled={!validateForm() || isSubmitting}
        >
          <Send className="mr-2 h-4 w-4" />
          Publish
        </Button>
      </CardFooter>
    </Card>
  );
}
