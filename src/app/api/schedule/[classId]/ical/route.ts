import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  const { classId } = await context.params;
  const token =
    request.nextUrl.searchParams.get("key") ??
    request.headers.get("x-ical-key");

  const expected = process.env.ICAL_EXPORT_KEY;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ical = await convex.action(api.icalExport.buildIcalForClass, {
      classId: classId as Id<"classes">,
      authToken: token,
    });

    return new NextResponse(ical, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="class-${classId}.ics"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to build calendar" }, { status: 500 });
  }
}
