"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Plus, 
  Trash2, 
  CalendarIcon, 
  Save, 
  Send, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Clock,
  ListTodo,
  AlignLeft,
  GripVertical,
  X,
  Timer,
  BookOpen,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { GenerateAssignmentModal } from "@/components/questionBanks/GenerateAssignmentModal";

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
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const createAssignment = useMutation(api.assignments.createAssignment);
  const publishAssignment = useMutation(api.assignments.publishAssignment);
  const cls = useQuery(api.classes.getClassById, { classId });

  const addQuestion = () => {
    const newQuestion: Question = type === "multiple_choice"
      ? { id: crypto.randomUUID(), text: "", options: ["", ""], correctOption: 0 }
      : { id: crypto.randomUUID(), text: "" };
    setQuestions([...questions, newQuestion]);
    setActiveQuestion(newQuestion.id);
  };

  const removeQuestion = (questionId: string) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter(q => q.id !== questionId));
    if (activeQuestion === questionId) {
      setActiveQuestion(null);
    }
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

  const getValidationErrors = () => {
    const errors: string[] = [];
    if (!title.trim()) errors.push("Assignment title is required");
    questions.forEach((q, idx) => {
      if (!q.text.trim()) errors.push(`Question ${idx + 1} text is required`);
      if (type === "multiple_choice" && q.options) {
        if (q.options.some(opt => !opt.trim())) {
          errors.push(`Question ${idx + 1} has empty options`);
        }
        if (q.correctOption === undefined) {
          errors.push(`Question ${idx + 1} needs a correct answer selected`);
        }
      }
    });
    return errors;
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
        timeLimitMinutes,
        allowLateSubmissions: false,
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
        timeLimitMinutes,
        allowLateSubmissions: false,
      });
      
      await publishAssignment({ assignmentId });
      onSuccess?.();
    } catch (error) {
      console.error("Failed to publish assignment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completionPercentage = Math.round(
    (questions.filter(q => q.text.trim() && (type === "short_answer" || (q.options?.every(opt => opt.trim()) && q.correctOption !== undefined))).length / Math.max(questions.length, 1)) * 100
  );

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col w-full">
        {/* Header Section */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Create Assignment</h2>
                <p className="text-sm text-muted-foreground">
                  {questions.length} question{questions.length !== 1 ? 's' : ''} • {completionPercentage}% complete
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cls?.organizationId && (
                <Button
                  variant="outline"
                  onClick={() => setShowGenerateModal(true)}
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Create from Question Bank
                </Button>
              )}
              {completionPercentage === 100 && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                completionPercentage === 100 ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Main Form */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-6">
          {/* Assignment Details Card */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-medium flex items-center gap-2">
                  Assignment Title
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Midterm Exam - Chapter 1-5"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={cn(
                    "h-11",
                    !title.trim() && questions.some(q => q.text) && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {!title.trim() && questions.some(q => q.text) && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Title is required
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions" className="text-base font-medium flex items-center gap-2">
                  <AlignLeft className="h-4 w-4 text-muted-foreground" />
                  Instructions
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="instructions"
                  placeholder="Provide detailed instructions for students..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    Question Type
                  </Label>
                  <Select value={type} onValueChange={(v) => {
                    setType(v as "multiple_choice" | "short_answer");
                    setQuestions([{ 
                      id: crypto.randomUUID(), 
                      text: "", 
                      options: v === "multiple_choice" ? ["", ""] : undefined 
                    }]);
                  }}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          </div>
                          Multiple Choice
                        </div>
                      </SelectItem>
                      <SelectItem value="short_answer">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary rounded" />
                          Short Answer
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Due Date
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : "No due date"}
                        </Button>
                      }
                    />
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    Time Limit
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Select 
                    value={timeLimitMinutes?.toString() || "none"} 
                    onValueChange={(v) => setTimeLimitMinutes(v === "none" ? undefined : parseInt(v))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="No time limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No time limit</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  {timeLimitMinutes && (
                    <p className="text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Students will have {timeLimitMinutes} minutes to complete once started
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Questions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Questions</h3>
                <Badge variant="secondary">{questions.length}</Badge>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <Button variant="outline" size="sm" onClick={addQuestion} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Question
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add a new {type === "multiple_choice" ? "multiple choice" : "short answer"} question</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <AnimatePresence mode="popLayout">
              {questions.map((question, qIndex) => (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card 
                    className={cn(
                      "border-border/50 shadow-sm transition-all duration-200",
                      activeQuestion === question.id && "ring-2 ring-primary/20 border-primary/50"
                    )}
                    onClick={() => setActiveQuestion(question.id)}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                              {qIndex + 1}
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Question {qIndex + 1}</p>
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          </div>
                          {questions.length > 1 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeQuestion(question.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove question</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>

                        {/* Question Text */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">
                            Question Text
                          </Label>
                          <Textarea
                            placeholder="Enter your question here..."
                            value={question.text}
                            onChange={(e) => updateQuestionText(question.id, e.target.value)}
                            rows={2}
                            className={cn(
                              "resize-none",
                              !question.text.trim() && "border-destructive focus-visible:ring-destructive"
                            )}
                          />
                        </div>
                          
                        {/* Multiple Choice Options */}
                        {type === "multiple_choice" && question.options && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <HelpCircle className="h-4 w-4" />
                              <span>Select the correct answer</span>
                            </div>
                              
                            <RadioGroup
                              value={question.correctOption?.toString()}
                              onValueChange={(v) => setCorrectOption(question.id, parseInt(v))}
                              className="grid grid-cols-1 lg:grid-cols-2 gap-2"
                            >
                              <AnimatePresence>
                                {question.options.map((option, oIndex) => (
                                  <motion.div
                                    key={oIndex}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                                      question.correctOption === oIndex
                                        ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                        : "border-border hover:border-primary/50"
                                    )}
                                  >
                                    <RadioGroupItem
                                      value={oIndex.toString()}
                                      id={`${question.id}-option-${oIndex}`}
                                      className="data-[state=checked]:border-green-500 data-[state=checked]:text-green-500"
                                    />
                                    <Input
                                      placeholder={`Option ${oIndex + 1}`}
                                      value={option}
                                      onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                                      className={cn(
                                        "flex-1 border-0 bg-transparent focus-visible:ring-0 px-0",
                                        !option.trim() && "placeholder:text-destructive/60"
                                      )}
                                    />
                                    {question.options!.length > 2 && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                            onClick={() => removeOption(question.id, oIndex)}
                                          >
                                            <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Remove option</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </RadioGroup>
                              
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addOption(question.id)}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <Plus className="mr-1 h-4 w-4" />
                              Add Option
                            </Button>
                          </div>
                        )}
                          
                        {/* Short Answer Preview */}
                        {type === "short_answer" && (
                          <div>
                            <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
                              <p className="text-sm text-muted-foreground">
                                Students will provide a text response
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add Question Button */}
            <Button 
              variant="outline" 
              className="w-full py-6 border-dashed hover:border-primary hover:bg-primary/5"
              onClick={addQuestion}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Question
            </Button>
          </div>

          {/* Validation Errors */}
          {getValidationErrors().length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-destructive">Please fix the following:</p>
                  <ul className="text-sm text-destructive/80 space-y-1">
                    {getValidationErrors().map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t bg-background/95 supports-backdrop-filter:backdrop-blur">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!validateForm() || isSubmitting}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!validateForm() || isSubmitting}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Publishing..." : "Publish Assignment"}
          </Button>
        </div>

        {/* Generate Assignment from Question Bank Modal */}
        {cls?.organizationId && (
          <GenerateAssignmentModal
            classId={classId}
            organizationId={cls.organizationId}
            open={showGenerateModal}
            onOpenChange={setShowGenerateModal}
            onSuccess={(assignmentId) => {
              setShowGenerateModal(false);
              onSuccess?.();
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
