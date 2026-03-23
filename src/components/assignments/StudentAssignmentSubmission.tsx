"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Clock, CheckCircle, AlertCircle, Send, ChevronLeft, FileCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface StudentAssignmentSubmissionProps {
  classId: Id<"classes">;
  assignmentId: Id<"assignments">;
  onBack?: () => void;
}

interface Answer {
  questionId: string;
  value: string;
}

export function StudentAssignmentSubmission({ 
  classId, 
  assignmentId, 
  onBack 
}: StudentAssignmentSubmissionProps) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const assignment = useQuery(api.assignments.getAssignmentById, { assignmentId });
  const submission = useQuery(api.submissions.getMySubmission, { assignmentId });
  const grades = useQuery(api.grades.getMyGrades, { classId });
  const submitMutation = useMutation(api.submissions.submitAnswers);

  const isLoading = assignment === undefined || submission === undefined || grades === undefined;

  if (isLoading) {
    return <AssignmentSubmissionSkeleton />;
  }

  if (assignment === null) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Assignment Not Found</h3>
            <p className="text-muted-foreground mb-4">This assignment may have been removed or is not available.</p>
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if already submitted
  const isSubmitted = !!submission;
  
  // Check if past due date
  const isPastDue = assignment.dueDateAt ? isPast(assignment.dueDateAt) : false;
  const isLateSubmission = isSubmitted && assignment.dueDateAt 
    ? submission.submittedAt > assignment.dueDateAt 
    : false;

  // Get grade info if graded
  const grade = grades?.grades.find(g => g.assignmentId === assignmentId);

  const updateAnswer = (questionId: string, value: string) => {
    setAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      if (existing) {
        return prev.map(a => a.questionId === questionId ? { ...a, value } : a);
      }
      return [...prev, { questionId, value }];
    });
  };

  const getAnswer = (questionId: string): string => {
    return answers.find(a => a.questionId === questionId)?.value || "";
  };

  const allQuestionsAnswered = assignment.questions.every(q => {
    const answer = getAnswer(q.id);
    return answer.trim() !== "";
  });

  const handleSubmit = async () => {
    if (!allQuestionsAnswered) {
      toast.error("Please answer all questions before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMutation({
        assignmentId,
        answers: assignment.questions.map(q => ({
          questionId: q.id,
          value: getAnswer(q.id),
        })),
      });
      toast.success("Assignment submitted successfully!");
    } catch (error) {
      console.error("Failed to submit:", error);
      toast.error("Failed to submit assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  // Show submitted view with results
  if (isSubmitted) {
    const score = grade?.score ?? submission.autoScore;
    const maxScore = grade?.maxScore ?? assignment.questions.length * 10;
    const percentage = score !== undefined ? Math.round((score / maxScore) * 100) : undefined;

    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{assignment.title}</CardTitle>
              <CardDescription className="mt-1">
                Submitted on {format(submission.submittedAt, "PPP 'at' p")}
                {isLateSubmission && (
                  <span className="text-amber-400 ml-2">(Late)</span>
                )}
              </CardDescription>
            </div>
            <Badge className="bg-green-500/20 text-green-400 gap-1">
              <CheckCircle className="h-3 w-3" />
              Submitted
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          {percentage !== undefined && (
            <div className="bg-muted/50 rounded-xl p-6 text-center">
              <div className="text-5xl font-bold text-primary mb-2">{percentage}%</div>
              <div className="text-sm text-muted-foreground">
                {score}/{maxScore} points
              </div>
              {grade?.feedback && (
                <div className="mt-4 p-4 bg-card rounded-lg text-left">
                  <div className="font-medium mb-1 flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Teacher Feedback:
                  </div>
                  <p className="text-sm text-muted-foreground">{grade.feedback}</p>
                </div>
              )}
            </div>
          )}

          {/* Questions with Answers */}
          <div className="space-y-6">
            <h3 className="font-medium text-lg">Your Answers</h3>
            {assignment.questions.map((question, index) => {
              const answer = submission.answers.find(a => a.questionId === question.id);
              const isCorrect = assignment.type === "multiple_choice" && question.correctOption !== undefined
                ? answer && parseInt(answer.value) === question.correctOption
                : undefined;

              return (
                <div key={question.id} className="border rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="font-medium text-muted-foreground mt-0.5">{index + 1}.</span>
                    <div className="flex-1">
                      <p className="font-medium">{question.text}</p>
                    </div>
                  </div>

                  {assignment.type === "multiple_choice" && question.options ? (
                    <div className="pl-8 space-y-2">
                      {question.options.map((option, oIndex) => {
                        const isSelected = answer?.value === oIndex.toString();
                        const isCorrectOption = question.correctOption === oIndex;
                        
                        let className = "flex items-center gap-3 p-3 rounded-lg text-sm transition-colors";
                        if (isCorrectOption) {
                          className += " bg-green-500/10 border border-green-500/30 text-green-400";
                        } else if (isSelected && !isCorrectOption) {
                          className += " bg-red-500/10 border border-red-500/30 text-red-400";
                        } else {
                          className += " bg-muted/30 text-muted-foreground";
                        }

                        return (
                          <div key={oIndex} className={className}>
                            {isCorrectOption && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {isSelected && !isCorrectOption && <XCircle className="h-4 w-4 text-red-500" />}
                            {!isSelected && !isCorrectOption && <div className="w-4" />}
                            <span>{option}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pl-8">
                      <div className="bg-muted/30 rounded-lg p-3 text-sm">
                        {answer?.value || "No answer provided"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show submission form
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Assignments
          </Button>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl">{assignment.title}</CardTitle>
            {assignment.instructions && (
              <CardDescription className="mt-2 text-sm leading-relaxed">
                {assignment.instructions}
              </CardDescription>
            )}
          </div>
          {assignment.dueDateAt && (
            <Badge variant={isPastDue ? "destructive" : "outline"} className="flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3" />
              {isPastDue ? "Past Due" : `Due ${format(assignment.dueDateAt, "MMM d")}`}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isPastDue && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">This assignment is past due</p>
              <p className="text-sm text-destructive/80 mt-1">
                The due date was {format(assignment.dueDateAt!, "PPP")}. You can still submit, but it may be marked as late.
              </p>
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-8">
          {assignment.questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground mt-0.5">{index + 1}.</span>
                <Label className="text-base font-medium leading-relaxed">
                  {question.text}
                </Label>
              </div>

              {assignment.type === "multiple_choice" && question.options ? (
                <div className="pl-8">
                  <RadioGroup
                    value={getAnswer(question.id)}
                    onValueChange={(value) => updateAnswer(question.id, value)}
                    className="space-y-2"
                  >
                    {question.options.map((option, oIndex) => (
                      <div 
                        key={oIndex} 
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => updateAnswer(question.id, oIndex.toString())}
                      >
                        <RadioGroupItem 
                          value={oIndex.toString()} 
                          id={`${question.id}-${oIndex}`}
                          className="shrink-0"
                        />
                        <Label 
                          htmlFor={`${question.id}-${oIndex}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ) : (
                <div className="pl-8">
                  <Textarea
                    placeholder="Type your answer here..."
                    value={getAnswer(question.id)}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        
        <div className="flex items-center gap-4">
          {!allQuestionsAnswered && (
            <span className="text-sm text-amber-400 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Answer all questions
            </span>
          )}
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={!allQuestionsAnswered || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Assignment
              </>
            )}
          </Button>
        </div>
      </CardFooter>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border rounded-xl p-6 max-w-md w-full shadow-xl"
            >
              <h3 className="text-lg font-semibold mb-2">Submit Assignment?</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Are you sure you want to submit this assignment? Once submitted, you cannot change your answers.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Confirm Submit"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function AssignmentSubmissionSkeleton() {
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-5 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </CardFooter>
    </Card>
  );
}