# COMPLIANCE — StreamSchool Implementation Guide

This file provides concrete, step-by-step implementation patterns for legal and safety compliance. Read this **before** implementing any feature tagged with a compliance concern in `EDU-TASKS.md`.

**Applies to:** COPPA, FERPA, content moderation, recording consent, data retention, and data export.

---

## §1 COPPA — Children's Online Privacy Protection Act

### Who it covers
Any user under 13 at the time of registration. Age is calculated from the date of birth field collected at registration.

### Age detection at registration

In `RegisterForm.tsx`, collect date of birth (not age — DOB is precise and auditable):

```tsx
// After the user submits registration
const age = differenceInYears(new Date(), new Date(dateOfBirth));
const requiresParentalConsent = age < 13;
```

If `requiresParentalConsent === true`:
1. Create the user account with `isActive = false` and `parentConsentGiven = false`
2. Do NOT connect the Stream Chat or Video client yet — the user has no active session
3. Redirect to `/consent` (the `ConsentWizard`)
4. Store `{ pendingUserId, dateOfBirth }` in `sessionStorage` only (not localStorage) for the consent flow — this is temporary, not persisted

### ConsentWizard — step by step

**Step 1 — Explanation screen**
- Plain-language description (no legal jargon): "We need a parent or guardian to approve your account because you're under 13."
- List exactly what data is stored: name, username, class participation, chat messages
- No data collection on this screen

**Step 2 — Parent email collection**
- Input: parent/guardian email address
- Validation: must be a different email from the student's (if student provided one)
- On submit: call `api.notifications.sendParentConsentEmail` — this is the only allowed action before consent

**Step 3 — Pending confirmation**
- Show: "We sent an email to [parent email]. Ask your parent to check their email and click the link."
- Poll Convex (`api.users.getConsentStatus`) every 10 seconds; on `parentConsentGiven === true`, redirect to `/dashboard`
- Account cannot be accessed in any other way until consent is confirmed

**The consent email (sent via Resend)**

```
Subject: Action Required — Approve [child name]'s StreamSchool account

[Child's display name] (username: [username]) has requested an account on StreamSchool,
a virtual classroom platform used by [school name].

StreamSchool collects the following data for children under 13:
- Display name and username
- Class participation (which sessions they attended)
- Chat messages sent in class channels (visible to teacher and school admin)
- Assignment submissions

This data is accessible only to the child's teacher and authorized school staff.
No data is shared with third parties. You can request deletion at any time by
contacting [admin email].

[APPROVE ACCOUNT] ← link to /consent/confirm?token={signedToken}
[DENY — do not create account] ← link to /consent/deny?token={signedToken}
```

**Consent confirmation endpoint** (`/consent/confirm?token=`)

- The token is a signed JWT: `{ userId, parentEmail, exp: now + 48h }` — sign with `CONSENT_TOKEN_SECRET` (new Convex env var)
- In the HTTP handler (`convex/http.ts`): verify signature, check not expired, set `parentConsentGiven = true`, `parentConsentAt = Date.now()`, `isActive = true`, `consentMethod = "email_verified"` on the user record
- Redirect parent's browser to `/consent/success` (shows "Account approved" message)
- The student's polling loop detects `isActive = true` and redirects to `/dashboard`

**Denial endpoint** (`/consent/deny?token=`)

- Verify token, then: delete the user record entirely (no soft-delete — COPPA requires no data retention for denied accounts)
- Redirect to `/consent/denied`

**Consent token generation** (Convex internalAction, Node runtime):

```ts
import { SignJWT } from "jose"; // npm install jose

const token = await new SignJWT({ userId, parentEmail })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("48h")
  .sign(new TextEncoder().encode(process.env.CONSENT_TOKEN_SECRET));
```

Add to Convex env: `npx convex env set CONSENT_TOKEN_SECRET $(openssl rand -base64 32)`

### What cannot happen before consent is confirmed

- No Stream Chat `connectUser` call
- No Stream Video client initialization
- No class enrollment
- No data written to any Convex table except the pending user record and consent log

### Data retention for under-13 accounts

- Accounts closed (by parent request or admin): PII deleted within 30 days
- Chat messages: deleted from Stream Chat via server SDK within 30 days
- Session logs, submissions, grades: hard-deleted from Convex (no soft-delete archival)
- A Convex cron runs nightly to find accounts with `scheduledDeletionAt < Date.now()` and executes deletion

