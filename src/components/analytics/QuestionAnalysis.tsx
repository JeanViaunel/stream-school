"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { HelpCircle, CheckCircle2, AlertTriangle, XCircle, BarChart2 } from "lucide-react";

interface QuestionAnalysisProps {
  questionAnalysis: {
    questionId: string;
    questionText: string;
    totalResponses: number;
    correctCount: number;
    correctPercentage: number;
    difficulty: "easy" | "medium" | "hard";
  }[];
  totalStudents: number;
  isLoading?: boolean;
}

export function QuestionAnalysis({
  questionAnalysis,
  totalStudents,
  isLoading,
}: QuestionAnalysisProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (questionAnalysis.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Question Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No question data available</h3>
          <p className="text-sm text-muted-foreground">
            Question analysis is only available for multiple choice assignments with graded submissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall difficulty stats
  const easyQuestions = questionAnalysis.filter((q) => q.difficulty === "easy");
  const mediumQuestions = questionAnalysis.filter((q) => q.difficulty === "medium");
  const hardQuestions = questionAnalysis.filter((q) => q.difficulty === "hard");

  const averageCorrect = questionAnalysis.reduce((sum, q) => sum + q.correctPercentage, 0) / questionAnalysis.length;

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "hard":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-emerald-500";
      case "medium":
        return "bg-yellow-500";
      case "hard":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            Easy
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            Medium
          </Badge>
        );
      case "hard":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            Hard
          </Badge>
        );
      default:
        return null;
    }
  };

  // Find hardest and easiest questions
  const sortedByDifficulty = [...questionAnalysis].sort((a, b) => a.correctPercentage - b.correctPercentage);
  const hardestQuestion = sortedByDifficulty[0];
  const easiestQuestion = sortedByDifficulty[sortedByDifficulty.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Question Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{questionAnalysis.length}</p>
            <p className="text-xs text-muted-foreground">Total Questions</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <p className="text-2xl font-bold text-emerald-600">{easyQuestions.length}</p>
            <p className="text-xs text-emerald-600/70">Easy</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{mediumQuestions.length}</p>
            <p className="text-xs text-yellow-600/70">Medium</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{hardQuestions.length}</p>
            <p className="text-xs text-red-600/70">Hard</p>
          </div>
        </div>

        {/* Average Correct Rate */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Class Average Correct Rate</span>
            <span className={cn(
              "text-lg font-bold",
              averageCorrect >= 70 ? "text-emerald-600" :
              averageCorrect >= 50 ? "text-yellow-600" : "text-red-600"
            )}>
              {averageCorrect.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={averageCorrect} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {averageCorrect >= 80 
              ? "Questions are generally well-understood" 
              : averageCorrect >= 60 
                ? "Mixed understanding - some review may help"
                : "Students are struggling - consider reteaching"}
          </p>
        </div>

        {/* Hardest & Easiest Questions */}
        {hardestQuestion && easiestQuestion && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-700">Most Challenging</span>
              </div>
              <p className="text-sm text-red-900 line-clamp-2 mb-2">
                {hardestQuestion.questionText}
              </p>
              <div className="flex items-center gap-2">
                <Progress value={hardestQuestion.correctPercentage} className="h-1.5 flex-1" />
                <span className="text-xs font-medium text-red-700">
                  {hardestQuestion.correctPercentage}%
                </span>
              </div>
            </div>

            <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-emerald-700">Best Understood</span>
              </div>
              <p className="text-sm text-emerald-900 line-clamp-2 mb-2">
                {easiestQuestion.questionText}
              </p>
              <div className="flex items-center gap-2">
                <Progress value={easiestQuestion.correctPercentage} className="h-1.5 flex-1" />
                <span className="text-xs font-medium text-emerald-700">
                  {easiestQuestion.correctPercentage}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Question Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Question-by-Question Breakdown
          </h4>
          {questionAnalysis.map((question, index) => (
            <div
              key={question.questionId}
              className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-medium text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium line-clamp-2">
                      {question.questionText}
                    </p>
                    {getDifficultyBadge(question.difficulty)}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            {question.correctCount} of {question.totalResponses} correct
                          </span>
                          <span className={cn(
                            "font-medium",
                            question.correctPercentage >= 80 ? "text-emerald-600" :
                            question.correctPercentage >= 50 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {question.correctPercentage}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              getDifficultyColor(question.difficulty)
                            )}
                            style={{ width: `${question.correctPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {question.totalResponses < totalStudents && (
                      <p className="text-xs text-orange-600">
                        {totalStudents - question.totalResponses} student{totalStudents - question.totalResponses !== 1 ? "s" : ""} didn't answer this question
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface QuestionAnalysisCompactProps {
  averageCorrectRate: number;
  hardestQuestion?: string;
  easiestQuestion?: string;
  isLoading?: boolean;
}

export function QuestionAnalysisCompact({
  averageCorrectRate,
  hardestQuestion,
  easiestQuestion,
  isLoading,
}: QuestionAnalysisCompactProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className={cn(
                "text-2xl font-bold",
                averageCorrectRate >= 70 ? "text-emerald-600" :
                averageCorrectRate >= 50 ? "text-yellow-600" : "text-red-600"
              )}>
                {averageCorrectRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Correct Rate</p>
            </div>
          </div>
        </div>

        {hardestQuestion && (
          <div className="p-2 bg-red-50 rounded border border-red-100">
            <p className="text-xs text-red-600 font-medium mb-1">Most Challenging:</p>
            <p className="text-xs text-red-900 line-clamp-1">{hardestQuestion}</p>
          </div>
        )}

        {easiestQuestion && (
          <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
            <p className="text-xs text-emerald-600 font-medium mb-1">Best Understood:</p>
            <p className="text-xs text-emerald-900 line-clamp-1">{easiestQuestion}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
