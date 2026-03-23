"use client";

import { useState, useEffect, useCallback } from "react";
import { useCall } from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, MessageCircle, Check, X, User, Volume2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGradeSkin } from "@/contexts/GradeSkinContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface Question {
  id: string;
  userId: string;
  userName: string;
  question: string;
  timestamp: number;
  anonymous: boolean;
  answered: boolean;
}

interface QAPanelProps {
  isTeacher?: boolean;
}

export function QAPanel({ isTeacher = false }: QAPanelProps) {
  const { session } = useAuth();
  const { isBand } = useGradeSkin();
  const call = useCall();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);

  // Listen for Q&A events
  useEffect(() => {
    if (!call) return;

    const unsubscribe = call.on("custom", (event) => {
      const payload = event.custom as { 
        type: string; 
        question?: string; 
        anonymous?: boolean;
        userId?: string;
        userName?: string;
        questionId?: string;
        highlightUserId?: string;
      } | undefined;
      
      if (!payload) return;

      if (payload.type === "question-submitted") {
        const newQ: Question = {
          id: payload.questionId || crypto.randomUUID(),
          userId: payload.userId || "unknown",
          userName: payload.anonymous ? "Anonymous" : (payload.userName || "Unknown"),
          question: payload.question || "",
          timestamp: Date.now(),
          anonymous: payload.anonymous || false,
          answered: false,
        };
        setQuestions(prev => [...prev, newQ]);
      } else if (payload.type === "question-answered") {
        setQuestions(prev => 
          prev.map(q => q.id === payload.questionId ? { ...q, answered: true } : q)
        );
      } else if (payload.type === "highlight-user") {
        setHighlightedUserId(payload.highlightUserId || null);
        // Clear highlight after 5 seconds
        setTimeout(() => setHighlightedUserId(null), 5000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [call]);

  const submitQuestion = async () => {
    if (!call || !newQuestion.trim() || !session) return;

    try {
      await call.sendCustomEvent({
        type: "question-submitted",
        question: newQuestion.trim(),
        anonymous: isAnonymous,
        userId: session.userId,
        userName: session.displayName,
        questionId: crypto.randomUUID(),
      });
      setNewQuestion("");
    } catch (error) {
      console.error("Failed to submit question:", error);
    }
  };

  const answerQuestion = async (questionId: string, userId: string) => {
    if (!call) return;

    try {
      await call.sendCustomEvent({
        type: "question-answered",
        questionId,
      });
      
      // Highlight the user's tile
      await call.sendCustomEvent({
        type: "highlight-user",
        highlightUserId: userId,
      });

      setQuestions(prev => 
        prev.map(q => q.id === questionId ? { ...q, answered: true } : q)
      );
    } catch (error) {
      console.error("Failed to answer question:", error);
    }
  };

  const skipQuestion = async (questionId: string) => {
    if (!call) return;

    try {
      await call.sendCustomEvent({
        type: "question-answered",
        questionId,
      });

      setQuestions(prev => 
        prev.map(q => q.id === questionId ? { ...q, answered: true } : q)
      );
    } catch (error) {
      console.error("Failed to skip question:", error);
    }
  };

  const pendingQuestions = questions.filter(q => !q.answered);
  const answeredQuestions = questions.filter(q => q.answered);

  // Student view - Primary band: Simplified interface
  if (!isTeacher && isBand("primary")) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Ask your teacher a question..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitQuestion()}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
                <Label htmlFor="anonymous" className="text-sm">Anonymous</Label>
              </div>
              <Button size="sm" onClick={submitQuestion} disabled={!newQuestion.trim()}>
                <Send className="mr-1 h-4 w-4" />
                Ask
              </Button>
            </div>
          </div>
          
          {pendingQuestions.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              Question sent! {pendingQuestions.length > 1 && `(${pendingQuestions.length} pending)`}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Student view - Middle/High band
  if (!isTeacher) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Q&A
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Ask a question..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitQuestion()}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
                <Label htmlFor="anonymous" className="text-sm">Ask anonymously</Label>
              </div>
              <Button size="sm" onClick={submitQuestion} disabled={!newQuestion.trim()}>
                <Send className="mr-1 h-4 w-4" />
                Send
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              <AnimatePresence>
                {[...pendingQuestions, ...answeredQuestions].map((q) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3 rounded-lg text-sm ${
                      q.answered ? "bg-muted/50" : "bg-muted"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          <User className="w-3 h-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs">{q.userName}</span>
                          {q.anonymous && <Badge variant="outline" className="text-[10px]">Anonymous</Badge>}
                          {q.answered && <Check className="w-3 h-3 text-green-500" />}
                        </div>
                        <p className="mt-1">{q.question}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(q.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {questions.length === 0 && (
                <div className="text-center text-muted-foreground py-4 text-sm">
                  No questions yet
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // Teacher view
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Q&A Queue
          </div>
          <Badge variant="secondary">{pendingQuestions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[350px]">
          <div className="space-y-3">
            <AnimatePresence>
              {pendingQuestions.map((q, index) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {index + 1}
                    </span>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{q.userName}</span>
                        {q.anonymous && <Badge variant="outline" className="text-[10px]">Anonymous</Badge>}
                      </div>
                      <p className="mt-1 text-sm">{q.question}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(q.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => skipQuestion(q.id)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => answerQuestion(q.id, q.userId)}
                      className={highlightedUserId === q.userId ? "ring-2 ring-yellow-400" : ""}
                    >
                      <Volume2 className="mr-1 h-3 w-3" />
                      Answer
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {pendingQuestions.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No pending questions
              </div>
            )}

            {answeredQuestions.length > 0 && (
              <>
                <div className="pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Answered</span>
                </div>
                {answeredQuestions.slice(-5).map((q) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 rounded-lg bg-muted/30 text-sm opacity-60"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      <span className="truncate">{q.question}</span>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
