"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { 
  Users, 
  Plus, 
  Loader2, 
  GraduationCap,
  TrendingUp,
  BookOpen,
  Bell
} from "lucide-react";
import { StudentOverview } from "@/components/parent/StudentOverview";
import { ClassProgressCard } from "@/components/parent/ClassProgressCard";
import { GradeHistory } from "@/components/parent/GradeHistory";
import { ParentNav } from "@/components/parent/ParentNav";

export default function ParentDashboardPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [studentUsername, setStudentUsername] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Redirect non-parents
  useEffect(() => {
    if (session && session.role !== "parent") {
      router.push("/dashboard");
    }
  }, [session, router]);

  // Query parent dashboard data
  const dashboardData = useQuery(
    api.parents.getParentDashboard,
    session?.role === "parent" ? {} : "skip"
  );

  // Query linked students
  const linkedStudents = useQuery(
    api.parents.getLinkedStudents,
    session?.role === "parent" ? {} : "skip"
  );

  // Mutation for linking student
  const linkStudent = useMutation(api.parents.linkStudentToParent);

  const handleLinkChild = async () => {
    if (!studentUsername.trim()) {
      toast.error("Please enter a student username");
      return;
    }

    setIsLinking(true);
    try {
      const result = await linkStudent({
        studentUsername: studentUsername.trim(),
        consentMethod: "parent_request",
      });
      
      toast.success(result.message);
      setShowLinkDialog(false);
      setStudentUsername("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link child account");
    } finally {
      setIsLinking(false);
    }
  };

  // Set first student as selected when data loads
  useEffect(() => {
    if (dashboardData?.linkedStudents.length && !selectedStudentId) {
      setSelectedStudentId(dashboardData.linkedStudents[0].studentId);
    }
  }, [dashboardData, selectedStudentId]);

  if (!session) {
    return null;
  }

  if (session.role !== "parent") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedStudent = dashboardData?.linkedStudents.find(
    s => s.studentId === selectedStudentId
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Parent Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your children&apos;s progress and stay connected with their education
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Link Child
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link to Child Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Enter your child&apos;s username to request access to their account information.
                  They will need to approve this request.
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Child&apos;s Username</label>
                  <Input
                    placeholder="Enter username"
                    value={studentUsername}
                    onChange={(e) => setStudentUsername(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleLinkChild} 
                  disabled={isLinking}
                  className="w-full"
                >
                  {isLinking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    "Send Link Request"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Navigation */}
      <ParentNav 
        students={linkedStudents || []}
        selectedStudentId={selectedStudentId}
        onSelectStudent={setSelectedStudentId}
      />

      {/* Dashboard Stats */}
      {dashboardData && (
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Linked Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.dashboardStats.totalStudents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Total Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.dashboardStats.totalClasses}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Avg. Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.dashboardStats.averageProgress}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Recent Grades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.dashboardStats.recentGradesCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {selectedStudent && dashboardData ? (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="grades" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Grades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <StudentOverview 
              student={{
                studentId: selectedStudent.studentId,
                name: selectedStudent.name,
                gradeLevel: selectedStudent.gradeLevel,
                avatarUrl: selectedStudent.avatarUrl,
              }}
              classes={selectedStudent.classes}
            />
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {selectedStudent.classes.map((cls) => (
                <ClassProgressCard
                  key={cls.classId}
                  classId={cls.classId}
                  className={cls.className}
                  subject={cls.subject}
                  teacherName={cls.teacherName}
                  teacherId={cls.teacherId}
                  progress={cls.progress}
                  assignmentProgress={cls.assignmentProgress}
                  attendanceProgress={cls.attendanceProgress}
                  recentGrades={cls.recentGrades}
                  attendanceRate={cls.attendanceRate}
                  totalSessions={cls.totalSessions}
                  attendedSessions={cls.attendedSessions}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="grades" className="space-y-6">
            <GradeHistory 
              studentId={selectedStudent.studentId}
              studentName={selectedStudent.name}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="text-center p-12">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Students Linked</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Link to your child&apos;s account to view their progress, grades, and class information.
            Your child will need to approve the link request.
          </p>
          <Button onClick={() => setShowLinkDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Link Child Account
          </Button>
        </Card>
      )}

      {/* Recent Announcements */}
      {dashboardData && dashboardData.recentAnnouncements.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentAnnouncements.slice(0, 5).map((announcement) => (
                <div 
                  key={announcement.announcementId} 
                  className="p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{announcement.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {announcement.className} • {announcement.authorName}
                      </p>
                      <p className="text-sm mt-2">{announcement.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(announcement.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
