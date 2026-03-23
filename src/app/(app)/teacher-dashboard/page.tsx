"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen,
  Video,
  Users,
  Clock,
  FileText,
  UserCircle,
  Plus,
  GraduationCap,
  Play,
  BarChart3,
  TrendingUp,
  Calendar,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  color?: "primary" | "blue" | "purple" | "green" | "orange";
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  color = "primary",
}: StatCardProps) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-600",
    purple: "bg-purple-500/10 text-purple-600",
    green: "bg-green-500/10 text-green-600",
    orange: "bg-orange-500/10 text-orange-600",
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

interface WeeklyActivityChartProps {
  data: Array<{ day: string; sessionsHosted: number; hoursTaught: number }>;
}

function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  const maxHours = Math.max(...data.map((d) => d.hoursTaught), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Weekly Activity
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/60" />
            <span className="text-muted-foreground">Sessions</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-muted-foreground">Hours</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-3 h-40">
        {data.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex flex-col gap-1">
              {/* Sessions bar */}
              <div
                className="w-full bg-primary/60 rounded-t-sm transition-all duration-500"
                style={{
                  height: `${Math.max((day.sessionsHosted / Math.max(...data.map((d) => d.sessionsHosted), 1)) * 40, 4)}%`,
                }}
                title={`${day.sessionsHosted} sessions`}
              />
              {/* Hours bar */}
              <div
                className="w-full bg-primary rounded-b-sm transition-all duration-500"
                style={{ height: `${(day.hoursTaught / maxHours) * 60}%` }}
                title={`${day.hoursTaught} hours`}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(day.day).toLocaleDateString("en-US", {
                weekday: "short",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ClassPerformanceTableProps {
  classes: Array<{
    classId: string;
    className: string;
    averageAttendanceRate: number;
    averageGrade: number;
  }>;
}

function ClassPerformanceTable({ classes }: ClassPerformanceTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class Name</TableHead>
            <TableHead className="text-center">Attendance Rate</TableHead>
            <TableHead className="text-center">Average Grade</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground py-8"
              >
                No classes found. Create your first class to see performance
                metrics.
              </TableCell>
            </TableRow>
          ) : (
            classes.map((cls) => (
              <TableRow
                key={cls.classId}
                className="cursor-pointer"
                onClick={() => router.push(`/class/${cls.classId}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">{cls.className}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={
                      cls.averageAttendanceRate >= 80
                        ? "default"
                        : cls.averageAttendanceRate >= 60
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {cls.averageAttendanceRate}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={`font-medium ${
                      cls.averageGrade >= 80
                        ? "text-green-600"
                        : cls.averageGrade >= 60
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {cls.averageGrade}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function QuickActions() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Button
        variant="outline"
        className="h-auto py-4 flex-col items-center gap-2 border-dashed hover:border-primary hover:bg-primary/5"
        onClick={() => router.push("/class/create")}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-medium">Create Class</p>
          <p className="text-xs text-muted-foreground">
            Start a new classroom
          </p>
        </div>
      </Button>

      <Button
        variant="outline"
        className="h-auto py-4 flex-col items-center gap-2 border-dashed hover:border-primary hover:bg-primary/5"
        onClick={() => router.push("/gradebook")}
      >
        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-purple-600" />
        </div>
        <div className="text-center">
          <p className="font-medium">View Gradebook</p>
          <p className="text-xs text-muted-foreground">
            Manage student grades
          </p>
        </div>
      </Button>

      <Button
        variant="outline"
        className="h-auto py-4 flex-col items-center gap-2 border-dashed hover:border-primary hover:bg-primary/5"
        onClick={() => router.push("/meetings")}
      >
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <Play className="w-5 h-5 text-green-600" />
        </div>
        <div className="text-center">
          <p className="font-medium">Start Session</p>
          <p className="text-xs text-muted-foreground">Begin a live class</p>
        </div>
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>

      {/* Weekly Activity Skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>

      {/* Class Performance Skeleton */}
      <Skeleton className="h-48" />

      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="w-full px-4 md:px-6 py-6">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">
            Unable to Load Dashboard
          </h2>
          <p className="text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function UnauthorizedState() {
  return (
    <div className="w-full px-4 md:px-6 py-6">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Teacher Access Only</h2>
          <p className="text-muted-foreground">
            This dashboard is only available for teachers, co-teachers, and
            administrators.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const { session } = useAuth();
  const teacherStats = useQuery(api.users.getTeacherStats);
  const teacherAnalytics = useQuery(api.analytics.getTeacherAnalytics);

  if (!session) {
    return null;
  }

  // Check if user is a teacher, co-teacher, or admin
  const allowedRoles = ["teacher", "co_teacher", "admin"];
  if (!allowedRoles.includes(session.role || "")) {
    return <UnauthorizedState />;
  }

  // Loading state
  if (teacherStats === undefined || teacherAnalytics === undefined) {
    return <LoadingState />;
  }

  // Error state - if both queries return null, user is not authorized
  if (teacherStats === null && teacherAnalytics === null) {
    return <UnauthorizedState />;
  }

  // Handle partial data
  const stats = teacherStats || {
    classesTaught: 0,
    sessionsHosted: 0,
    totalStudentsReached: 0,
    totalTeachingHours: 0,
    assignmentsCreated: 0,
    averageClassSize: 0,
  };

  const analytics = teacherAnalytics || {
    classesTaught: 0,
    totalSessionsHosted: 0,
    totalStudentsReached: 0,
    totalTeachingHours: 0,
    averageSessionDuration: 0,
    weeklyActivity: [],
    classPerformance: [],
  };

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Teacher Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your teaching performance and class analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Calendar className="w-3 h-3" />
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Badge>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Classes"
          value={stats.classesTaught}
          icon={BookOpen}
          subtitle="Total taught"
          color="primary"
        />
        <StatCard
          title="Sessions"
          value={stats.sessionsHosted}
          icon={Video}
          subtitle="Hosted"
          color="blue"
        />
        <StatCard
          title="Students"
          value={stats.totalStudentsReached}
          icon={Users}
          subtitle="Unique reached"
          color="purple"
        />
        <StatCard
          title="Hours"
          value={stats.totalTeachingHours}
          icon={Clock}
          subtitle="Total teaching"
          color="green"
        />
        <StatCard
          title="Assignments"
          value={stats.assignmentsCreated}
          icon={FileText}
          subtitle="Created"
          color="orange"
        />
        <StatCard
          title="Avg Class Size"
          value={stats.averageClassSize}
          icon={UserCircle}
          subtitle="Students per class"
          color="primary"
        />
      </div>

      {/* Weekly Activity Chart & Session Duration */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Weekly Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.weeklyActivity.length > 0 ? (
              <WeeklyActivityChart data={analytics.weeklyActivity} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No activity data available yet</p>
                <p className="text-sm">
                  Start hosting sessions to see your weekly activity
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Session Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Average Session Duration</p>
                  <p className="text-sm text-muted-foreground">
                    Based on completed sessions
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold">
                {analytics.averageSessionDuration}m
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Total Sessions Hosted</p>
                  <p className="text-sm text-muted-foreground">
                    All-time sessions
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold">
                {analytics.totalSessionsHosted}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Total Teaching Hours</p>
                  <p className="text-sm text-muted-foreground">
                    Cumulative hours
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold">
                {analytics.totalTeachingHours}h
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Class Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClassPerformanceTable classes={analytics.classPerformance} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <QuickActions />
      </section>
    </div>
  );
}
