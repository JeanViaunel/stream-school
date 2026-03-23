import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const isLocal =
    host.startsWith("localhost:") ||
    host === "localhost" ||
    host.startsWith("127.0.0.1");

  const requestHeaders = new Headers(request.headers);

  if (!isLocal) {
    const hostNoPort = host.split(":")[0] ?? "";
    const parts = hostNoPort.split(".");
    if (parts.length >= 3) {
      const sub = parts[0];
      requestHeaders.set("x-organization-slug", sub);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
