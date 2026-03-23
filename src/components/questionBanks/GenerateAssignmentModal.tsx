"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  GraduationCap,
  Tag,
  FileQuestion,
  Check,
  AlertCircle,
  Shuffle,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface GenerateAssignmentModalProps {
  classId: Id<"classes">;
  organizationId: Id<"organizations">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (assignmentId: Id<"assignments">) => void;
}

interface SelectedQuestion {
  id: string;
  text: string;
  difficulty?: "easy" | "medium" | "hard";
  selected: boolean;
}

export function GenerateAssignmentModal({
  classId,
  organizationId,
  open,
  onOpenChange,
  onSuccess,
}: GenerateAssignmentModalProps) {
  const [step, setStep] = useState(1);
  const [selectedBankId, setSelectedBankId] = useState<Id<"questionBanks"> | null>(null);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [questionCount, setQuestionCount] = useState(10);
  const [useDifficultyDistribution, setUseDifficultyDistribution] = useState(false);
  const [easyPercent, setEasyPercent] = useState(30);
  const [mediumPercent, setMediumPercent] = useState(50);
  const [hardPercent, setHardPercent] = useState(20);
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const banks = useQuery(api.questionBanks.getQuestionBanks, { organizationId });
  const bankItems = useQuery(
    api.questionBanks.getQuestionBankItems,
    selectedBankId ? { bankId: selectedBankId } : "skip"
  );

  const generateAssignment = useMutation(api.questionBanks.generateAssignmentFromBank);

  const selectedBank = banks?.find((b) => b._id === selectedBankId);

  const totalPercent = easyPercent + mediumPercent + hardPercent;
  const isDistributionValid = totalPercent === 100;

  const handleSelectBank = (bankId: Id<"questionBanks">) => {
    setSelectedBankId(bankId);
    setStep(2);
  };

  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, selected: !q.selected } : q))
    );
  };

  const handleRandomSelection = () => {
    if (!bankItems) return;
    
    let questionsToSelect: typeof bankItems;
    
    if (useDifficultyDistribution && isDistributionValid) {
      const easyCount = Math.round((easyPercent / 100) * questionCount);
      const mediumCount = Math.round((mediumPercent / 100) * questionCount);
      const hardCount = questionCount - easyCount - mediumCount;

      const easyItems = bankItems.filter((i) => i.question.difficulty === "easy");
      const mediumItems = bankItems.filter((i) => i.question.difficulty === "medium");
      const hardItems = bankItems.filter((i) => i.question.difficulty === "hard");

      const shuffled = [...bankItems].sort(() => Math.random() - 0.5);
      
      // Select based on distribution
      const selected = [
        ...shuffled.filter((i) => i.question.difficulty === "easy").slice(0, easyCount),
        ...shuffled.filter((i) => i.question.difficulty === "medium").slice(0, mediumCount),
        ...shuffled.filter((i) => i.question.difficulty === "hard").slice(0, hardCount),
      ];

      // If we don't have enough with distribution, fill randomly
      if (selected.length < questionCount) {
        const remaining = shuffled.filter((i) => !selected.includes(i));
        selected.push(...remaining.slice(0, questionCount - selected.length));
      }

      questionsToSelect = selected.slice(0, questionCount);
    } else {
      // Pure random selection
      questionsToSelect = [...bankItems].sort(() => Math.random() - 0.5).slice(0, questionCount);
    }

    const selectedIds = new Set(questionsToSelect.map((q) => q.question.id));
    setSelectedQuestions((prev) =>
      prev.map((q) => ({ ...q, selected: selectedIds.has(q.id) }))
    );
  };

  const handleGenerate = async () => {
    if (!selectedBankId) return;

    setIsGenerating(true);
    try {
      const selectedIds = selectedQuestions.filter((q) => q.selected).map((q) => q.id);

      const assignmentId = await generateAssignment({
        bankId: selectedBankId,
        classId,
        title: title || `Assignment from ${selectedBank?.name}`,
        instructions: instructions || "",
        questionCount,
        difficultyDistribution: useDifficultyDistribution && isDistributionValid
          ? {
              easy: Math.round((easyPercent / 100) * questionCount),
              medium: Math.round((mediumPercent / 100) * questionCount),
              hard: Math.round((hardPercent / 100) * questionCount),
            }
          : undefined,
        selectedQuestionIds: selectedIds.length > 0 ? selectedIds : undefined,
        dueDateAt: dueDate?.getTime(),
      });

      onSuccess?.(assignmentId);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Failed to generate assignment:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedBankId(null);
    setTitle("");
    setInstructions("");
    setDueDate(undefined);
    setQuestionCount(10);
    setUseDifficultyDistribution(false);
    setEasyPercent(30);
    setMediumPercent(50);
    setHardPercent(20);
    setSelectedQuestions([]);
  };

  // Update selected questions when bank items load
  useState(() => {
    if (bankItems) {
      setSelectedQuestions(
        bankItems.map((item) => ({
          id: item.question.id,
          text: item.question.text,
          difficulty: item.question.difficulty,
          selected: false,
        }))
      );
    }
  });

  const selectedCount = selectedQuestions.filter((q) => q.selected).length;
  const canGenerate = title.trim() && selectedCount > 0;

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Assignment from Question Bank
          </DialogTitle>
          <DialogDescription>
            Create an assignment using questions from your question banks
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-2",
                    step > s ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Bank */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="font-semibold">Select a Question Bank</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {banks?.map((bank) => (
                  <Card
                    key={bank._id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedBankId === bank._id && "ring-2 ring-primary"
                    )}
                    onClick={() => handleSelectBank(bank._id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{bank.name}</h4>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {bank.subject && (
                              <Badge variant="secondary" className="text-xs">
                                {bank.subject}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {bank.questionCount} questions
                            </Badge>
                          </div>
                        </div>
                        {selectedBankId === bank._id && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {banks?.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No question banks available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a question bank first to generate assignments
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && selectedBank && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Configure Assignment</h3>
                <Badge variant="secondary">{selectedBank.name}</Badge>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Assignment Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g., Algebra Quiz - Chapter 3"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Instructions (optional)</Label>
                  <Input
                    placeholder="Add instructions for students..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Due Date (optional)</Label>
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Number of Questions</Label>
                    <span className="font-medium">{questionCount}</span>
                  </div>
                  <Slider
                    value={[questionCount]}
                    onValueChange={(v) => setQuestionCount(v[0])}
                    min={1}
                    max={selectedBank.questionCount}
                    step={1}
                  />
                  <p className="text-sm text-muted-foreground">
                    Bank has {selectedBank.questionCount} questions total
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="difficulty"
                    checked={useDifficultyDistribution}
                    onCheckedChange={(checked) =>
                      setUseDifficultyDistribution(checked as boolean)
                    }
                  />
                  <Label htmlFor="difficulty" className="cursor-pointer">
                    Use difficulty distribution
                  </Label>
                </div>

                {useDifficultyDistribution && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                    {!isDistributionValid && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>Percentages must total 100% (currently {totalPercent}%)</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-green-600">Easy</Label>
                        <span className="font-medium">{easyPercent}%</span>
                      </div>
                      <Slider
                        value={[easyPercent]}
                        onValueChange={(v) => setEasyPercent(v[0])}
                        min={0}
                        max={100}
                        step={5}
                        className="[&_[role=slider]]:bg-green-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-yellow-600">Medium</Label>
                        <span className="font-medium">{mediumPercent}%</span>
                      </div>
                      <Slider
                        value={[mediumPercent]}
                        onValueChange={(v) => setMediumPercent(v[0])}
                        min={0}
                        max={100}
                        step={5}
                        className="[&_[role=slider]]:bg-yellow-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-red-600">Hard</Label>
                        <span className="font-medium">{hardPercent}%</span>
                      </div>
                      <Slider
                        value={[hardPercent]}
                        onValueChange={(v) => setHardPercent(v[0])}
                        min={0}
                        max={100}
                        step={5}
                        className="[&_[role=slider]]:bg-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3: Select/Review Questions */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Select Questions</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedCount} selected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleRandomSelection}>
                    <Shuffle className="mr-2 h-4 w-4" />
                    Random Select
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {selectedQuestions.map((question, idx) => (
                  <Card
                    key={question.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      question.selected && "ring-2 ring-primary"
                    )}
                    onClick={() => handleToggleQuestion(question.id)}
                  >
                    <CardContent className="p-3 flex items-start gap-3">
                      <Checkbox
                        checked={question.selected}
                        onCheckedChange={() => handleToggleQuestion(question.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{question.text}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {question.difficulty && (
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", getDifficultyColor(question.difficulty))}
                            >
                              {question.difficulty}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Question {idx + 1}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedCount === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">
                    Select questions manually or use random selection
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Navigation */}
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !selectedBankId) ||
                  (step === 2 && (!title.trim() || (useDifficultyDistribution && !isDistributionValid)))
                }
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Assignment
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