```ts
// convex/crons.ts
crons.interval("COPPA pending deletion sweep", { hours: 24 }, internal.users.processPendingDeletions, {});
```

---

## §2 FERPA — Family Educational Rights and Privacy Act

### What counts as an education record

All of the following are FERPA-protected when linked to an identifiable student:
- Session attendance logs (`sessionLogs` table)
- Assignment submissions and scores (`submissions`, `grades` tables)
- Teacher feedback and comments
- Chat messages in class channels (considered part of the educational record)

### Access control rules — enforce in every Convex query

Every query that touches the tables above must verify the caller's identity against this matrix:

| Record type | Student (own) | Student (other) | Teacher (their class) | Parent (linked child) | Admin (same org) |
|------------|:---:|:---:|:---:|:---:|:---:|
| `sessionLogs` | ✅ | ❌ | ✅ | ✅ | ✅ |
| `submissions` | ✅ | ❌ | ✅ | ✅ | ✅ |
| `grades` | ✅ | ❌ | ✅ | ✅ | ✅ |
| `assignments` (published) | ✅ | ✅ (same class) | ✅ | ❌ | ✅ |
| `moderationFlags` | ❌ | ❌ | ✅ | ❌ | ✅ |

**Implementation pattern for every protected query:**

```ts
// Example: getMyGrades (student access)
export const getMyGrades = query({
  args: { classId: v.id("classes"), requestingUserId: v.id("users") },
  returns: v.array(/* ... */),
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.requestingUserId);
    if (!caller) throw new Error("Unauthorized");

    // Student can only access their own grades
    if (caller.role === "student") {
      // OK — filter to own records below
    }
    // Teacher must own the class
    else if (caller.role === "teacher") {
      const cls = await ctx.db.get(args.classId);
      if (!cls || cls.teacherId !== args.requestingUserId) throw new Error("Unauthorized");
    }
    // Parent must be linked to the student whose grades are requested
    else if (caller.role === "parent") {
      // Caller must pass studentId; verify parentLinks
      throw new Error("Use getChildGrades instead");
    }
    // Admin must be in same org
    else if (caller.role === "school_admin") {
      const cls = await ctx.db.get(args.classId);
      if (!cls || cls.organizationId !== caller.organizationId) throw new Error("Unauthorized");
    } else {
      throw new Error("Unauthorized");
    }

    // ... return filtered data
  },
});
```

Never skip these checks with a comment like "TODO add auth" — every protected query must enforce them before shipping.

### Data export (FERPA right to inspect)

Students (and parents of under-18 students) have the right to inspect their educational records. Implement in `src/app/(app)/settings/page.tsx`:

1. "Export my data" button → calls `api.users.requestDataExport`
2. `requestDataExport` Convex action:
   - Collects: user profile, all `sessionLogs`, all `submissions`, all `grades`, all `assignments` they were given
   - For chat messages: calls Stream Chat export API (check Stream docs for current export endpoint)
   - Packages as a JSON object
   - Sends as an email attachment via Resend to the user's registered email
   - Does NOT allow direct download in the browser (avoids exposing the data to browser storage)
3. Shows a toast: "Your data export is being prepared and will be emailed to you within 24 hours"

### Data correction

Students have the right to request correction of inaccurate records:
- Implement as a simple "Request correction" button on the grades page that opens a pre-filled email to the teacher
- Do not allow students to edit records directly — only teachers and admins can modify grades and attendance

---

## §3 Content Moderation Pipeline

### Message flow for student messages

```
Student types message
       │
       ▼
Stream Chat SDK (browser) ── message.new event ──▶ Stream webhook
                                                         │
                                                         ▼
                                              convex/http.ts webhook handler
                                                         │
                                                         ▼
                                          internal.moderation.checkMessage
                                          (Convex internalAction, Node runtime)
                                                         │
                              ┌──────────────────────────┴──────────────────────┐
                              │ score < threshold                                │ score ≥ threshold
                              ▼                                                  ▼
                    Message delivered normally              Shadow-hold message in Stream Chat
                                                           Insert moderationFlag (status: "pending")
                                                           Notify teacher in-band (toast or badge)
```

