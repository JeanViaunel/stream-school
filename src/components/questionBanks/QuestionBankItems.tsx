"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Edit2, Trash2, MoreVertical, Eye, EyeOff, HelpCircle, BookOpen, BarChart3, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { QuestionForm, type QuestionFormData } from "./QuestionForm";

interface QuestionBankItemsProps {
  bankId: Id<"questionBanks">;
  organizationId: Id<"organizations">;
  onBack: () => void;
}

export function QuestionBankItems({ bankId, organizationId, onBack }: QuestionBankItemsProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<{ _id: Id<"questionBankItems">; question: QuestionFormData } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ _id: Id<"questionBankItems">; text: string } | null>(null);
  const [previewingItem, setPreviewingItem] = useState<{ question: QuestionFormData } | null>(null);

  const bank = useQuery(api.questionBanks.getQuestionBankById, { bankId });
  const items = useQuery(api.questionBanks.getQuestionBankItems, { bankId });
  const analytics = useQuery(api.questionBanks.getQuestionBankAnalytics, { bankId });

  const addQuestion = useMutation(api.questionBanks.addQuestionToBank);
  const updateQuestion = useMutation(api.questionBanks.updateQuestionInBank);
  const deleteQuestion = useMutation(api.questionBanks.deleteQuestionFromBank);

  const handleAddQuestion = async (data: QuestionFormData) => {
    await addQuestion({
      bankId,
      question: {
        text: data.text,
        type: data.type,
        options: data.options,
        correctOption: data.correctOption,
        explanation: data.explanation,
        difficulty: data.difficulty,
        tags: data.tags,
      },
    });
    setShowAddDialog(false);
  };

  const handleUpdateQuestion = async (data: QuestionFormData) => {
    if (!editingItem) return;
    
    await updateQuestion({
      itemId: editingItem._id,
      question: {
        text: data.text,
        type: data.type,
        options: data.options,
        correctOption: data.correctOption,
        explanation: data.explanation,
        difficulty: data.difficulty,
        tags: data.tags,
      },
    });
    setEditingItem(null);
  };

  const handleDeleteQuestion = async () => {
    if (!deletingItem) return;
    
    await deleteQuestion({ itemId: deletingItem._id });
    setDeletingItem(null);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-700 hover:bg-green-100";
      case "medium":
        return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
      case "hard":
        return "bg-red-100 text-red-700 hover:bg-red-100";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (!bank) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading question bank...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2">
            ← Back to Banks
          </Button>
          <h2 className="text-2xl font-bold">{bank.name}</h2>
          {bank.description && (
            <p className="text-muted-foreground mt-1">{bank.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {bank.subject && (
              <Badge variant="secondary">
                <Tag className="h-3 w-3 mr-1" />
                {bank.subject}
              </Badge>
            )}
            {bank.gradeLevel && (
              <Badge variant="secondary">Grade {bank.gradeLevel}</Badge>
            )}
            <Badge variant="outline">
              <BookOpen className="h-3 w-3 mr-1" />
              {bank.questionCount} questions
            </Badge>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.totalQuestions}</p>
                  <p className="text-sm text-muted-foreground">Total Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.totalUsageCount}</p>
                  <p className="text-sm text-muted-foreground">Times Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.questionsByType.multipleChoice}</p>
                  <p className="text-sm text-muted-foreground">Multiple Choice</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.allTags.length}</p>
                  <p className="text-sm text-muted-foreground">Unique Tags</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Questions</h3>
          <div className="flex gap-2">
            {analytics && (
              <>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {analytics.questionsByDifficulty.easy} Easy
                </Badge>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                  {analytics.questionsByDifficulty.medium} Medium
                </Badge>
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  {analytics.questionsByDifficulty.hard} Hard
                </Badge>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {items?.map((item, index) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Card className="group hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-medium leading-relaxed">{item.question.text}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                setEditingItem({
                                  _id: item._id,
                                  question: {
                                    id: item.question.id,
                                    text: item.question.text,
                                    type: item.question.type,
                                    options: item.question.options,
                                    correctOption: item.question.correctOption,
                                    explanation: item.question.explanation,
                                    difficulty: item.question.difficulty,
                                    tags: item.question.tags || [],
                                  },
                                })
                              }
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setPreviewingItem({
                                  question: {
                                    id: item.question.id,
                                    text: item.question.text,
                                    type: item.question.type,
                                    options: item.question.options,
                                    correctOption: item.question.correctOption,
                                    explanation: item.question.explanation,
                                    difficulty: item.question.difficulty,
                                    tags: item.question.tags || [],
                                  },
                                })
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setDeletingItem({ _id: item._id, text: item.question.text })
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Options for Multiple Choice */}
                      {item.question.type === "multiple_choice" && item.question.options && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {item.question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded text-sm",
                                optIndex === item.question.correctOption
                                  ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                                  : "bg-muted/50"
                              )}
                            >
                              <div
                                className={cn(
                                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                  optIndex === item.question.correctOption
                                    ? "border-green-500 bg-green-500"
                                    : "border-muted-foreground"
                                )}
                              >
                                {optIndex === item.question.correctOption && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                              <span
                                className={cn(
                                  optIndex === item.question.correctOption && "font-medium text-green-700 dark:text-green-400"
                                )}
                              >
                                {option}
                              </span>
                              {optIndex === item.question.correctOption && (
                                <Badge variant="outline" className="ml-auto text-xs border-green-200 text-green-700">
                                  Correct
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Short Answer Preview */}
                      {item.question.type === "short_answer" && (
                        <div className="mt-3 p-3 rounded border border-dashed border-muted-foreground/30 bg-muted/30">
                          <p className="text-sm text-muted-foreground">
                            Short answer question - students will provide a text response
                          </p>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {item.question.difficulty && (
                          <Badge variant="secondary" className={getDifficultyColor(item.question.difficulty)}>
                            {item.question.difficulty.charAt(0).toUpperCase() + item.question.difficulty.slice(1)}
                          </Badge>
                        )}
                        {item.question.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="text-xs ml-auto">
                          Used {item.usageCount} {item.usageCount === 1 ? "time" : "times"}
                        </Badge>
                      </div>

                      {/* Explanation */}
                      {item.question.explanation && (
                        <div className="mt-3 p-3 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <span className="font-medium">Explanation:</span> {item.question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {items?.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No questions yet</h3>
            <p className="text-muted-foreground mt-1">
              Add questions to this bank to use them in assignments
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add First Question
            </Button>
          </div>
        )}
      </div>

      {/* Add Question Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>
              Create a new question for this bank
            </DialogDescription>
          </DialogHeader>
          <QuestionForm
            onSubmit={handleAddQuestion}
            onCancel={() => setShowAddDialog(false)}
            submitLabel="Add Question"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Update this question</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <QuestionForm
              initialData={editingItem.question}
              onSubmit={handleUpdateQuestion}
              onCancel={() => setEditingItem(null)}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewingItem} onOpenChange={() => setPreviewingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
            <DialogDescription>Preview how this question will appear to students</DialogDescription>
          </DialogHeader>
          {previewingItem && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <p className="font-medium text-lg">{previewingItem.question.text}</p>
                
                {previewingItem.question.type === "multiple_choice" && previewingItem.question.options && (
                  <div className="mt-4 space-y-2">
                    {previewingItem.question.options.map((option, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          idx === previewingItem.question.correctOption
                            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                            : "border-border"
                        )}
                      >
                        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>
                )}

                {previewingItem.question.type === "short_answer" && (
                  <div className="mt-4 p-3 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      Students will type their answer here...
                    </p>
                  </div>
                )}
              </div>

              {previewingItem.question.explanation && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800">
                  <p className="font-medium text-blue-800 dark:text-blue-200">Explanation:</p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    {previewingItem.question.explanation}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {previewingItem.question.difficulty && (
                  <Badge variant="secondary" className={getDifficultyColor(previewingItem.question.difficulty)}>
                    {previewingItem.question.difficulty}
                  </Badge>
                )}
                {previewingItem.question.tags?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPreviewingItem(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingItem && (
            <div className="p-3 rounded bg-muted my-4">
              <p className="text-sm line-clamp-2">{deletingItem.text}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
