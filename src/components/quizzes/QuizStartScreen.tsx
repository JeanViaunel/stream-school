"use client";

import { useState } from "react";
import { Clock, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuizStartScreenProps {
  title: string;
  instructions: string;
  timeLimitMinutes: number;
  questionCount: number;
  onStart: () => void;
  isStarting?: boolean;
}

export function QuizStartScreen({
  title,
  instructions,
  timeLimitMinutes,
  questionCount,
  onStart,
  isStarting = false,
}: QuizStartScreenProps) {
  const [showRules, setShowRules] = useState(false);
  
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return `${hours} hour${hours > 1 ? "s" : ""} ${remainingMinutes} min`;
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-blue-100">Time-Limited Assessment</p>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quiz Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Time Limit</p>
                <p className="font-semibold text-gray-900">{formatTime(timeLimitMinutes)}</p>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Questions</p>
                <p className="font-semibold text-gray-900">{questionCount} questions</p>
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          {instructions && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Instructions</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{instructions}</p>
            </div>
          )}
          
          {/* Rules Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Quiz Rules</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 text-sm">
                  Once you start, the timer cannot be paused
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 text-sm">
                  Your answers are automatically saved as you progress
                </p>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 text-sm">
                  The quiz will auto-submit when time expires
                </p>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 text-sm">
                  Do not refresh the page or navigate away during the quiz
                </p>
              </div>
            </div>
          </div>
          
          {/* Warnings */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">Important</p>
              <p className="text-sm text-yellow-700 mt-1">
                Make sure you have a stable internet connection before starting. 
                Closing the browser or losing connection may result in lost progress.
              </p>
            </div>
          </div>
          
          {/* Start Button */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={onStart}
              disabled={isStarting}
              className="w-full py-6 text-lg font-semibold"
            >
              {isStarting ? "Starting..." : "Start Quiz"}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowRules(true)}
              className="w-full"
            >
              View Full Rules
            </Button>
          </div>
        </div>
      </div>
      
      {/* Full Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quiz Rules & Guidelines</DialogTitle>
            <DialogDescription>
              Please read these rules carefully before starting
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Before Starting</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Ensure you have a stable internet connection</li>
                <li>Close all unnecessary browser tabs and applications</li>
                <li>Prepare any allowed materials (if applicable)</li>
                <li>Find a quiet place to take the quiz</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">During the Quiz</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>The timer starts immediately when you click Start</li>
                <li>You cannot pause the timer once started</li>
                <li>Answers are saved automatically as you go</li>
                <li>You can navigate between questions freely</li>
                <li>Do not use the browser back button</li>
                <li>Do not refresh the page</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Time Management</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Yellow warning appears when 5 minutes remain</li>
                <li>Red warning appears when 1 minute remains</li>
                <li>The quiz auto-submits when time runs out</li>
                <li>Any unsaved answers will be submitted automatically</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Submission</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Review your answers before submitting</li>
                <li>You can submit early if you finish before time expires</li>
                <li>Once submitted, you cannot change your answers</li>
                <li>You will see your score immediately for auto-graded quizzes</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
