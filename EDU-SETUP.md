# EDU Setup — StreamSchool Additional Dependencies

This file supplements `SETUP.md` with everything needed on top of the base app for the K–12 educational platform features described in `SPECS-EDU.md`.

**Prerequisite:** Complete all steps in `SETUP.md` first.

---

## 1. Additional npm Packages

Install all of the following before starting `EDU-TASKS.md`:

```bash
# Email delivery (parent notifications, consent emails, weekly digests)
npm install resend

# Content moderation — Perspective API HTTP calls (used inside Convex internalAction)
# No dedicated SDK needed; use native fetch inside the Node action

# Scheduling & date utilities
npm install date-fns

# iCal export (RFC 5545) — lightweight, no external lib needed for simple use
# lib/ical.ts will be a pure implementation; no package required

# AWS SDK v3 (recording storage to S3)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Charts for admin analytics dashboard
npm install recharts
npm install --save-dev @types/recharts

# Node types (required for Convex Node runtime actions that use these packages)
npm install --save-dev @types/node
```

### Additional shadcn/ui components

The base `SETUP.md` added: Button, Input, Dialog, Avatar, Badge, Separator, ScrollArea.

Add the following for EDU features:

```bash
npx shadcn@latest add calendar
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add progress
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add radio-group
npx shadcn@latest add label
npx shadcn@latest add card
```

> Note: `checkbox`, `switch`, `slider`, `skeleton`, `popover`, `tooltip`, `command`, `dropdown-menu`, `context-menu`, `scroll-area`, `sonner` are already present in the repo.

---

## 2. New Environment Variables

### Next.js `.env.local`

Add these to `.env.local` (copy from `.env.example` then add):

```env
# Email — Resend (https://resend.com/api-keys)
RESEND_API_KEY=re_...

# App URL — used in email links (consent, invites, digests)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Content moderation — Google Perspective API
# Get key at: https://developers.perspectiveapi.com/s/docs-get-started
PERSPECTIVE_API_KEY=AIza...

# Recording storage — AWS S3
AWS_S3_BUCKET=streamschool-recordings
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### Convex environment variables

All secrets used inside Convex actions must be set via the Convex CLI (not `.env.local`):

```bash
# Email (Resend)
npx convex env set RESEND_API_KEY re_...

# Content moderation (Perspective API)
npx convex env set PERSPECTIVE_API_KEY AIza...

# Recording storage (AWS)
npx convex env set AWS_S3_BUCKET streamschool-recordings
npx convex env set AWS_ACCESS_KEY_ID AKIA...
npx convex env set AWS_SECRET_ACCESS_KEY ...
npx convex env set AWS_REGION us-east-1

# App URL (for email links)
npx convex env set NEXT_PUBLIC_APP_URL https://yourdomain.com
```

> `STREAM_API_KEY` and `STREAM_API_SECRET` should already be set in Convex from the base setup.

---

## 3. Stream Dashboard Configuration

### 3.1 Create the `classroom` custom call type

In the Stream Dashboard → your app → Video & Audio → Call Types:

1. Click **"Create call type"**
2. Name: `classroom`
3. Configure permissions:

| Capability | teacher (host) | student (member) |
|-----------|---------------|-----------------|
| send-audio | ✅ | ✅ |
| send-video | ✅ | ✅ |
| screenshare | ✅ | ❌ (default off; teacher can grant) |
| send-reaction | ✅ | ✅ |
| mute-users | ✅ | ❌ |
| remove-call-member | ✅ | ❌ |
| end-call | ✅ | ❌ |
| join-call | ✅ | ✅ |

4. Enable **Lobby (Waiting Room)**: ON
5. Set **Max participants**: 300
6. Enable **Recording**: ON (set storage to your S3 bucket or Stream's storage)
7. Enable **Transcriptions**: ON (if your Stream plan supports it)

### 3.2 Create the `breakout` custom call type

1. Click **"Create call type"**
2. Name: `breakout`
3. Same permissions as `classroom` but **Lobby: OFF** (students join directly)
4. Max participants: 40 (breakout groups are small)
5. Recording: OFF (breakouts are not recorded)

### 3.3 Enable Stream Chat moderation webhook

In Stream Dashboard → your app → Chat → Webhooks:

1. Add webhook URL: `https://yourdomain.com/api/webhooks/stream-chat`
2. Enable events: `message.new` (for pre-moderation), `message.flagged`
3. Copy the webhook signing secret → add to Convex env:
   ```bash
   npx convex env set STREAM_CHAT_WEBHOOK_SECRET ...
   ```

### 3.4 Enable Stream Video webhook

In Stream Dashboard → your app → Video & Audio → Webhooks:

1. Add webhook URL: `https://yourdomain.com/api/webhooks/stream-video`
2. Enable events:
   - `call.session_participant_joined`
   - `call.session_participant_left`
   - `call.recording_ready`
   - `call.ended`
3. Copy the webhook signing secret → add to Convex env:
   ```bash
   npx convex env set STREAM_VIDEO_WEBHOOK_SECRET ...
   ```

