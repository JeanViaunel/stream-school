"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function formatIcalUtc(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
}

export const buildIcalForClass = action({
  args: {
    classId: v.id("classes"),
    authToken: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const expected = process.env.ICAL_EXPORT_KEY;
    if (!expected || args.authToken !== expected) {
      throw new Error("Unauthorized");
    }

    const sessions = await ctx.runQuery(internal.schedule.listScheduledSessionsForExport, {
      classId: args.classId,
    });

    const now = formatIcalUtc(Date.now());
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//StreamSchool//EN",
      "CALSCALE:GREGORIAN",
    ];

    for (const s of sessions) {
      const start = s.scheduledAt;
      const end = start + s.durationMinutes * 60 * 1000;
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${s.icalUid}@streamschool`);
      lines.push(`DTSTAMP:${now}`);
      lines.push(`DTSTART:${formatIcalUtc(start)}`);
      lines.push(`DTEND:${formatIcalUtc(end)}`);
      lines.push(`SUMMARY:${escapeText(s.title)}`);
      if (s.description) {
        lines.push(`DESCRIPTION:${escapeText(s.description)}`);
      }
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  },
});