### Perspective API call (inside `convex/moderation.ts`)

```ts
// "use node";  ← must be at top of file

const response = await fetch(
  `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.PERSPECTIVE_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      comment: { text: messageText },
      requestedAttributes: {
        TOXICITY: {},
        SEVERE_TOXICITY: {},
        IDENTITY_ATTACK: {},
        INSULT: {},
        PROFANITY: {},
      },
      languages: ["en"],
      doNotStore: true,  // COPPA: do not allow Google to store student content
    }),
  }
);
const data = await response.json();
```

### Thresholds

| Attribute | Hold threshold | Auto-reject threshold |
|-----------|:---:|:---:|
| `TOXICITY` | 0.70 | 0.95 |
| `SEVERE_TOXICITY` | 0.50 | 0.80 |
| `IDENTITY_ATTACK` | 0.60 | 0.85 |
| `INSULT` | 0.75 | — |
| `PROFANITY` | 0.80 | — |

- **Hold:** Message is invisible to other students. Teacher sees it in the moderation tray with the score.
- **Auto-reject:** Message is immediately deleted. Student sees a generic "Message not delivered" error. Teacher is notified.
- Below all thresholds: message is delivered immediately, no flag created.

### Shadow-holding a message in Stream Chat

Stream Chat does not have a native "hold" feature. Implement as follows:
1. When holding, immediately call Stream server SDK `message.delete(messageId)` (soft-delete — message is hidden but recoverable)
2. Store the original message text in `moderationFlags.meta` (JSON stringified)
3. When teacher approves: call `serverClient.sendMessage(channelId, { text: originalText, user_id: originalUserId })` — this re-delivers the message as if sent now

> Important: the student's own message preview in their UI will disappear momentarily then reappear only if approved. This is the intended behavior — do not add a "sending" state that masks this.

### Teacher moderation tray

- Badge on class sidebar shows count of pending flags
- `ModerationQueue.tsx` shown to teacher inside the class view (separate from the admin queue)
- Teacher sees: student name, message text, toxicity score per attribute, timestamp
- Actions: **"Approve"** (re-deliver), **"Delete"** (permanently remove), **"Report to admin"** (escalate flag to admin queue with `status = "escalated"`)

### Direct student DMs

- Off by default (controlled by `org.settings.studentDmsEnabled`)
- When enabled: all student-to-student DM messages are also routed through the moderation pipeline
- Teacher DMs to students are not moderated (teacher has elevated trust)

### What to do when Perspective API is unavailable

- If the API call fails (network error, quota exceeded): deliver the message immediately but insert a `moderationFlag` with `reason = "moderation_unavailable"` and `status = "pending"` for manual teacher review
- Do not block the entire chat experience if the moderation service is down

---

## §4 Recording Consent

### Legal requirement

No participant (student or teacher) may be recorded without prior consent. In a K–12 context, this means:
- Students under 18: parental consent for recording may already be covered by the school's general consent forms, but the platform must display a notice
- At minimum: display a clear banner to all participants before and during recording
- Never start recording silently

### Implementation flow

**When teacher clicks "Start Recording":**

1. Show a confirmation dialog (not just a button press):
   ```
   "You are about to start recording this session.
   All participants will see a recording indicator.
   Recording will be stored for [N] days.
   
   [Cancel]  [Start Recording]"
   ```

2. On confirm: call `call.startRecording()` (read `https://getstream.io/video/docs/react/recording/calls.md` for exact API)

3. Immediately write to Convex `sessions` table: `{ recordingConsentRequired: true }` (already a field in the schema)

4. `RecordingBanner.tsx` appears for all participants via a Stream Video custom event `{ type: "recording-started" }` broadcast to all call participants

**When a student joins a session that is already recording:**

1. On join, after lobby admission, check if `session.recordingConsentRequired === true`
2. If yes: show the banner immediately before showing the call video grid
3. The banner is informational, not a consent gate — the student cannot block the recording (school policy governs this), but they must be informed

