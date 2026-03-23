"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Trophy, 
  Medal, 
  Award,
  TrendingUp,
  Clock,
  GraduationCap,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

type LeaderboardType = "grades" | "attendance" | "streak" | "assignments";

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  avatar?: string;
  score: number;
  isCurrentUser: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
        <Trophy className="h-4 w-4 text-white" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center">
        <Medal className="h-4 w-4 text-white" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
        <Award className="h-4 w-4 text-white" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
      <span className="text-sm font-bold text-muted-foreground">{rank}</span>
    </div>
  );
}

export default function LeaderboardPage() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("grades");
  
  // This would be populated from a real query
  const mockLeaderboard: LeaderboardEntry[] = [
    { rank: 1, studentId: "1", name: "Alex Johnson", score: 98.5, isCurrentUser: false },
    { rank: 2, studentId: "2", name: "Maria Garcia", score: 96.2, isCurrentUser: false },
    { rank: 3, studentId: "3", name: "James Wilson", score: 94.8, isCurrentUser: false },
    { rank: 4, studentId: "4", name: "Sophia Chen", score: 93.1, isCurrentUser: false },
    { rank: 5, studentId: "5", name: "You", score: 91.5, isCurrentUser: true },
    { rank: 6, studentId: "6", name: "Daniel Brown", score: 89.7, isCurrentUser: false },
    { rank: 7, studentId: "7", name: "Emma Davis", score: 87.3, isCurrentUser: false },
    { rank: 8, studentId: "8", name: "Michael Lee", score: 85.9, isCurrentUser: false },
    { rank: 9, studentId: "9", name: "Olivia Taylor", score: 84.2, isCurrentUser: false },
    { rank: 10, studentId: "10", name: "William Martinez", score: 82.6, isCurrentUser: false },
  ];

  if (!session) return null;

  const tabs = [
    { value: "grades", label: "Top Grades", icon: TrendingUp },
    { value: "attendance", label: "Attendance", icon: Clock },
    { value: "streak", label: "Streaks", icon: Flame },
    { value: "assignments", label: "Assignments", icon: GraduationCap },
  ];

  return (
    <div className="w-full px-4 sm:px-8 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">
            See how you rank against your classmates
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardType)}>
          <TabsList className="w-full grid grid-cols-4 mb-6">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Top Performers</span>
                <Badge variant="secondary">This Week</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {mockLeaderboard.map((entry, index) => (
                  <div
                    key={entry.studentId}
                    className={cn(
                      "flex items-center gap-4 p-4",
                      entry.isCurrentUser && "bg-primary/5"
                    )}
                  >
                    <RankBadge rank={entry.rank} />
                    
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(entry.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium truncate",
                        entry.isCurrentUser && "text-primary"
                      )}>
                        {entry.name}
                        {entry.isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activeTab === "grades" && "Average Grade"}
                        {activeTab === "attendance" && "Sessions Attended"}
                        {activeTab === "streak" && "Day Streak"}
                        {activeTab === "assignments" && "Completed"}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {activeTab === "grades" ? `${entry.score}%` : entry.score}
                      </p>
                      {index < 3 && (
                        <Badge 
                          variant={index === 0 ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          Top {index + 1}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Tabs>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">5th</p>
              <p className="text-xs text-muted-foreground">Your Rank</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">91.5%</p>
              <p className="text-xs text-muted-foreground">Your Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">+2</p>
              <p className="text-xs text-muted-foreground">Positions</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