### 3.5 Create `classroom` Stream Chat channel type

In Stream Dashboard → Chat → Channel Types:

1. Click **"Create channel type"**
2. Name: `classroom`
3. Permissions: only `owner` (teacher) can create channels; `member` can read and write messages
4. Enable: Message Search, Typing Indicators, Read Receipts
5. Message moderation: set to **"Custom"** (your webhook will handle it, not Stream's built-in filter)

> Note: Stream Chat channel type `"messaging"` is used for DMs and staff channels; `"classroom"` is used exclusively for class spaces.

---

## 4. Convex HTTP Routes Setup

The `convex/http.ts` file needs to register webhook endpoints. These are called by Stream servers — they do not go through the Convex client:

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/webhooks/stream-video",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // Verify Stream webhook signature before processing
    // Then dispatch to internal.sessions.logJoin / logLeave / etc.
    // Full implementation: EDU-T28
    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/webhooks/stream-chat",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // Full implementation: EDU-T42
    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/consent/confirm",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    // Parental consent confirmation link handler
    // Full implementation: EDU-T10
    return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  }),
});

export default http;
```

---

## 5. Next.js Middleware Setup

Create `src/middleware.ts` for subdomain-based org resolution (EDU-T64):

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (!isLocalhost) {
    const subdomain = hostname.split(".")[0];
    const response = NextResponse.next();
    response.headers.set("x-org-slug", subdomain);
    return response;
  }

  // Localhost: read ?org= query param for development
  const orgSlug = request.nextUrl.searchParams.get("org") ?? "dev";
  const response = NextResponse.next();
  response.headers.set("x-org-slug", orgSlug);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## 6. AWS S3 Bucket Setup (Recording Storage)

1. Create an S3 bucket (e.g. `streamschool-recordings`) in your AWS account
2. Set bucket ACL to **private** (no public access)
3. Add a bucket policy allowing your IAM user read/write access
4. Enable **S3 Lifecycle Rules**: delete objects after `{org.settings.dataRetentionDays}` days (default 90)
5. Generate IAM access key → set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Convex env

Recordings are accessed via **pre-signed URLs** (time-limited), generated in a Convex query, never stored as public links.

---

## 7. Google Perspective API Setup

1. Go to https://developers.perspectiveapi.com/s/docs-get-started
2. Enable the **Perspective Comment Analyzer API** in your Google Cloud project
3. Generate an API key → restrict it to the Perspective API only
4. Set `PERSPECTIVE_API_KEY` in both `.env.local` and Convex env (Convex actions need it; Next.js server routes do not use it directly)
5. Request access to the full set of attributes if needed (`IDENTITY_ATTACK`, `INSULT`, `PROFANITY`, `THREAT`, `SEVERE_TOXICITY`) — some require approval

---

## 8. Resend Email Setup

1. Sign up at https://resend.com
2. Add your sending domain (e.g. `no-reply@streamschool.app`) and verify DNS records
3. Create an API key → set `RESEND_API_KEY` in Convex env
4. Test with Resend's sandbox mode before going to production

Email templates live in `convex/notifications.ts` as inline HTML strings. Keep them simple and mobile-friendly — parents may read on a phone.

---

## 9. Tailwind Config Update

Add Recharts and any new component paths to `tailwind.config.ts`:

```ts
content: [
  "./src/**/*.{ts,tsx}",
  "./node_modules/stream-chat-react/dist/**/*.js",
  // Recharts components do not need Tailwind content scanning
],
```

For the grade-skin CSS variable system, add this to `src/app/globals.css`:

```css
/* Grade band skin variables — overridden by GradeSkin component per user */
[data-grade-band="primary"] {
  --font-size-base: 1.125rem;   /* 18px */
  --btn-height: 3rem;           /* 48px touch targets */
  --icon-size: 1.75rem;         /* 28px */
  --border-radius-card: 1rem;
}

[data-grade-band="middle"] {
  --font-size-base: 1rem;
  --btn-height: 2.5rem;
  --icon-size: 1.25rem;
  --border-radius-card: 0.75rem;
}

[data-grade-band="high"] {
  --font-size-base: 0.9375rem;  /* 15px */
  --btn-height: 2.25rem;
  --icon-size: 1rem;
  --border-radius-card: 0.5rem;
}
```

---

## 10. Verification Checklist

Before starting `EDU-TASKS.md`, confirm:

- [ ] All npm packages installed with no peer dependency errors
- [ ] All shadcn/ui components added
- [ ] `classroom` and `breakout` call types exist in Stream Dashboard
- [ ] `classroom` Stream Chat channel type created in Stream Dashboard
- [ ] Webhook URLs configured in both Stream Chat and Stream Video dashboards
- [ ] All Convex env vars set (`npx convex env list` to verify)
- [ ] `.env.local` contains all non-Convex vars
- [ ] AWS S3 bucket created with lifecycle rules
- [ ] Resend domain verified and API key working
- [ ] Perspective API key active and tested with a sample request
- [ ] `npx convex dev` shows zero errors after schema changes
