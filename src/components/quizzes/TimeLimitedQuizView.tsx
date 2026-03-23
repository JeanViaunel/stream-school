"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { QuizTimer } from "./QuizTimer";
import { QuizStartScreen } from "./QuizStartScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ChevronLeft, ChevronRight, Save, Send } from "lucide-react";

interface TimeLimitedQuizViewProps {
  assignmentId: Id<"assignments">;
  onSubmitted?: () => void;
}

type Answer = {
  questionId: string;
  value: string;
};

export function TimeLimitedQuizView({ assignmentId, onSubmitted }: TimeLimitedQuizViewProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<Id<"quizAttempts"> | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get assignment details
  const assignment = useQuery(api.assignments.getAssignmentById, { assignmentId });
  
  // Check for active attempt
  const activeAttempt = useQuery(api.quizzes.getActiveQuizAttempt, { assignmentId });
  
  // Get attempt details if we have an attempt ID
  const attemptDetails = useQuery(
    api.quizzes.getQuizAttempt,
    attemptId ? { attemptId } : "skip"
  );
  
  // Mutations
  const startAttempt = useMutation(api.quizzes.startQuizAttempt);
  const saveAnswers = useMutation(api.quizzes.saveAnswers);
  const submitQuiz = useMutation(api.quizzes.submitQuiz);
  
  // Check if there's already an active attempt on mount
  useEffect(() => {
    if (activeAttempt && !hasStarted && !attemptId) {
      setAttemptId(activeAttempt.attemptId);
      setHasStarted(true);
    }
  }, [activeAttempt, hasStarted, attemptId]);
  
  // Load saved answers from attempt
  useEffect(() => {
    if (attemptDetails?.answers) {
      setAnswers(attemptDetails.answers);
    }
  }, [attemptDetails]);
  
  // Handle beforeunload event to warn about leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasStarted && !timeExpired && !isSubmitting) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasStarted, timeExpired, isSubmitting]);
  
  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (hasStarted && attemptId && answers.length > 0) {
      autoSaveIntervalRef.current = setInterval(async () => {
        try {
          await saveAnswers({ attemptId, answers });
          setLastSaved(new Date());
        } catch (error) {
          console.error("Auto-save failed:", error);
        }
      }, 30000);
    }
    
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [hasStarted, attemptId, answers, saveAnswers]);
  
  // Handle starting the quiz
  const handleStart = async () => {
    try {
      const result = await startAttempt({ assignmentId });
      setAttemptId(result.attemptId);
      setHasStarted(true);
    } catch (error) {
      console.error("Failed to start quiz:", error);
      alert("Failed to start quiz. Please try again.");
    }
  };
  
  // Handle answer change
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId);
      if (existing) {
        return prev.map((a) => (a.questionId === questionId ? { ...a, value } : a));
      }
      return [...prev, { questionId, value }];
    });
  };
  
  // Handle time expired
  const handleTimeExpired = useCallback(async () => {
    setTimeExpired(true);
    if (attemptId) {
      try {
        await submitQuiz({ attemptId, answers });
        if (onSubmitted) onSubmitted();
      } catch (error) {
        console.error("Auto-submit failed:", error);
      }
    }
  }, [attemptId, answers, submitQuiz, onSubmitted]);
  
  // Handle manual submit
  const handleSubmit = async () => {
    if (!attemptId) return;
    
    setIsSubmitting(true);
    try {
      await submitQuiz({ attemptId, answers });
      setShowSubmitDialog(false);
      if (onSubmitted) onSubmitted();
    } catch (error) {
      console.error("Submit failed:", error);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle time warning
  const handleTimeWarning = useCallback((remainingSeconds: number) => {
    if (remainingSeconds === 300) {
      // 5 minutes warning
      console.log("5 minutes remaining!");
    } else if (remainingSeconds === 60) {
      // 1 minute warning
      console.log("1 minute remaining!");
    }
  }, []);
  
  // Navigate questions
  const goToNext = () => {
    if (assignment?.questions && currentQuestionIndex < assignment.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };
  
  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };
  
  // Calculate progress
  const answeredCount = answers.filter((a) => a.value.trim() !== "").length;
  const totalQuestions = assignment?.questions?.length || 0;
  const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  
  // Show start screen if not started
  if (!hasStarted || !assignment) {
    return (
      <QuizStartScreen
        title={assignment?.title || "Quiz"}
        instructions={assignment?.instructions || ""}
        timeLimitMinutes={assignment?.timeLimitMinutes || 0}
        questionCount={assignment?.questions?.length || 0}
        onStart={handleStart}
      />
    );
  }
  
  // Show time expired screen
  if (timeExpired) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800">
            Time has expired. Your quiz has been automatically submitted with the answers you provided.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const currentQuestion = assignment.questions[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion.id)?.value || "";
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{assignment.title}</h1>
              <p className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowExitWarning(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Exit Quiz
            </Button>
          </div>
          
          {attemptDetails && (
            <QuizTimer
              attemptId={attemptId!}
              initialRemainingSeconds={attemptDetails.remainingSeconds}
              totalSeconds={attemptDetails.totalSeconds}
              onTimeExpired={handleTimeExpired}
              onTimeWarning={handleTimeWarning}
            />
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Question {currentQuestionIndex + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg">{currentQuestion.text}</p>
                
                {assignment.type === "multiple_choice" && currentQuestion.options ? (
                  <RadioGroup
                    value={currentAnswer}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={index.toString()}
                          id={`option-${index}`}
                        />
                        <Label htmlFor={`option-${index}`} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <Textarea
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="min-h-[200px]"
                  />
                )}
                
                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={goToPrevious}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={goToNext}
                    disabled={currentQuestionIndex === totalQuestions - 1}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-4">
            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{answeredCount} of {totalQuestions} answered</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                
                {/* Question Navigator */}
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {assignment.questions.map((q, index) => {
                    const isAnswered = answers.some(
                      (a) => a.questionId === q.id && a.value.trim() !== ""
                    );
                    const isCurrent = index === currentQuestionIndex;
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          isCurrent
                            ? "bg-blue-600 text-white"
                            : isAnswered
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Submit Card */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                {lastSaved && (
                  <p className="text-xs text-gray-500 flex items-center">
                    <Save className="w-3 h-3 mr-1" />
                    Auto-saved at {lastSaved.toLocaleTimeString()}
                  </p>
                )}
                
                <Button
                  onClick={() => setShowSubmitDialog(true)}
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Quiz
                </Button>
                
                <p className="text-xs text-gray-500 text-center">
                  {answeredCount < totalQuestions
                    ? `${totalQuestions - answeredCount} questions unanswered`
                    : "All questions answered"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quiz?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your quiz? Once submitted, you cannot change your answers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm">
                <strong>Answered:</strong> {answeredCount} of {totalQuestions} questions
              </p>
              {answeredCount < totalQuestions && (
                <p className="text-sm text-yellow-600 mt-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  You have {totalQuestions - answeredCount} unanswered questions
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Continue Quiz
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Exit Warning Dialog */}
      <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Quiz?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave? Your progress will be saved, but the timer will continue running.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitWarning(false)}>
              Stay on Quiz
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowExitWarning(false);
                // Navigate away or close
                window.location.href = "/dashboard";
              }}
            >
              Leave Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
