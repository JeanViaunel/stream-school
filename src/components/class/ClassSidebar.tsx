"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useGradeSkin } from "@/contexts/GradeSkinContext";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { 
  Plus, 
  BookOpen, 
  FlaskConical, 
  Palette, 
  Calculator, 
  Globe, 
  Music, 
  Dumbbell,
  Hash
} from "lucide-react";

// Subject to icon mapping
const subjectIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  science: FlaskConical,
  biology: FlaskConical,
  chemistry: FlaskConical,
  physics: FlaskConical,
  art: Palette,
  math: Calculator,
  mathematics: Calculator,
  geography: Globe,
  history: Globe,
  music: Music,
  pe: Dumbbell,
  "physical education": Dumbbell,
  default: BookOpen,
};

// Generate a stable color from class ID
function getClassColor(classId: string): string {
  const colors = [
    "#EF4444", // red
    "#F97316", // orange
    "#F59E0B", // amber
    "#84CC16", // lime
    "#22C55E", // green
    "#10B981", // emerald
    "#14B8A6", // teal
    "#06B6D4", // cyan
    "#0EA5E9", // sky
    "#3B82F6", // blue
    "#6366F1", // indigo
    "#8B5CF6", // violet
    "#A855F7", // purple
    "#D946EF", // fuchsia
    "#EC4899", // pink
    "#F43F5E", // rose
  ];
  let hash = 0;
  for (let i = 0; i < classId.length; i++) {
    hash = classId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface Class {
  _id: string;
  name: string;
  subject: string;
  gradeLevel: number;
  streamChannelId: string;
  joinCode: string;
  teacherId: string;
}

export function ClassSidebar() {
  const { session } = useAuth();
  const { gradeBand } = useGradeSkin();
  const pathname = usePathname();
  const { getUnreadCount } = useUnreadCounts();

  // Teachers/co-teachers: classes they lead. Admins: all org classes (not only where they are teacherId).
  const teacherClasses = useQuery(
    api.classes.getClassesByTeacher,
    session?.role === "teacher" || session?.role === "co_teacher" ? {} : "skip",
  );

  const adminOrgClasses = useQuery(
    api.admin.getAllClasses,
    session?.role === "admin" ? {} : "skip",
  );

  const studentClasses = useQuery(
    api.classes.getClassesByStudent,
    session?.role === "student" ? {} : "skip",
  );

  const classes = useMemo(() => {
    const rawClasses =
      session?.role === "admin"
        ? (adminOrgClasses ?? []).filter((c) => !c.isArchived)
        : session?.role === "student"
          ? studentClasses ?? []
          : teacherClasses ?? [];
    // Group by subject
    const grouped = rawClasses.reduce((acc, cls) => {
      const subject = cls.subject.toLowerCase();
      if (!acc[subject]) {
        acc[subject] = [];
      }
      acc[subject].push(cls as Class);
      return acc;
    }, {} as Record<string, Class[]>);

    return grouped;
  }, [session?.role, adminOrgClasses, teacherClasses, studentClasses]);

  const isTeacherLike =
    session?.role === "teacher" ||
    session?.role === "co_teacher" ||
    session?.role === "admin";
  const canCreate = session?.role === "admin";

  // Primary band: icon + color dot only
  if (gradeBand === "primary") {
    return (
      <aside className="w-20 border-r border-border bg-card flex flex-col">
        <div className="p-3 border-b border-border">
          {canCreate && (
            <Link href="/class/create">
              <Button size="icon" className="w-12 h-12 rounded-xl">
                <Plus className="w-6 h-6" />
              </Button>
            </Link>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {Object.entries(classes).map(([subject, subjectClasses]) => (
              <div key={subject} className="space-y-1">
                {subjectClasses.map((cls) => {
                  const Icon = subjectIcons[subject] || subjectIcons.default;
                  const color = getClassColor(cls._id);
                  const isActive = pathname === `/class/${cls._id}`;
                  const unreadCount = getUnreadCount(cls.streamChannelId);

                  return (
                    <Link key={cls._id} href={`/class/${cls._id}`}>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          relative w-14 h-14 rounded-xl flex items-center justify-center mx-auto
                          transition-colors duration-200
                          ${isActive ? "bg-primary/20" : "bg-muted hover:bg-muted/80"}
                        `}
                      >
                        <Icon className="w-6 h-6" style={{ color }} />
                        {/* Unread indicator dot */}
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full border-2 border-card bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>
    );
  }

  // Middle and High bands: full sidebar with text
  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-lg">Classes</h2>
        {canCreate && (
          <Link href="/class/create">
            <Button size="sm" variant="ghost">
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </Link>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {Object.entries(classes).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No classes yet</p>
              {canCreate && (
                <p className="text-xs mt-1">Create your first class</p>
              )}
            </div>
          ) : (
            Object.entries(classes).map(([subject, subjectClasses]) => {
              const Icon = subjectIcons[subject] || subjectIcons.default;

              return (
                <div key={subject}>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                    <Icon className="w-3 h-3" />
                    {subject}
                  </h3>
                  <div className="space-y-1">
                    {subjectClasses.map((cls) => {
                      const color = getClassColor(cls._id);
                      const isActive = pathname === `/class/${cls._id}`;
                      const unreadCount = getUnreadCount(cls.streamChannelId);

                      return (
                        <Link key={cls._id} href={`/class/${cls._id}`}>
                          <motion.div
                            whileHover={{ x: 2 }}
                            className={`
                              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                              transition-colors duration-200 cursor-pointer
                              ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"}
                            `}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{cls.name}</p>
                              {gradeBand === "high" && (
                                <p className="text-xs text-muted-foreground">
                                  Grade {cls.gradeLevel}
                                </p>
                              )}
                            </div>
                            {/* Unread badge */}
                            {unreadCount > 0 && gradeBand === "high" && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5 min-w-5 flex items-center justify-center">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </Badge>
                            )}
                            {unreadCount > 0 && gradeBand === "middle" && (
                              <span className="w-2.5 h-2.5 rounded-full bg-destructive shrink-0" />
                            )}
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Join code input for students */}
      {!isTeacherLike && (
        <div className="p-3 border-t border-border">
          <Link href="/dashboard?join=true">
            <Button variant="outline" className="w-full" size="sm">
              <Hash className="w-4 h-4 mr-2" />
              Join with Code
            </Button>
          </Link>
        </div>
      )}
    </aside>
  );
}
