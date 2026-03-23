"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildIcal } from "@/lib/ical";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { Calendar as CalendarIcon, Download } from "lucide-react";
import { toast } from "sonner";

type ViewMode = "month" | "week";

export function CalendarView() {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("month");
  const upcoming = useQuery(api.schedule.getUpcoming, { days: 60 });

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
    toast.success("Calendar downloaded");
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
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Schedule
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>
            Month
          </Button>
          <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>
            Week
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1))}>
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1))}>
            Next
          </Button>
          <Button variant="secondary" size="sm" onClick={downloadIcal}>
            <Download className="mr-2 h-4 w-4" />
            .ics
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-center text-sm font-medium text-muted-foreground">
          {format(cursor, "MMMM yyyy")}
        </p>

        {view === "month" && (
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="p-2 font-medium">
                {d}
              </div>
            ))}
            {monthGrid.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="min-h-[72px] rounded-md bg-muted/20" />;
              }
              const daySessions = sessionsInRange.filter((s) => isSameDay(new Date(s.scheduledAt), day));
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[72px] rounded-md border p-1 text-left ${isSameMonth(day, cursor) ? "bg-card" : "opacity-40"}`}
                >
                  <div className="text-[10px] font-medium">{format(day, "d")}</div>
                  <div className="mt-1 space-y-0.5">
                    {daySessions.slice(0, 2).map((s) => (
                      <Badge
                        key={s.sessionId}
                        variant="secondary"
                        className="block w-full truncate px-1 py-0 text-[10px]"
                        title={s.title}
                      >
                        {s.className}
                      </Badge>
                    ))}
                    {daySessions.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{daySessions.length - 2}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "week" && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const daySessions =
                upcoming?.filter((s) => isSameDay(new Date(s.scheduledAt), day)) ?? [];
              return (
                <div key={day.toISOString()} className="min-h-[120px] rounded-md border p-2">
                  <p className="text-xs font-medium">{format(day, "EEE d")}</p>
                  <ul className="mt-2 space-y-1">
                    {daySessions.map((s) => (
                      <li key={s.sessionId}>
                        <Badge variant="outline" className="w-full justify-start text-[10px]">
                          {s.title}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {upcoming === undefined && <p className="text-sm text-muted-foreground">Loading…</p>}
        {upcoming && upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming sessions in the next 60 days.</p>
        )}
      </CardContent>
    </Card>
  );
}
