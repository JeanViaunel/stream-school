"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AutoGradeIndicator } from "./AutoGradeIndicator";
import { Bot, CheckCircle2, XCircle, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface TeacherGradingInterfaceProps {
  submissionId: Id<"submissions">;
  onBack?: () => void;
  onGraded?: () => void;
}

export function TeacherGradingInterface({
  submissionId,
  onBack,
  onGraded,
}: TeacherGradingInterfaceProps) {
  const data = useQuery(api.submissions.getSubmissionDetailsForGrading, { submissionId });
  const gradeSubmission = useMutation(api.submissions.gradeSubmission);
  
  const [teacherScore, setTeacherScore] = useState<string>("");
  const [teacherFeedback, setTeacherFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (data === undefined) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-96" />
      </Card>
    );
  }

  if (data === null) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Submission not found</p>
        </CardContent>
      </Card>
    );
  }

  const { submission, assignment, student } = data;
  const currentScore = submission.teacherScore ?? submission.autoScore;
  
  // Calculate correct answers
  let correctCount = 0;
  if (assignment.type === "multiple_choice" && submission.autoScore !== undefined) {
    correctCount = Math.round((submission.autoScore / 100) * assignment.questions.length);
  }

  const handleSubmitGrade = async () => {
    const score = parseInt(teacherScore);
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error("Please enter a valid score between 0 and 100");
      return;
    }

    setIsSubmitting(true);
    try {
      await gradeSubmission({
        submissionId,
        teacherScore: score,
        teacherFeedback: teacherFeedback || undefined,
      });
      toast.success("Grade saved successfully");
      onGraded?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save grade");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAnswerStatus = (questionId: string, correctOption?: number) => {
    const answer = submission.answers.find(a => a.questionId === questionId);
    if (!answer) return { status: "unanswered" as const, icon: null };
    
    if (correctOption === undefined) {
      return { status: "submitted" as const, icon: null };
    }
    
    const isCorrect = parseInt(answer.value) === correctOption;
    return {
      status: isCorrect ? "correct" as const : "incorrect" as const,
      icon: isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold">Grade Submission</h2>
          <p className="text-muted-foreground">
            {assignment.title} • {student.displayName}
          </p>
        </div>
      </div>

      {/* Score Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Score Overview</CardTitle>
            <AutoGradeIndicator
              autoScore={submission.autoScore}
              autoGradedAt={submission.autoGradedAt}
              teacherScore={submission.teacherScore}
              isTeacherOverride={submission.isTeacherOverride}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Score */}
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="text-6xl font-bold">
                {currentScore ?? "--"}%
              </div>
              <p className="text-muted-foreground mt-2">Current Score</p>
            </div>
          </div>

          {/* Auto-grade Info */}
          {submission.autoScore !== undefined && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Auto-Grade Result</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-800">
                  {correctCount} / {assignment.questions.length} correct
                </span>
                <span className="font-semibold text-blue-900">
                  {submission.autoScore}%
                </span>
              </div>
              <Progress value={submission.autoScore} className="h-2 mt-2" />
            </div>
          )}

          {/* Override Form */}
          <Separator />
          <div className="space-y-4">
            <h3 className="font-semibold">Teacher Override</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="score">Score (0-100)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  placeholder={submission.autoScore?.toString() ?? "Enter score"}
                  value={teacherScore}
                  onChange={(e) => setTeacherScore(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Quick Actions</Label>
                <div className="flex gap-2">
                  {submission.autoScore !== undefined && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTeacherScore(submission.autoScore!.toString())}
                    >
                      Use Auto ({submission.autoScore}%)
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTeacherScore("100")}
                  >
                    Full (100%)
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Enter feedback for the student..."
                value={teacherFeedback}
                onChange={(e) => setTeacherFeedback(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleSubmitGrade}
              disabled={isSubmitting || !teacherScore}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Grade"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question Review */}
      {assignment.type === "multiple_choice" && (
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignment.questions.map((question, index) => {
              const answer = submission.answers.find(a => a.questionId === question.id);
              const status = getAnswerStatus(question.id, question.correctOption);
              
              return (
                <div key={question.id} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {status.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        Question {index + 1}: {question.text}
                      </p>
                      
                      {question.options && (
                        <div className="mt-2 space-y-1">
                          {question.options.map((option, optIndex) => {
                            const isSelected = answer && parseInt(answer.value) === optIndex;
                            const isCorrect = question.correctOption === optIndex;
                            
                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-2 text-sm p-2 rounded ${
                                  isCorrect 
                                    ? "bg-green-50 text-green-800" 
                                    : isSelected 
                                      ? "bg-red-50 text-red-800"
                                      : ""
                                }`}
                              >
                                <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                                <span>{option}</span>
                                {isCorrect && (
                                  <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                    Correct
                                  </Badge>
                                )}
                                {isSelected && !isCorrect && (
                                  <Badge variant="outline" className="text-xs border-red-500 text-red-600">
                                    Student&apos;s Answer
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
