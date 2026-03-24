import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import crypto from "crypto";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function verifyStreamJwt(
  token: string,
  apiSecret: string
): { user_id: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = crypto
    .createHmac("sha256", apiSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  if (signature !== expected) return null;
  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { user_id: string };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const currentToken = searchParams.get("currentToken");

  if (!currentToken) {
    return NextResponse.json(
      { error: "currentToken required" },
      { status: 400 }
    );
  }

  const apiSecret = process.env.STREAM_API_SECRET;
  if (!apiSecret) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const claims = verifyStreamJwt(currentToken, apiSecret);
  if (!claims || !claims.user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await convex.action(api.auth.refreshToken, {
      streamUserId: claims.user_id
    });
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
