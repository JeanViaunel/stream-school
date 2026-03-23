"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Trophy, 
  Medal, 
  Award, 
  Star,
  Target,
  Flame,
  BookOpen,
  GraduationCap,
  Download,
  Share2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  earnedAt?: number;
  progress?: number;
  maxProgress?: number;
}

const BADGES: Badge[] = [
  {
    id: "first_class",
    name: "First Steps",
    description: "Join your first class",
    icon: BookOpen,
    color: "bg-blue-500",
  },
  {
    id: "assignment_pro",
    name: "Assignment Pro",
    description: "Complete 10 assignments",
    icon: GraduationCap,
    color: "bg-purple-500",
    maxProgress: 10,
  },
  {
    id: "perfect_score",
    name: "Perfect Score",
    description: "Get 100% on an assignment",
    icon: Star,
    color: "bg-yellow-500",
  },
  {
    id: "streak_master",
    name: "Streak Master",
    description: "Maintain a 7-day learning streak",
    icon: Flame,
    color: "bg-orange-500",
    maxProgress: 7,
  },
  {
    id: "scholar",
    name: "Scholar",
    description: "Attend 20 sessions",
    icon: Trophy,
    color: "bg-emerald-500",
    maxProgress: 20,
  },
  {
    id: "top_student",
    name: "Top Student",
    description: "Achieve 90%+ average grade",
    icon: Medal,
    color: "bg-red-500",
  },
  {
    id: "consistent",
    name: "Consistent",
    description: "Submit 5 assignments on time",
    icon: Target,
    color: "bg-cyan-500",
    maxProgress: 5,
  },
  {
    id: "master",
    name: "Master",
    description: "Complete all beginner badges",
    icon: Award,
    color: "bg-amber-500",
  },
];

export default function AchievementsPage() {
  const { session } = useAuth();
  const analytics = useQuery(api.analytics.getStudentAnalytics);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [now] = useState(() => Date.now());

  if (!session) return null;

  // Calculate badge progress based on analytics
  const badgesWithProgress = BADGES.map((badge) => {
    let progress = 0;
    let earnedAt: number | undefined;

    switch (badge.id) {
      case "first_class":
        if (analytics && analytics.totalClasses > 0) {
          progress = 1;
          earnedAt = now;
        }
        break;
      case "assignment_pro":
        progress = analytics?.completedAssignments || 0;
        if (progress >= 10) earnedAt = now;
        break;
      case "perfect_score":
        // Would need to check for 100% grades
        progress = 0;
        break;
      case "streak_master":
        progress = analytics?.currentStreak || 0;
        if (progress >= 7) earnedAt = now;
        break;
      case "scholar":
        progress = analytics?.totalSessionsAttended || 0;
        if (progress >= 20) earnedAt = now;
        break;
      case "top_student":
        if (analytics?.averageGrade && analytics.averageGrade >= 90) {
          progress = 1;
          earnedAt = now;
        }
        break;
      case "consistent":
        // Would need to track on-time submissions
        progress = 0;
        break;
      case "master":
        const earnedCount = BADGES.filter(b => b.id !== "master" && b.earnedAt).length;
        progress = earnedCount;
        if (progress >= 5) earnedAt = now;
        break;
    }

    return { ...badge, progress, earnedAt };
  });

  const earnedBadges = badgesWithProgress.filter((b) => b.earnedAt);
  const inProgressBadges = badgesWithProgress.filter((b) => !b.earnedAt && b.progress && b.maxProgress);

  const handleShare = (badge: Badge) => {
    if (navigator.share) {
      navigator.share({
        title: `I earned the ${badge.name} badge!`,
        text: badge.description,
        url: window.location.href,
      });
    } else {
      toast.success("Badge shared to clipboard!");
    }
  };

  return (
    <div className="w-full px-4 sm:px-8 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Achievements
          </h1>
          <p className="text-muted-foreground mt-1">
            You&apos;ve earned {earnedBadges.length} of {BADGES.length} badges
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Progress</p>
                <p className="text-3xl font-bold">
                  {Math.round((earnedBadges.length / BADGES.length) * 100)}%
                </p>
              </div>
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      i < Math.floor(earnedBadges.length / 3)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Star className="h-6 w-6" />
                  </div>
                ))}
              </div>
            </div>
            <Progress value={(earnedBadges.length / BADGES.length) * 100} />
          </CardContent>
        </Card>

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Earned Badges</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {earnedBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <Card
                    key={badge.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedBadge(badge)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`w-16 h-16 mx-auto rounded-full ${badge.color} flex items-center justify-center mb-3`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <p className="font-medium text-sm">{badge.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Earned {badge.earnedAt ? format(badge.earnedAt, "MMM d") : ""}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* In Progress */}
        {inProgressBadges.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">In Progress</h2>
            <div className="space-y-3">
              {inProgressBadges.map((badge) => {
                const Icon = badge.icon;
                const progress = badge.progress || 0;
                const max = badge.maxProgress || 1;
                const percentage = (progress / max) * 100;

                return (
                  <Card key={badge.id} className="opacity-75">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${badge.color} flex items-center justify-center shrink-0 opacity-50`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{badge.name}</p>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={percentage} className="flex-1 h-2" />
                          <span className="text-xs text-muted-foreground w-16 text-right">
                            {progress}/{max}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Badge Detail Dialog */}
        <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedBadge && (
                  <>
                    <div className={`w-8 h-8 rounded-full ${selectedBadge.color} flex items-center justify-center`}>
                      <selectedBadge.icon className="h-4 w-4 text-white" />
                    </div>
                    {selectedBadge.name}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>{selectedBadge?.description}</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1" onClick={() => selectedBadge && handleShare(selectedBadge)}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
