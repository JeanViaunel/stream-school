"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { 
  BookOpen, 
  GraduationCap, 
  Video, 
  Clock,
  TrendingUp,
  Target,
  Award,
  Flame,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  subtitle,
  color = "primary" 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  subtitle?: string;
  color?: "primary" | "blue" | "purple" | "green";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-600",
    purple: "bg-purple-500/10 text-purple-600",
    green: "bg-green-500/10 text-green-600",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyActivityChart({ data }: { data: Array<{ day: string; sessions: number; hours: number }> }) {
  const maxHours = Math.max(...data.map(d => d.hours), 1);
  
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Weekly Activity</h3>
      <div className="flex items-end gap-2 h-32">
        {data.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-primary/20 rounded-t-md transition-all duration-500"
              style={{ height: `${(day.hours / maxHours) * 100}%` }}
            />
            <span className="text-xs text-muted-foreground">{day.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GradeDistribution({ distribution }: { 
  distribution: { 
    excellent: number; 
    good: number; 
    average: number; 
    belowAverage: number; 
    failing: number;
  } 
}) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const categories = [
    { label: "Excellent (90-100%)", value: distribution.excellent, color: "bg-emerald-500" },
    { label: "Good (80-89%)", value: distribution.good, color: "bg-blue-500" },
    { label: "Average (70-79%)", value: distribution.average, color: "bg-yellow-500" },
    { label: "Below Average (60-69%)", value: distribution.belowAverage, color: "bg-orange-500" },
    { label: "Failing (<60%)", value: distribution.failing, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Grade Distribution</h3>
      {categories.map((cat) => (
        <div key={cat.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{cat.label}</span>
            <span className="font-medium">{cat.value}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${cat.color} transition-all duration-500`}
              style={{ width: `${(cat.value / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StudentAnalyticsPage() {
  const { session } = useAuth();
  const analytics = useQuery(api.analytics.getStudentAnalytics);

  if (!session) return null;

  if (analytics === undefined) {
    return (
      <div className="w-full px-4 sm:px-8 py-6 sm:py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (analytics === null) {
    return (
      <div className="w-full px-4 sm:px-8 py-6 sm:py-10">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Analytics are only available for students</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const completionRate = analytics.totalAssignments > 0 
    ? Math.round((analytics.completedAssignments / analytics.totalAssignments) * 100)
    : 0;

  return (
    <div className="w-full px-4 sm:px-8 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight gradient-text flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Your Learning Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your progress and achievements
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Classes"
            value={analytics.totalClasses}
            icon={BookOpen}
            color="primary"
          />
          <StatCard
            title="Assignments"
            value={`${analytics.completedAssignments}/${analytics.totalAssignments}`}
            icon={GraduationCap}
            subtitle={`${completionRate}% completed`}
            color="blue"
          />
          <StatCard
            title="Sessions"
            value={analytics.totalSessionsAttended}
            icon={Video}
            color="purple"
          />
          <StatCard
            title="Hours Learned"
            value={analytics.totalHoursLearned}
            icon={Clock}
            subtitle="Total time"
            color="green"
          />
        </div>

        {/* Progress and Streaks */}
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Assignment Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completed</span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {analytics.completedAssignments} of {analytics.totalAssignments} assignments submitted
                </p>
              </div>

              {analytics.averageGrade && (
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Average Grade</span>
                    <span className="font-medium">{analytics.averageGrade.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={analytics.averageGrade} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Based on {analytics.completedAssignments} graded assignments
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Learning Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{analytics.currentStreak}</p>
                  <p className="text-sm text-muted-foreground">Day streak</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold">{analytics.longestStreak}</p>
                  <p className="text-sm text-muted-foreground">Best streak</p>
                </div>
              </div>
              <div className="flex gap-1">
                {analytics.weeklyActivity.map((day, i) => (
                  <div 
                    key={i}
                    className={`flex-1 h-8 rounded-md flex items-center justify-center text-xs font-medium ${
                      day.sessions > 0 || day.assignments > 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                    title={`${day.day}: ${day.sessions} sessions, ${day.assignments} assignments`}
                  >
                    {day.day.charAt(0)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Activity & Grade Distribution */}
        <div className="grid sm:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Weekly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyActivityChart data={analytics.weeklyActivity} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" />
                Grade Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GradeDistribution distribution={analytics.gradeDistribution} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
