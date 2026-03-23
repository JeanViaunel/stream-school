"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  BookOpen,
  Users,
  GraduationCap,
  Hash,
  ChevronRight,
  School,
} from "lucide-react";
import { CalendarView } from "@/components/schedule/CalendarView";
import { CreateClassModal } from "@/components/class/CreateClassModal";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const [joinCode, setJoinCode] = useState("");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [createClassOpen, setCreateClassOpen] = useState(false);
  
  const teacherClasses = useQuery(
    api.classes.getClassesByTeacher,
    session?.role === "teacher" || session?.role === "school_admin" ? {} : "skip"
  );
  
  const studentClasses = useQuery(
    api.classes.getClassesByStudent,
    session?.role === "student" ? {} : "skip"
  );

  const enrollByJoinCode = useAction(api.classes.enrollByJoinCode);

  useEffect(() => {
    if (searchParams.get("join") === "true") {
      setShowJoinDialog(true);
    }
  }, [searchParams]);

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a join code");
      return;
    }

    try {
      const result = await enrollByJoinCode({ joinCode: joinCode.trim() });
      if (result.success && result.classId) {
        toast.success("Successfully joined class!");
        router.push(`/class/${result.classId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join class");
    }
  };

  if (!session) {
    return null;
  }

  // Role-specific dashboards
  if (session.role === "student") {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {session.displayName}!
          </h1>
          <p className="text-muted-foreground">
            Here are your classes for today
          </p>
        </header>

        <div className="mb-8">
          <CalendarView />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studentClasses?.map((cls) => (
            <Link key={cls._id} href={`/class/${cls._id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant="secondary">Grade {cls.gradeLevel}</Badge>
                  </div>
                  <CardTitle className="mt-3">{cls.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground capitalize mb-4">
                    {cls.subject}
                  </p>
                  {cls.teacherDisplayName && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Teacher: {cls.teacherDisplayName}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      No upcoming sessions
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Join class card */}
          <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
            <DialogTrigger>
              <Card className="border-dashed hover:border-primary/50 cursor-pointer h-full">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium">Join a Class</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter a join code from your teacher
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Join Code</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter 6-character code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="uppercase"
                    />
                    <Button onClick={handleJoinClass}>
                      Join
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  if (session.role === "teacher") {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Teacher Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your classes and sessions
            </p>
          </div>
          <Button onClick={() => setCreateClassOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Class
            </Button>
        </header>

        <div className="mb-8">
          <CalendarView />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teacherClasses?.map((cls) => (
            <Link key={cls._id} href={`/class/${cls._id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant="secondary">Grade {cls.gradeLevel}</Badge>
                  </div>
                  <CardTitle className="mt-3">{cls.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground capitalize mb-4">
                    {cls.subject}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {cls.joinCode}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Create class card */}
          <button
            type="button"
            className="w-full"
            onClick={() => setCreateClassOpen(true)}
          >
            <Card className="border-dashed hover:border-primary/50 cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium">Create New Class</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Set up a new class for your students
                </p>
              </CardContent>
            </Card>
          </button>
        </div>
        <CreateClassModal open={createClassOpen} onOpenChange={setCreateClassOpen} />
      </div>
    );
  }

  if (session.role === "parent") {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Parent Portal
          </h1>
          <p className="text-muted-foreground">
            View your children's progress and class schedules
          </p>
        </header>

        <div className="mb-8">
          <CalendarView />
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Parent portal features coming soon
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your organization
        </p>
      </header>

      <div className="mb-8">
        <CalendarView />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(teacherClasses?.length || 0) + (studentClasses?.length || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin">
              <Button variant="ghost" className="w-full justify-start">
                <School className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
