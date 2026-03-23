"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useCall, useStreamVideoClient } from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Send, Lock, BarChart3, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGradeSkin } from "@/contexts/GradeSkinContext";
import { motion, AnimatePresence } from "framer-motion";

interface PollPanelProps {
  sessionId: Id<"sessions">;
  classId: Id<"classes">;
  isTeacher?: boolean;
}

interface Poll {
  _id: Id<"polls">;
  question: string;
  options: string[];
  isOpen: boolean;
}

export function PollPanel({ sessionId, classId, isTeacher = false }: PollPanelProps) {
  const { session } = useAuth();
  const { gradeBand, isBand } = useGradeSkin();
  const call = useCall();
  const videoClient = useStreamVideoClient();
  
  const polls = useQuery(api.polls.getPollsBySession, { sessionId });
  const createPoll = useMutation(api.polls.createPoll);
  const closePoll = useMutation(api.polls.closePoll);
  const submitPollResponse = useMutation(api.polls.submitPollResponse);

  // Teacher state
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isCreating, setIsCreating] = useState(false);

  // Student state
  const [activePollId, setActivePollId] = useState<Id<"polls"> | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState<Set<string>>(new Set());
  const [pollResults, setPollResults] = useState<Map<string, { counts: number[]; total: number }>>(new Map());

  // Listen for poll events
  useEffect(() => {
    if (!call) return;

    const unsubscribe = call.on("custom", (event) => {
      const payload = event.custom as { type: string; pollId?: string } | undefined;
      if (!payload) return;

      if (payload.type === "poll-launched" && payload.pollId) {
        setActivePollId(payload.pollId as Id<"polls">);
        setSelectedOption(null);
      } else if (payload.type === "poll-closed" && payload.pollId) {
        if (activePollId === payload.pollId) {
          setActivePollId(null);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [call, activePollId]);

  // Poll for results (for teacher view)
  useEffect(() => {
    if (!isTeacher || !polls) return;

    const interval = setInterval(async () => {
      for (const poll of polls) {
        if (poll.isOpen) {
          try {
            // Use a query to get results - in a real implementation you'd need a separate query
            // For now, we'll track locally
          } catch (error) {
            console.error("Failed to fetch poll results:", error);
          }
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isTeacher, polls]);

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleLaunchPoll = async () => {
    if (!question.trim() || options.some(o => !o.trim()) || !call) return;

    setIsCreating(true);
    try {
      const pollId = await createPoll({
        sessionId,
        classId,
        question: question.trim(),
        options: options.filter(o => o.trim()),
      });

      // Notify all participants
      await call.sendCustomEvent({
        type: "poll-launched",
        pollId,
      });

      // Reset form
      setQuestion("");
      setOptions(["", ""]);
    } catch (error) {
      console.error("Failed to launch poll:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClosePoll = async (pollId: Id<"polls">) => {
    if (!call) return;

    try {
      await closePoll({ pollId });
      await call.sendCustomEvent({
        type: "poll-closed",
        pollId,
      });
    } catch (error) {
      console.error("Failed to close poll:", error);
    }
  };

  const handleSubmitVote = async () => {
    if (activePollId === null || selectedOption === null) return;

    try {
      await submitPollResponse({
        pollId: activePollId,
        selectedOption,
      });
      setHasVoted(prev => new Set([...prev, activePollId]));
      setActivePollId(null);
    } catch (error) {
      console.error("Failed to submit vote:", error);
    }
  };

  // Get the active poll
  const activePoll = polls?.find(p => p._id === activePollId);
  const openPolls = polls?.filter(p => p.isOpen) || [];

  // Student view: Show poll modal when there's an active poll
  if (!isTeacher && activePoll && !hasVoted.has(activePoll._id)) {
    // Primary band: Full screen overlay with large buttons
    if (isBand("primary")) {
      return (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-lg" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">Quick Poll</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <p className="text-xl text-center font-medium">{activePoll.question}</p>
              <div className="grid gap-3">
                {activePoll.options.map((option, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedOption(index)}
                    className={`p-6 rounded-2xl text-lg font-medium transition-colors ${
                      selectedOption === index
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
              <Button
                size="lg"
                className="w-full h-16 text-xl"
                onClick={handleSubmitVote}
                disabled={selectedOption === null}
              >
                <Send className="mr-2 h-5 w-5" />
                Submit Vote
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    // Middle/High band: Standard dialog
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Poll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="font-medium">{activePoll.question}</p>
            <RadioGroup
              value={selectedOption?.toString()}
              onValueChange={(v) => setSelectedOption(parseInt(v))}
            >
              {activePoll.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
            <Button
              className="w-full"
              onClick={handleSubmitVote}
              disabled={selectedOption === null}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit Vote
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Teacher view
  if (isTeacher) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Live Polls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Poll Form */}
          <div className="space-y-3 border rounded-lg p-4">
            <Input
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => removeOption(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addOption}>
                <Plus className="mr-1 h-4 w-4" />
                Add Option
              </Button>
              <Button
                size="sm"
                onClick={handleLaunchPoll}
                disabled={!question.trim() || options.some(o => !o.trim()) || isCreating}
              >
                <Send className="mr-1 h-4 w-4" />
                Launch Poll
              </Button>
            </div>
          </div>

          {/* Active Polls */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {openPolls.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No active polls
                </div>
              ) : (
                openPolls.map((poll) => (
                  <Card key={poll._id} className="border-muted">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{poll.question}</p>
                          <Badge variant="secondary" className="mt-1">Live</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClosePoll(poll._id)}
                        >
                          <Lock className="mr-1 h-4 w-4" />
                          Close
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {poll.options.map((option, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{option}</span>
                            </div>
                            <Progress value={0} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // Student view when no active poll
  return (
    <Card className="w-full">
      <CardContent className="py-8">
        <div className="text-center text-muted-foreground">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>No active polls</p>
          {hasVoted.size > 0 && (
            <p className="text-sm mt-1">You&apos;ve voted in {hasVoted.size} poll(s)</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
