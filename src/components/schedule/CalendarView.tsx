"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/EmptyState";
import { buildIcal } from "@/lib/ical";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  Download,
  List,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "week" | "agenda";

interface Session {
  sessionId: string;
  classId: string;
  className: string;
  title: string;
  scheduledAt: number;
  durationMinutes: number;
}

export function CalendarView() {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("month");
  const upcoming = useQuery(api.schedule.getUpcoming, { days: 90 });

  const sessionsInRange = useMemo(() => {
    if (!upcoming) return [];
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return upcoming.filter((s) => s.scheduledAt >= start.getTime() && s.scheduledAt <= end.getTime());
  }, [upcoming, cursor]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(cursor, { weekStartsOn: 0 }),
      end: endOfWeek(cursor, { weekStartsOn: 0 }),
    });
  }, [cursor]);

  const agendaSessions = useMemo(() => {
    if (!upcoming) return [];
    // Group by date
    const grouped: { date: Date; sessions: Session[] }[] = [];
    const sorted = [...upcoming].sort((a, b) => a.scheduledAt - b.scheduledAt);
    
    sorted.forEach((session) => {
      const date = new Date(session.scheduledAt);
      const existing = grouped.find((g) => isSameDay(g.date, date));
      if (existing) {
        existing.sessions.push(session);
      } else {
        grouped.push({ date, sessions: [session] });
      }
    });
    
    return grouped.slice(0, 14); // Show next 14 days with events
  }, [upcoming]);

  function downloadIcal() {
    if (!upcoming || upcoming.length === 0) {
      toast.error("No sessions to export");
      return;
    }
    const ical = buildIcal(
      upcoming.map((s) => ({
        icalUid: `${s.sessionId}-${s.scheduledAt}`,
        title: `${s.className}: ${s.title}`,
        scheduledAt: s.scheduledAt,
        durationMinutes: s.durationMinutes,
      }))
    );
    const blob = new Blob([ical], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stream-school-calendar.ics";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar exported to .ics");
  }

  const monthGrid = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const days = eachDayOfInterval({ start, end });
    const pad = start.getDay();
    const padding: null[] = Array.from({ length: pad }, () => null);
    const cells: (Date | null)[] = [...padding, ...days];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <CalendarIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Schedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(cursor, "MMMM yyyy")}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={view === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
              className="h-8"
            >
              <Grid3X3 className="h-4 w-4 mr-1.5" />
              Month
            </Button>
            <Button
              variant={view === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("week")}
              className="h-8"
            >
              Week
            </Button>
            <Button
              variant={view === "agenda" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("agenda")}
              className="h-8"
            >
              <List className="h-4 w-4 mr-1.5" />
              Agenda
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor((d) => subMonths(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCursor(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor((d) => addMonths(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={downloadIcal}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Month View */}
        {view === "month" && (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="min-h-[80px] rounded-lg bg-muted/30" />;
                }
                const daySessions = sessionsInRange.filter((s) => isSameDay(new Date(s.scheduledAt), day));
                const isCurrentMonth = isSameMonth(day, cursor);
                const isTodayDate = isToday(day);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[80px] rounded-lg border p-1.5 transition-colors",
                      !isCurrentMonth && "opacity-40 bg-muted/20",
                      isCurrentMonth && "bg-card hover:bg-muted/50",
                      isTodayDate && "ring-2 ring-primary ring-offset-1"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                      isTodayDate ? "bg-primary text-primary-foreground" : "text-foreground"
                    )}>
                      {format(day, "d")}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {daySessions.slice(0, 3).map((s) => (
                        <Link key={s.sessionId} href={`/class/${s.classId}`}>
                          <Badge
                            variant="secondary"
                            className="block w-full truncate px-1.5 py-0.5 text-[10px] hover:bg-primary/20 transition-colors"
                            title={`${s.className}: ${s.title}`}
                          >
                            {format(new Date(s.scheduledAt), "h:mm a")} {s.className}
                          </Badge>
                        </Link>
                      ))}
                      {daySessions.length > 3 && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          +{daySessions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View */}
        {view === "week" && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const daySessions = upcoming?.filter((s) => isSameDay(new Date(s.scheduledAt), day)) ?? [];
              const isTodayDate = isToday(day);
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[200px] rounded-lg border p-3",
                    isTodayDate && "ring-2 ring-primary ring-offset-1 bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "text-xs font-semibold mb-2",
                    isTodayDate ? "text-primary" : "text-muted-foreground"
                  )}>
                    {format(day, "EEE d")}
                  </div>
                  <div className="space-y-2">
                    {daySessions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No events</p>
                    ) : (
                      daySessions.map((s) => (
                        <Link key={s.sessionId} href={`/class/${s.classId}`}>
                          <div className="p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors text-left">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(s.scheduledAt), "h:mm a")}
                              <span className="text-muted-foreground/50">•</span>
                              {s.durationMinutes}m
                            </div>
                            <p className="text-xs font-medium truncate">{s.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{s.className}</p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Agenda View */}
        {view === "agenda" && (
          <ScrollArea className="h-[400px]">
            {upcoming === undefined ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : agendaSessions.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No upcoming sessions"
                description="Your schedule will appear here when sessions are created"
              />
            ) : (
              <div className="space-y-4">
                {agendaSessions.map(({ date, sessions }) => (
                  <div key={date.toISOString()}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex flex-col items-center justify-center text-center",
                        isToday(date) ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <span className="text-[10px] font-medium uppercase">
                          {format(date, "MMM")}
                        </span>
                        <span className="text-sm font-bold leading-none">
                          {format(date, "d")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {isToday(date) ? "Today" : format(date, "EEEE")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(date, "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="ml-12 space-y-2">
                      {sessions.map((s) => (
                        <Link key={s.sessionId} href={`/class/${s.classId}`}>
                          <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Video className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{s.title}</p>
                              <p className="text-xs text-muted-foreground">{s.className}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(s.scheduledAt), "h:mm a")}
                                <span>•</span>
                                {s.durationMinutes} min
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {upcoming?.length === 0 && view !== "agenda" && (
          <div className="text-center py-8">
            <EmptyState
              icon={BookOpen}
              title="No upcoming sessions"
              description="Your schedule will appear here when sessions are created"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
