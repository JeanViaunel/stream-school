"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  BookOpen, 
  Calendar, 
  MessageCircle, 
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  User
} from "lucide-react";

interface ChildData {
  _id: string;
  displayName: string;
  gradeLevel?: number;
  avatarUrl?: string;
}

interface ClassData {
  _id: string;
  name: string;
  subject: string;
  teacherName: string;
}

interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
}

interface SessionSummary {
  sessionId: string;
  className: string;
  date: string;
  status: "present" | "late" | "absent";
  duration: number;
}

interface ParentPortalProps {
  linkedChildren: ChildData[];
  onLinkChild: () => void;
}

export function ParentPortal({ linkedChildren, onLinkChild }: ParentPortalProps) {
  const [selectedChildId, setSelectedChildId] = useState<string>(linkedChildren[0]?._id || "");
  
  // In a real implementation, these would query Convex
  // For now, using mock data
  const childClasses: ClassData[] = [
    { _id: "1", name: "Biology - Period 3", subject: "Science", teacherName: "Ms. Johnson" },
    { _id: "2", name: "Algebra II", subject: "Mathematics", teacherName: "Mr. Smith" },
  ];

  const attendanceSummary: AttendanceSummary = {
    present: 42,
    late: 2,
    absent: 1,
  };

  const recentSessions: SessionSummary[] = [
    { sessionId: "s1", className: "Biology - Period 3", date: "2026-03-22", status: "present", duration: 45 },
    { sessionId: "s2", className: "Algebra II", date: "2026-03-21", status: "present", duration: 50 },
    { sessionId: "s3", className: "Biology - Period 3", date: "2026-03-20", status: "late", duration: 35 },
  ];

  const selectedChild = linkedChildren.find(c => c._id === selectedChildId);

  if (linkedChildren.length === 0) {
    return (
      <Card className="text-center p-8">
        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Children Linked</h3>
        <p className="text-muted-foreground mb-4">
          Link to your child&apos;s account to view their progress and class schedule
        </p>
        <Button onClick={onLinkChild}>
          Link Child Account
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Child Selector */}
      {linkedChildren.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Viewing:</span>
              <div className="flex gap-2">
                {linkedChildren.map((child) => (
                  <Button
                    key={child._id}
                    variant={selectedChildId === child._id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChildId(child._id)}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-xs">
                        {child.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {child.displayName}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{childClasses.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Present
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{attendanceSummary.present}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Late
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{attendanceSummary.late}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Absent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{attendanceSummary.absent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Teachers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {childClasses.map((cls) => (
              <Card key={cls._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{cls.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {cls.subject}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <User className="w-3 h-3" />
                        {cls.teacherName}
                      </div>
                    </div>
                    <Link href={`/messages`}>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {recentSessions.map((session, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        {session.status === "present" && (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        )}
                        {session.status === "late" && (
                          <Clock className="w-5 h-5 text-amber-500" />
                        )}
                        {session.status === "absent" && (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">{session.className}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.date).toLocaleDateString()} • {session.duration} min
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          session.status === "present" ? "default" : 
                          session.status === "late" ? "secondary" : "destructive"
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers">
          <div className="grid gap-4">
            {childClasses.map((cls) => (
              <Card key={cls._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {cls.teacherName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{cls.teacherName}</p>
                        <p className="text-sm text-muted-foreground">
                          {cls.name}
                        </p>
                      </div>
                    </div>
                    <Link href={`/messages`}>
                      <Button variant="outline" size="sm">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
