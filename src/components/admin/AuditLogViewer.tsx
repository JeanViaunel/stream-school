"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export function AuditLogViewer() {
  const [filter, setFilter] = useState("");
  const rows = useQuery(api.auditLog.listRecentAuditLogs, {});

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.action.toLowerCase().includes(q));
  }, [rows, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter by action (e.g. user_deactivated)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
          aria-label="Filter audit log by action type"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row._id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {format(row.createdAt, "PPp")}
                </TableCell>
                <TableCell className="font-mono text-xs">{row.actorId}</TableCell>
                <TableCell>{row.action}</TableCell>
                <TableCell className="font-mono text-xs">
                  {row.targetType ?? "—"} {row.targetId ?? ""}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                  {row.metadata ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && rows !== undefined && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No audit entries
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
