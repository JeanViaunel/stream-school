"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  BookOpen, 
  School,
  ChevronRight,
  Plus,
  Shield,
  ShieldAlert
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const { session } = useAuth();

  // Redirect non-admins
  useEffect(() => {
    if (session && session.role !== "school_admin" && session.role !== "platform_admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  const users = useQuery(
    api.admin.getAllUsers,
    session?.role === "school_admin" || session?.role === "platform_admin" ? {} : "skip"
  );

  const classes = useQuery(
    api.admin.getAllClasses,
    session?.role === "school_admin" || session?.role === "platform_admin" ? {} : "skip"
  );

  if (!session) {
    return null;
  }

  if (session.role !== "school_admin" && session.role !== "platform_admin") {
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

  const activeUsers = users?.filter(u => u.isActive).length || 0;
  const totalUsers = users?.length || 0;
  const activeClasses = classes?.filter(c => !c.isArchived).length || 0;
  const totalClasses = classes?.length || 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your organization settings, users, and classes
        </p>
      </header>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {activeUsers} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClasses}</div>
            <p className="text-xs text-muted-foreground">
              {activeClasses} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter(u => u.role === "student").length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter(u => u.role === "teacher").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Invite new users, manage existing accounts, and activate or deactivate users.
            </p>
            <div className="flex gap-2">
              <Link href="/admin/users" className="flex-1">
                <Button variant="outline" className="w-full">
                  View All Users
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Class Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              View all classes in your organization, monitor enrollment, and archive old classes.
            </p>
            <div className="flex gap-2">
              <Link href="/admin/classes" className="flex-1">
                <Button variant="outline" className="w-full">
                  View All Classes
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Content Moderation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review flagged messages, manage content violations, and ensure safe classroom communication.
            </p>
            <div className="flex gap-2">
              <Link href="/admin/moderation" className="flex-1">
                <Button variant="outline" className="w-full">
                  View Moderation Queue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {classes?.slice(0, 5).map((cls) => (
              <div
                key={cls._id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted"
              >
                <div>
                  <p className="font-medium">{cls.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {cls.subject} • Grade {cls.gradeLevel}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {cls.enrollmentCount} students
                </div>
              </div>
            ))}
            {(!classes || classes.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                No classes found
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
