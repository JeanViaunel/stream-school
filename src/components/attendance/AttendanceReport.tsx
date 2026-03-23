"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

interface AttendanceReportProps {
  sessionId: Id<"sessions">;
}

const STATUS_VARIANT = {
  present: "default",
  late: "secondary",
  absent: "destructive",
} as const;

export function AttendanceReport({ sessionId }: AttendanceReportProps) {
  const attendance = useQuery(api.sessions.getAttendance, { sessionId });

  if (attendance === undefined) {
    return <p className="text-sm text-muted-foreground">Loading attendance…</p>;
  }

  function exportCSV() {
    if (!attendance) return;
    const rows = [
      ["Student", "Status", "Joined At", "Left At"],
      ...attendance.map((r) => [
        r.userName,
        r.status,
        r.joinedAt ? new Date(r.joinedAt).toLocaleTimeString() : "",
        r.leftAt ? new Date(r.leftAt).toLocaleTimeString() : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const attended = attendance.filter((r) => r.status !== "absent").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {attended} of {attendance.length} attended
        </p>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Left</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendance.map((record) => (
            <TableRow key={record.userId}>
              <TableCell>{record.userName}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[record.status]}>
                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {record.joinedAt ? new Date(record.joinedAt).toLocaleTimeString() : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {record.leftAt ? new Date(record.leftAt).toLocaleTimeString() : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