**RecordingBanner design:**
```
┌─────────────────────────────────────────────────────┐
│  🔴  This session is being recorded                 │
│      Recording is managed by [school name]           │
│      [Learn more]                    [Dismiss]       │
└─────────────────────────────────────────────────────┘
```
- Dismiss hides the banner for the current session but does not stop recording
- "Learn more" links to the school's privacy policy URL (stored in `org.settings.privacyPolicyUrl` — add this field when implementing)
- The red dot recording indicator must always remain visible (do not allow dismissal of the indicator, only the explanation banner)

### Recording storage access control

Recordings are stored in S3 with private ACL. Access is granted via pre-signed URLs only:
- Teacher of the class: full access (view, share with students)
- Student: view only their own class recordings (not other classes)
- Parent: view recordings for their linked child's classes
- Admin: full org access

Pre-signed URL generation (Convex query, not action — return URL is the output):
```ts
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const url = await getSignedUrl(
  new S3Client({ region: process.env.AWS_REGION }),
  new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: recordingKey }),
  { expiresIn: 3600 } // 1 hour
);
```

---

## §5 Data Retention & Deletion

### Retention periods

| Data type | Retention | Where set |
|-----------|-----------|-----------|
| Student PII (name, email, DOB hash) | Until account deletion + 30 days | `users` table |
| Session logs | 1 year | `sessionLogs` |
| Assignment submissions | Until class archived + 1 year | `submissions` |
| Grades | Until account deletion + 1 year | `grades` |
| Chat messages | `org.settings.dataRetentionDays` (default 365) | Stream Chat |
| Recordings | `org.settings.dataRetentionDays` (default 90) | S3 lifecycle |
| Moderation flags | 2 years | `moderationFlags` |
| Audit logs | 7 years (legal requirement) | `auditLogs` |
| Under-13 denied accounts | Immediate deletion | `users` |

### Account deletion request flow

1. User clicks "Delete my account" in Settings
2. Show: "Your account and all associated data will be permanently deleted after 30 days. You can cancel this request within 30 days by logging back in."
3. Write: `scheduledDeletionAt = Date.now() + 30 * 24 * 60 * 60 * 1000` and `isActive = false` to user record
4. Nightly cron (`internal.users.processPendingDeletions`): find users where `scheduledDeletionAt < Date.now()` → execute deletion:
   - Delete all Convex rows for this user (submissions, grades, sessionLogs, enrollments, parentLinks)
   - Call Stream Chat server SDK: delete user and all their messages
   - Anonymize rather than delete audit log entries (replace `actorId` with a static "deleted_user" string)
   - Zero out PII fields in `users` table (do not hard-delete — the row may be referenced by foreign keys — replace `username`, `displayName`, `passwordHash` with anonymized placeholders)

### Data export format

The JSON export emailed to users must include:

```json
{
  "exportedAt": "2026-03-23T00:00:00Z",
  "user": { "username": "...", "displayName": "...", "role": "...", "createdAt": "..." },
  "sessions": [{ "classId": "...", "joinedAt": "...", "leftAt": "...", "status": "present" }],
  "submissions": [{ "assignmentTitle": "...", "submittedAt": "...", "score": 85, "feedback": "..." }],
  "grades": [{ "classId": "...", "assignmentTitle": "...", "score": 85, "gradedAt": "..." }],
  "chatMessages": "See attachment: messages.json"
}
```

Chat messages are a separate JSON attachment (may be large).

---

## §6 General Security Checklist

Run through this checklist before any production deployment:

- [ ] `STREAM_API_SECRET` does not appear in any file with a `NEXT_PUBLIC_` prefix, any client component, or any browser bundle
- [ ] All Convex mutations that modify other users' records verify `role` before executing
- [ ] All FERPA-protected queries enforce the access control matrix in §2
- [ ] Under-13 users cannot access any Stream-connected feature before `parentConsentGiven === true`
- [ ] `doNotStore: true` is set in all Perspective API requests (prevents Google storing student content)
- [ ] Recording consent banner appears before `call.startRecording()` is called, not after
- [ ] Pre-signed S3 URLs have a maximum expiry of 1 hour
- [ ] Consent tokens expire in 48 hours and are single-use (mark as used after first confirmation)
- [ ] Webhook signature verification is implemented for both Stream Chat and Stream Video webhooks before processing any payload
- [ ] Audit log entries are written for every admin role change, user removal, and class archival
- [ ] A DPA (Data Processing Agreement) is signed with Stream before accepting real student data: https://getstream.io/legal/dpa/
