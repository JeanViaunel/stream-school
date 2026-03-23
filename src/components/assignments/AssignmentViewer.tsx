"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, Send, Timer } from "lucide-react";
import { useGradeSkin } from "@/contexts/GradeSkinContext";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { TimeLimitedQuizView } from "@/components/quizzes/TimeLimitedQuizView";

interface AssignmentViewerProps {
  assignmentId: Id<"assignments">;
}

interface Answer {
  questionId: string;
  value: string;
}

export function AssignmentViewer({ assignmentId }: AssignmentViewerProps) {
  const { gradeBand, isBand } = useGradeSkin();
  const assignment = useQuery(api.assignments.getAssignmentById, { assignmentId });
  const mySubmission = useQuery(api.submissions.getMySubmission, { assignmentId });
  const submitAnswers = useMutation(api.submissions.submitAnswers);
  
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  if (assignment === undefined) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading assignment...</div>
        </CardContent>
      </Card>
    );
  }

  if (assignment === null) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Assignment not found</div>
        </CardContent>
      </Card>
    );
  }

  // If this is a time-limited quiz and student hasn't submitted yet, show the time-limited view
  if (assignment.timeLimitMinutes && !mySubmission) {
    return (
      <TimeLimitedQuizView 
        assignmentId={assignmentId} 
        onSubmitted={() => window.location.reload()}
      />
    );
  }

  // Show submission results if already submitted
  if (mySubmission) {
    const score = mySubmission.teacherScore ?? mySubmission.autoScore;
    const totalQuestions = assignment.questions.length;
    const correctAnswers = mySubmission.answers.filter(a => {
      const question = assignment.questions.find(q => q.id === a.questionId);
      if (!question || question.correctOption === undefined) return false;
      return parseInt(a.value) === question.correctOption;
    }).length;

    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Assignment Submitted</CardTitle>
          <CardDescription>
            Submitted on {format(mySubmission.submittedAt, "PPP 'at' p")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {score !== undefined && (
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-primary">{score}%</div>
              <div className="text-sm text-muted-foreground">Your Score</div>
              {assignment.type === "multiple_choice" && (
                <div className="text-sm">
                  {correctAnswers} out of {totalQuestions} correct
                </div>
              )}
            </div>
          )}
          
          {mySubmission.teacherFeedback && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="font-medium mb-1">Teacher Feedback:</div>
              <div className="text-sm text-muted-foreground">{mySubmission.teacherFeedback}</div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-medium">Your Answers:</h3>
            {assignment.questions.map((question, index) => {
              const answer = mySubmission.answers.find(a => a.questionId === question.id);
              const isCorrect = question.correctOption !== undefined && 
                answer && parseInt(answer.value) === question.correctOption;

              return (
                <div key={question.id} className="border rounded-lg p-4 space-y-2">
                  <div className="font-medium">
                    {index + 1}. {question.text}
                  </div>
                  {assignment.type === "multiple_choice" && question.options ? (
                    <div className="pl-4 space-y-1">
                      {question.options.map((opt, oIndex) => (
                        <div
                          key={oIndex}
                          className={`text-sm ${
                            oIndex === question.correctOption
                              ? "text-green-600 font-medium"
                              : answer?.value === oIndex.toString()
                              ? "text-red-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {oIndex === question.correctOption && "✓ "}
                          {answer?.value === oIndex.toString() && oIndex !== question.correctOption && "✗ "}
                          {opt}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pl-4 text-sm text-muted-foreground">
                      {answer?.value || "No answer provided"}
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
    if (!allQuestionsAnswered) return;
    
    setIsSubmitting(true);
    try {
      await submitAnswers({
        assignmentId,
        answers: assignment.questions.map(q => ({
          questionId: q.id,
          value: getAnswer(q.id),
        })),
      });
      
      if (isBand("primary")) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    } catch (error) {
      console.error("Failed to submit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = assignment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assignment.questions.length) * 100;

  // Primary band: One question at a time with wizard
  if (isBand("primary")) {
    return (
      <Card className="w-full max-w-2xl relative overflow-hidden">
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-background/90"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 1, repeat: 2 }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>
                <h2 className="text-2xl font-bold text-primary">Great Job!</h2>
                <p className="text-muted-foreground">Assignment submitted!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <CardHeader>
          <CardTitle className="text-xl">{assignment.title}</CardTitle>
          <CardDescription className="flex items-center gap-2 flex-wrap">
            {assignment.dueDateAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due {format(assignment.dueDateAt, "PPP")}
              </span>
            )}
            {assignment.timeLimitMinutes && (
              <span className="flex items-center gap-1 text-amber-600">
                <Timer className="h-3 w-3" />
                {assignment.timeLimitMinutes} min time limit
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Question {currentQuestionIndex + 1} of {assignment.questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-lg font-medium min-h-[80px] flex items-center">
                {currentQuestion.text}
              </div>

              {assignment.type === "multiple_choice" && currentQuestion.options ? (
                <RadioGroup
                  value={getAnswer(currentQuestion.id)}
                  onValueChange={(v) => updateAnswer(currentQuestion.id, v)}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option, index) => (
                    <div key={index}>
                      <Label
                        htmlFor={`${currentQuestion.id}-${index}`}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors hover:bg-muted data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"
                        data-state={getAnswer(currentQuestion.id) === index.toString() ? "checked" : "unchecked"}
                      >
                        <RadioGroupItem
                          value={index.toString()}
                          id={`${currentQuestion.id}-${index}`}
                          className="size-6"
                        />
                        <span className="text-lg">{option}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Textarea
                  placeholder="Type your answer here..."
                  value={getAnswer(currentQuestion.id)}
                  onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
                  className="min-h-[150px] text-lg"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          
          {currentQuestionIndex < assignment.questions.length - 1 ? (
            <Button
              size="lg"
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              disabled={!getAnswer(currentQuestion.id)}
            >
              Next
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered || isSubmitting}
              className="bg-green-500 hover:bg-green-600"
            >
              <Send className="mr-2 h-5 w-5" />
              Submit
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  // Middle and High bands: All questions visible
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{assignment.title}</CardTitle>
            <CardDescription className="mt-1">{assignment.instructions}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {assignment.dueDateAt && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due {format(assignment.dueDateAt, "PPP")}
              </Badge>
            )}
            {assignment.timeLimitMinutes && (
              <Badge variant="secondary" className="flex items-center gap-1 text-amber-600">
                <Timer className="h-3 w-3" />
                {assignment.timeLimitMinutes} min limit
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {assignment.questions.map((question, index) => (
          <div key={question.id} className="space-y-3 border-b last:border-0 pb-6 last:pb-0">
            <div className="flex items-start gap-2">
              <span className="font-medium text-muted-foreground">{index + 1}.</span>
              <div className="font-medium">{question.text}</div>
            </div>
            
            {assignment.type === "multiple_choice" && question.options ? (
              <RadioGroup
                value={getAnswer(question.id)}
                onValueChange={(v) => updateAnswer(question.id, v)}
                className="pl-6 space-y-2"
              >
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={oIndex.toString()}
                      id={`${question.id}-${oIndex}`}
                    />
                    <Label htmlFor={`${question.id}-${oIndex}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="pl-6">
                <Textarea
                  placeholder="Type your answer here..."
                  value={getAnswer(question.id)}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {!allQuestionsAnswered && (
          <div className="flex items-center gap-1 text-sm text-amber-500 mr-auto">
            <AlertCircle className="h-4 w-4" />
            Answer all questions before submitting
          </div>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!allQuestionsAnswered || isSubmitting}
        >
          <Send className="mr-2 h-4 w-4" />
          Submit Assignment
        </Button>
      </CardFooter>
    </Card>
  );
}
