# SPECS-EDU — StreamSchool: K–12 Virtual Classroom Platform

**Status:** V3 Full Spec  
**Target audience:** Students grades 1–12 (ages 6–18), teachers, school staff, parents/guardians  
**Tech foundation:** Next.js · Convex · Stream Chat React SDK · Stream Video React SDK · Tailwind + shadcn/ui

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Personas & Roles](#2-personas--roles)
3. [Compliance & Safety (Non-Negotiable)](#3-compliance--safety-non-negotiable)
4. [Feature Catalogue — V1 → V3](#4-feature-catalogue--v1--v3)
5. [Data Model](#5-data-model)
6. [Component Architecture](#6-component-architecture)
7. [Pages & Routes](#7-pages--routes)
8. [Stream SDK Mapping](#8-stream-sdk-mapping)
9. [Environment Variables](#9-environment-variables)
10. [Implementation Task Order](#10-implementation-task-order)
11. [Reference Documents (ordered by read priority)](#11-reference-documents-ordered-by-read-priority)

---

## 1. Product Vision

**StreamSchool** is a live virtual classroom and school communication platform for students in grades 1–12. Teachers conduct live video lessons, share their screen, manage student participation, and communicate via in-class chat. Students join their assigned class rooms, engage in breakout groups, submit questions, and stay in sync with their parents through automatic session summaries. School administrators manage the full roster, set policies per grade level, and monitor platform health.

### Design principles

- **Age-appropriate UX at every level.** A 1st grader's interface is icon-heavy and touch-friendly; a high schooler's is feature-rich and keyboard-navigable.
- **Safety first.** Every student interaction passes through moderation before it is visible to others. Direct student-to-student messaging is off by default and requires parent/admin opt-in.
- **Teachers stay in control.** Mute, remove, spotlight, and lobby management are one click away at all times.
- **Parents are partners.** Automated session summaries and participation logs keep guardians informed without requiring them to attend class.

---

## 2. Personas & Roles

| Role | Description | Scope |
|------|-------------|-------|
| **Student** | End user of the live class, chat, and assignments | Their enrolled classes only |
| **Teacher** | Hosts sessions, manages participants, creates assignments | Their own classes |
| **Co-teacher / TA** | Shared host permissions inside one class | Class-scoped |
| **Parent / Guardian** | Read-only session summaries and attendance; DMs teachers | Their linked child's data |
| **School Admin** | Full roster management, policy config, analytics, content moderation review | Organisation-wide |
| **Platform Admin** | Infrastructure-level (internal), billing, Stream dashboard | System-wide |

### Role hierarchy (permissions cascade down)

```
Platform Admin
  └─ School Admin
       ├─ Teacher / Co-teacher
       │     └─ Student
       └─ Parent / Guardian (linked to specific Student)
```

### `role` field values in Convex `users` table

```ts
"student" | "teacher" | "co_teacher" | "parent" | "school_admin" | "platform_admin"
```

---

## 3. Compliance & Safety (Non-Negotiable)

These requirements apply to the entire platform regardless of feature phase.

### 3.1 COPPA (US — Children's Online Privacy Protection Act)

- Users under 13 require **verifiable parental consent** before account creation.
- No targeted advertising, no third-party tracking pixels, no external analytics SDKs that collect PII.
- Data retention for under-13 accounts: delete all PII within 30 days of account closure.

### 3.2 FERPA (US — Family Educational Rights and Privacy Act)

- Student education records (attendance, grades, session logs) are accessible only to the student, their parents, and authorised school staff.
- No sharing of student PII with third parties without school consent. Stream processes data as a **School Official** — ensure a DPA (Data Processing Agreement) is signed with Stream.

### 3.3 GDPR / PIPEDA / local equivalents

- Provide a data export and deletion request flow for any user (accessible in Settings).
- Cookie banner with opt-in/out for any non-essential storage.

### 3.4 Content safety

- **Auto-moderation:** All student messages pass through a text profanity/harassment filter (e.g. Perspective API or Stream's built-in moderation) before delivery.
- **Teacher override:** Teachers can reveal flagged messages after review; they are never surfaced to other students automatically.
- **No student-to-student DMs by default.** Only teacher ↔ student DMs are enabled by default.
- **Reporting:** Any participant can flag a message or user; flagged items appear in the Admin moderation queue.
- **Session recording consent banner** must be shown to all participants before recording starts.

### 3.5 In-call safety

- Teachers have a hard **"mute all" / "remove participant"** capability at all times.
- Students cannot unmute themselves after a teacher mute without teacher permission (locked mute mode).
- **Lobby / waiting room** is enabled by default for all class sessions — teacher must admit each student.

---

## 4. Feature Catalogue — V1 → V3

### Phase V1 — Core Classroom (MVP)

**Auth & onboarding**
- Local auth: username + password (bcrypt via Convex internalMutation, already designed in PRD)
- Role selection at registration (student / teacher / parent)
- Parental consent flow for accounts under 13 (wizard with email confirmation)
- Grade level selection for students (determines UI skin)

**Class spaces (channels)**
- Each class = one Stream group `messaging` channel (`channel.type = "classroom"` — custom type)
- Teacher creates a class, assigns a name, grade level, and subject
- Teacher invites students by username or a shareable join code (6-char alphanumeric)
- Students see their enrolled classes in the left sidebar, ordered by next scheduled session

**Live session (video call)**
- Teacher starts a session from the class channel → all enrolled students receive an incoming call notification
- Lobby / waiting room: students wait until admitted by teacher
- In-session: camera, microphone, screen share controls (existing `CallRoom.tsx` patterns apply)
- Participant list with mute/remove per student (teacher only)
- Layout switcher: speaker, grid, spotlight — same as current `CallRoom.tsx`
- Session timer visible to all
- End session for all (teacher only)

**In-class chat**
- Text messages with emoji support
- Teacher can mute chat for all students (read-only mode)
- Questions queue: students can raise a "virtual hand" (emoji reaction or dedicated button)
- Pinned messages (teacher only)
- File and image sharing (teacher only in V1; students in V2 with moderation)

**Parent portal (read-only)**
- Parent links to student account via invitation code
- Sees class schedule, recent session attendance, teacher-sent notes
- Can DM the class teacher

**Admin panel (basic)**
- Invite teachers and students to the organisation
- View all classes and their membership
- View flagged content queue

---

### Phase V2 — Engagement & Moderation

**Raised hands & Q&A queue**
- Dedicated Q&A panel inside the call: students submit questions in text; teacher can "answer" or "skip"
- Live poll: teacher broadcasts a poll (multiple-choice); students respond; live results shown to teacher, aggregate shown to all
- Quick emoji reactions (👍 ❓ ✋ 😊) visible to teacher as floating overlays on student tiles

**Breakout rooms**
- Teacher divides class into 2–N sub-groups
- Each group joins a child `default` call with a stable ID derived from the parent session
- Teacher can broadcast a message to all breakout rooms simultaneously
- Teacher can pop into any breakout room and leave without disrupting it
- Auto-close all breakout rooms with countdown (teacher-set timer)

**In-class assignments**
- Teacher creates a short-answer or multiple-choice quiz from the class channel
- Students submit answers during or after the session (time-locked by teacher)
- Teacher sees aggregate results per question; student sees their own score
- Stored as `assignments` and `submissions` tables in Convex

**Attendance & session logs**
- Every join/leave event is written to Convex `sessionLogs` table (userId, callId, joinedAt, leftAt)
- Attendance summary auto-generated per session: present / late / absent per student
- Attendance report exportable as CSV (teacher and admin)

**Enhanced moderation**
- Stream Chat message flagging with teacher dashboard (not just admin queue)
- Auto-filter integration (Perspective API via Convex internalAction in Node runtime)
- Bulk-flag review for admin

**Student file sharing (moderated)**
- Students can upload files; they appear as "pending" in chat until teacher approves
- Teacher approve/reject in a moderation tray

**Parent notifications**
- Email or browser push when a session starts for their linked student
- Weekly automated digest: classes attended, assignments submitted, teacher comments

---

### Phase V3 — Full Platform

**Session recording**
- Consent banner shown to all participants when recording is started
- Recording stored via Stream's recording API (or routed to a Convex-managed object storage bucket)
- Teacher and student can review recordings in their class timeline
- Recording is never shared with other classes or external parties
- Retention policy configurable by admin (default 90 days)

**Adaptive UI by grade level**
- Grades 1–3 ("Little Learners"): large icon buttons, avatar-only display, simplified chat (emoji-only or teacher-curated stickers), high-contrast color themes, no keyboard shortcuts required
- Grades 4–8 ("Middle School"): standard text chat unlocked, homework panel, polls, assignments
- Grades 9–12 ("High School"): full feature parity, collaborative document annotations (future), advanced Q&A, study groups (peer DMs with parental opt-in)

**Study groups (peer collaboration, high school)**
- Parent-consent-gated: each student's parent must opt in
- Teacher-created groups only (students cannot create peer groups independently)
- Group video calls scoped to study group (separate `default` call type)
- Chat history visible to teacher

**Staff meetings (separate org space)**
- Teachers and admins have a parallel set of channels (`staff` Stream channel type)
- Staff meeting call same as class call but no lobby, no student permissions
- Staff channels are completely invisible to student and parent roles

**Scheduling & calendar integration**
- Admin or teacher creates a recurring class session with a start time and duration
- Students and parents see the schedule in their dashboard
- 10-minute browser notification before each session starts
- iCal export per class for Google Calendar / Apple Calendar sync

**Gradebook (basic)**
- Per-assignment grade (auto-calculated for multiple-choice; teacher-entered for short answer)
- Student sees their own grades; parent sees their child's grades
- Teacher sees full class gradebook, can export CSV
- Grades are stored in `grades` table in Convex, linked to `submissions`

**Advanced admin dashboard**
- Organisation-level analytics: daily active users, session count, avg session duration, attendance rates
- Class health indicators: classes with no session in 7 days, classes with low attendance
- Content moderation queue with approve/reject/escalate
- User management: bulk invite, deactivate, role change
- Data export: full school data export (FERPA-compliant) on request
- Audit log: all admin actions (role changes, removals, config changes) recorded in `auditLogs` table

**Accessibility (WCAG 2.1 AA)**
- All interactive elements keyboard-accessible
- ARIA roles on all custom components
- Screen reader-compatible participant list and chat panel
- Minimum 4.5:1 contrast ratio enforced in all themes
- Captions toggle in-call (Stream Video SDK provides automatic captions — verify via live docs before implementing)

**White-label / multi-school**
- Each school = one `organization` in Convex
- Custom school logo and primary color stored per organization, applied at layout level
- Subdomain routing: `schoolname.streamschool.app` → org resolver middleware in Next.js

---

## 5. Data Model

All tables extend the existing `users` schema. Fields marked † are new additions relative to the base PRD.

### `users` (extended)

```ts
{
  username: v.string(),
  passwordHash: v.string(),
  streamUserId: v.string(),
  displayName: v.string(),
  createdAt: v.number(),
  // † new fields
  role: v.union(
    v.literal("student"),
    v.literal("teacher"),
    v.literal("co_teacher"),
    v.literal("parent"),
    v.literal("school_admin"),
    v.literal("platform_admin")
  ),
  organizationId: v.id("organizations"),
  gradeLevel: v.optional(v.number()),         // 1–12 for students
  avatarUrl: v.optional(v.string()),
  parentConsentGiven: v.optional(v.boolean()), // for under-13
  parentConsentAt: v.optional(v.number()),
  isActive: v.boolean(),
  lastSeenAt: v.optional(v.number()),
}
```

Indexes: `by_username`, `by_organization`, `by_role_and_organization`

---

### `organizations` †

```ts
{
  name: v.string(),
  slug: v.string(),             // subdomain slug e.g. "riverdale-hs"
  logoUrl: v.optional(v.string()),
  primaryColor: v.optional(v.string()),
  createdAt: v.number(),
  settings: v.object({
    studentDmsEnabled: v.boolean(),
    recordingEnabled: v.boolean(),
    lobbyEnabled: v.boolean(),
    maxClassSize: v.number(),
    dataRetentionDays: v.number(),
  }),
}
```

Indexes: `by_slug`

---

### `classes` †

```ts
{
  organizationId: v.id("organizations"),
  teacherId: v.id("users"),
  name: v.string(),              // e.g. "Biology — Period 3"
  subject: v.string(),
  gradeLevel: v.number(),        // 1–12
  streamChannelId: v.string(),   // Stream Chat channel id
  joinCode: v.string(),          // 6-char invite code
  isArchived: v.boolean(),
  createdAt: v.number(),
}
```

Indexes: `by_organization`, `by_teacher`, `by_join_code`

---

### `enrollments` †

```ts
{
  classId: v.id("classes"),
  studentId: v.id("users"),
  enrolledAt: v.number(),
  status: v.union(v.literal("active"), v.literal("removed")),
}
```

Indexes: `by_class`, `by_student`, `by_class_and_student`

---

### `sessions` †

```ts
{
  classId: v.id("classes"),
  hostId: v.id("users"),
  streamCallId: v.string(),
  scheduledAt: v.optional(v.number()),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  recordingUrl: v.optional(v.string()),
  recordingConsentRequired: v.boolean(),
}
```

Indexes: `by_class`, `by_class_and_started_at`

---

### `sessionLogs` †

```ts
{
  sessionId: v.id("sessions"),
  userId: v.id("users"),
  joinedAt: v.number(),
  leftAt: v.optional(v.number()),
  wasAdmittedFromLobby: v.boolean(),
}
```

Indexes: `by_session`, `by_user`

---

### `assignments` †

```ts
{
  classId: v.id("classes"),
  creatorId: v.id("users"),
  title: v.string(),
  instructions: v.string(),
  type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
  questions: v.array(v.object({
    id: v.string(),
    text: v.string(),
    options: v.optional(v.array(v.string())),
    correctOption: v.optional(v.number()),
  })),
  dueDateAt: v.optional(v.number()),
  sessionId: v.optional(v.id("sessions")),   // linked to a live session if in-class quiz
  isPublished: v.boolean(),
  createdAt: v.number(),
}
```

Indexes: `by_class`, `by_session`

---

### `submissions` †

```ts
{
  assignmentId: v.id("assignments"),
  studentId: v.id("users"),
  answers: v.array(v.object({
    questionId: v.string(),
    value: v.string(),           // selected option index or free-text
  })),
  submittedAt: v.number(),
  autoScore: v.optional(v.number()),   // 0–100, set for multiple_choice
  teacherScore: v.optional(v.number()),
  teacherFeedback: v.optional(v.string()),
}
```

Indexes: `by_assignment`, `by_student`, `by_assignment_and_student`

---

### `grades` †

```ts
{
  submissionId: v.id("submissions"),
  studentId: v.id("users"),
  classId: v.id("classes"),
  score: v.number(),     // 0–100
  gradedAt: v.number(),
  gradedBy: v.id("users"),
}
```

Indexes: `by_student_and_class`, `by_class`

---

### `parentLinks` †

```ts
{
  parentId: v.id("users"),
  studentId: v.id("users"),
  linkedAt: v.number(),
  consentGiven: v.boolean(),
  consentMethod: v.string(),     // "email_verified" | "admin_manual"
}
```

Indexes: `by_parent`, `by_student`

---

### `polls` †

```ts
{
  sessionId: v.id("sessions"),
  classId: v.id("classes"),
  creatorId: v.id("users"),
  question: v.string(),
  options: v.array(v.string()),
  isOpen: v.boolean(),
  createdAt: v.number(),
}
```

Indexes: `by_session`

---

### `pollResponses` †

```ts
{
  pollId: v.id("polls"),
  studentId: v.id("users"),
  selectedOption: v.number(),
  respondedAt: v.number(),
}
```

Indexes: `by_poll`, `by_poll_and_student`

---

### `scheduledSessions` †

```ts
{
  classId: v.id("classes"),
  teacherId: v.id("users"),
  title: v.string(),
  scheduledAt: v.number(),
  durationMinutes: v.number(),
  recurrence: v.optional(v.union(
    v.literal("none"),
    v.literal("weekly"),
    v.literal("biweekly")
  )),
  icalUid: v.string(),     // stable uid for iCal export
}
```

Indexes: `by_class`, `by_teacher_and_scheduled_at`

---

### `moderationFlags` †

```ts
{
  organizationId: v.id("organizations"),
  reportedBy: v.id("users"),
  targetUserId: v.optional(v.id("users")),
  streamMessageId: v.optional(v.string()),
  reason: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("reviewed"),
    v.literal("actioned"),
    v.literal("dismissed")
  ),
  reviewedBy: v.optional(v.id("users")),
  createdAt: v.number(),
}
```

Indexes: `by_organization_and_status`, `by_reported_by`

---

### `auditLogs` †

```ts
{
  organizationId: v.id("organizations"),
  actorId: v.id("users"),
  action: v.string(),      // e.g. "role_changed", "user_removed", "class_archived"
  targetId: v.optional(v.string()),
  meta: v.optional(v.string()),   // JSON stringified extra data
  createdAt: v.number(),
}
```

Indexes: `by_organization_and_created_at`

---

## 6. Component Architecture

```
app/
  (auth)/
    login/page.tsx
    register/page.tsx
    consent/page.tsx              ← Parental consent wizard (COPPA)
  (app)/
    layout.tsx                   ← AuthContext + StreamContext + OrgContext
    dashboard/page.tsx           ← Role-aware home: student class list / teacher studio / parent portal
    class/
      [classId]/
        page.tsx                 ← Class channel view + session controls
        session/[sessionId]/
          page.tsx               ← Full call room (extends current call/[callId])
        assignments/
          page.tsx               ← Assignment list
          [assignmentId]/page.tsx
    admin/
      page.tsx                   ← Org admin dashboard
      users/page.tsx
      classes/page.tsx
      moderation/page.tsx
      analytics/page.tsx
    staff/page.tsx               ← Staff channels (teacher/admin only)
    settings/page.tsx            ← Account, notifications, data export/delete
    schedule/page.tsx            ← Calendar / upcoming sessions

components/
  auth/
    LoginForm.tsx
    RegisterForm.tsx
    ConsentWizard.tsx            ← COPPA under-13 consent steps
  class/
    ClassSidebar.tsx             ← Enrolled classes list, grade-grouped
    ClassView.tsx                ← Channel messages + assignment quick-bar
    JoinCodeInput.tsx
    ClassHeader.tsx              ← Subject, grade, teacher info
  call/                         ← Extends current call/ components
    ClassCallRoom.tsx            ← Wraps CallRoom with teacher controls overlay
    Lobby.tsx                    ← Waiting room for students
    LobbyAdmitter.tsx            ← Teacher admits/rejects pending participants
    MuteAllButton.tsx
    SpotlightController.tsx      ← Teacher pins a student tile
    RaisedHandsPanel.tsx
    QAPanel.tsx
    PollPanel.tsx
    BreakoutManager.tsx          ← Create / monitor breakout rooms
    RecordingBanner.tsx          ← Consent notice when recording starts
  assignments/
    AssignmentCreator.tsx
    AssignmentViewer.tsx         ← Student view: answer and submit
    QuizResults.tsx              ← Teacher aggregate view
  gradebook/
    Gradebook.tsx
    GradeCell.tsx
  attendance/
    AttendanceReport.tsx
  parent/
    ParentPortal.tsx
    SessionSummaryCard.tsx
  admin/
    OrgAnalytics.tsx
    ModerationQueue.tsx
    UserTable.tsx
    AuditLogViewer.tsx
  schedule/
    CalendarView.tsx
    ScheduleSession.tsx
  ui/                            ← shadcn/ui primitives + grade-skin wrappers
    GradeSkin.tsx                ← Injects age-appropriate CSS class/theme

contexts/
  AuthContext.tsx
  StreamContext.tsx
  OrgContext.tsx                 ← Current organization, settings
  GradeSkinContext.tsx           ← UI adaptation for grade level

lib/
  session.ts
  gradeTheme.ts                  ← Returns theme tokens per grade band
  moderation.ts                  ← Client-side pre-filter helpers
  ical.ts                        ← iCal string builder for schedule export

convex/
  schema.ts
  auth.ts
  stream.ts
  classes.ts                    ← CRUD for classes, enrollments
  sessions.ts                   ← Session lifecycle, logs
  assignments.ts
  submissions.ts
  grades.ts
  polls.ts
  schedule.ts
  moderation.ts                  ← Flag, review queue
  admin.ts                       ← Admin mutations/queries
  organizations.ts
  parentLinks.ts
  auditLog.ts
```

---

## 7. Pages & Routes

```
/login
/register
/consent                        ← Parental consent (COPPA)

/dashboard                      ← Role-aware home page

/class/[classId]                ← Class channel (messages + files + call button)
/class/[classId]/session/[sid]  ← Live call room
/class/[classId]/assignments    ← Assignment list
/class/[classId]/assignments/[aid]

/schedule                       ← Calendar with upcoming sessions

/staff                          ← Staff-only channels (teacher+ role)

/admin                          ← School admin panel
/admin/users
/admin/classes
/admin/moderation
/admin/analytics
/admin/audit-log

/settings                       ← Profile, notifications, data privacy
```

---

## 8. Stream SDK Mapping

| Feature | Stream primitive |
|---------|-----------------|
| Class channel | `channel.type = "messaging"`, members = roster |
| Staff channel | `channel.type = "messaging"`, separate org prefix in channel id |
| Live session call | `videoClient.call("classroom", callId)` — use a custom `classroom` call type configured in Stream dashboard with lobby (waiting room) enabled |
| Staff meeting call | `videoClient.call("default", callId)` — no lobby |
| Breakout room | `videoClient.call("breakout", breakoutCallId)` — child call |
| Recording | Stream Video recording API — `call.startRecording()` / `call.stopRecording()` |
| Moderation | Stream Chat message flagging API + custom Convex handler via webhook |
| Auto captions | Stream Video `call.startTranscription()` — verify availability in live docs before implementing |
| Participant permissions | `call.updateUserPermissions()` — grant/revoke send-audio, send-video per student |
| Mute a participant | `call.muteUser(userId, "audio")` |
| Remove from call | `call.blockUser(userId)` |

### Custom call type configuration (`classroom`) — set in Stream Dashboard

```
- Max participants: 300
- Lobby (waiting room): enabled
- Recording: enabled
- Screensharing: enabled (host only or all — configurable per class)
- Permissions: 
    teacher → all capabilities
    student → send-audio, send-video, send-reaction (no screenshare by default)
```

---

## 9. Environment Variables

Extending the base PRD variables:

```env
# Stream (unchanged)
STREAM_API_KEY=
STREAM_API_SECRET=
NEXT_PUBLIC_STREAM_API_KEY=

# Convex (unchanged)
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

# Content moderation (V2)
PERSPECTIVE_API_KEY=              # Google Perspective API for text filtering

# Email / notifications (V2–V3)
RESEND_API_KEY=                   # Resend (or similar) for parental consent + digest emails
NEXT_PUBLIC_APP_URL=              # e.g. https://streamschool.app (for email links)

# Object storage for recordings (V3)
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
```

All secret keys (all without `NEXT_PUBLIC_`) must be set **only** in Convex environment variables (`npx convex env set`) when accessed from Convex actions, and in the Next.js server environment otherwise. Never expose to the client bundle.

---

## 10. Implementation Task Order

Tasks are grouped by phase and ordered by dependency. Each task is atomic and verifiable before moving to the next.

### Phase V1 — Core Classroom

```
EDU-T01  Add `role`, `organizationId`, `gradeLevel`, `isActive` fields to users schema
EDU-T02  Add organizations, classes, enrollments tables to schema.ts
EDU-T03  Write convex/organizations.ts — create, getBySlug
EDU-T04  Write convex/classes.ts — createClass, getClassesByTeacher, getClassesByStudent, enrollByJoinCode
EDU-T05  Create OrgContext.tsx — resolves current org from session, provides org settings
EDU-T06  Build ClassSidebar.tsx — lists enrolled classes, grouped by grade
EDU-T07  Build dashboard/page.tsx — role-aware: student sees classes; teacher sees "My Classes" + Create button
EDU-T08  Build class/[classId]/page.tsx — loads Stream channel, renders ClassView with ClassHeader
EDU-T09  Add ClassCallRoom.tsx wrapping existing CallRoom with teacher controls overlay (mute all, end for all)
EDU-T10  Build Lobby.tsx + LobbyAdmitter.tsx — student waiting room, teacher admit/reject panel
EDU-T11  Configure "classroom" call type in Stream Dashboard (lobby on, correct permissions)
EDU-T12  Add RaisedHandsPanel.tsx — students raise hand via emoji reaction; teacher sees ordered queue
EDU-T13  Build parent/ portal — ParentPortal.tsx, SessionSummaryCard.tsx, read-only class attendance
EDU-T14  Add parentLinks table + convex/parentLinks.ts — link parent to student via invite code
EDU-T15  Build ConsentWizard.tsx — COPPA parental consent flow (email verification)
EDU-T16  Add role-based route guards to all (app) routes — redirect by role to correct dashboard section
EDU-T17  Build JoinCodeInput.tsx + join-code enrollment mutation in convex/classes.ts
```

### Phase V2 — Engagement & Moderation

```
EDU-T18  Add sessions, sessionLogs tables to schema.ts
EDU-T19  Write convex/sessions.ts — createSession, endSession, logJoin, logLeave, getAttendance
EDU-T20  Add AttendanceReport.tsx — per-session present/late/absent table, CSV export
EDU-T21  Add assignments, submissions tables to schema.ts
EDU-T22  Write convex/assignments.ts + convex/submissions.ts
EDU-T23  Build AssignmentCreator.tsx (teacher) — multiple choice + short answer builder
EDU-T24  Build AssignmentViewer.tsx (student) — submit answers, see results after teacher releases
EDU-T25  Add polls, pollResponses tables to schema.ts
EDU-T26  Write convex/polls.ts — createPoll, submitResponse, getResults
EDU-T27  Build PollPanel.tsx — teacher broadcasts poll in-call; students respond; live results
EDU-T28  Build QAPanel.tsx — students submit text questions; teacher manages queue in-call
EDU-T29  Add moderationFlags table to schema.ts
EDU-T30  Write convex/moderation.ts — flagMessage, reviewFlag, getFlagQueue
EDU-T31  Integrate Perspective API via internalAction in convex/moderation.ts (Node runtime)
EDU-T32  Build admin/moderation/page.tsx — ModerationQueue.tsx with approve/dismiss/action
EDU-T33  Build BreakoutManager.tsx — teacher creates N groups, assigns students, broadcasts to all rooms
EDU-T34  Add parent email notifications via Resend internalAction — session start, weekly digest
EDU-T35  Add student file sharing with teacher moderation tray in ClassView.tsx
```

### Phase V3 — Full Platform

```
EDU-T36  Add grades, scheduledSessions, auditLogs tables to schema.ts
EDU-T37  Write convex/grades.ts — grade submission, get gradebook by class
EDU-T38  Build Gradebook.tsx (teacher) + student grade view in dashboard
EDU-T39  Write convex/schedule.ts — create/update/delete scheduledSessions, getUpcoming
EDU-T40  Build CalendarView.tsx + ScheduleSession.tsx — upcoming sessions, recurring schedule
EDU-T41  Build ical.ts lib + /api/schedule/[classId]/ical route for iCal file download
EDU-T42  Build RecordingBanner.tsx — consent notice triggered on call.startRecording()
EDU-T43  Implement recording storage flow — stream webhook → Convex action → S3 upload
EDU-T44  Add sessions recording UI — playback link in class timeline per session
EDU-T45  Build GradeSkinContext.tsx + gradeTheme.ts — grade-band token system (1-3, 4-8, 9-12)
EDU-T46  Apply GradeSkin.tsx to dashboard and class views — large icons for K-3, full UI for 9-12
EDU-T47  Build admin/analytics/page.tsx — OrgAnalytics.tsx with DAU, session count, attendance rate
EDU-T48  Write convex/auditLog.ts — logAction internalMutation called from every admin mutation
EDU-T49  Build admin/audit-log/page.tsx — AuditLogViewer.tsx paginated table
EDU-T50  Add multi-school org support — OrgContext resolves by subdomain via Next.js middleware
EDU-T51  Build settings/page.tsx — profile edit, notification preferences, data export, account delete
EDU-T52  Audit all components for WCAG 2.1 AA — ARIA roles, keyboard nav, contrast checks
EDU-T53  Add captions toggle in ClassCallRoom.tsx (call.startTranscription() — verify Stream API first)
```

---

## 11. Reference Documents (ordered by read priority)

Read these **before** writing any related code. Priority order reflects dependency depth.

### Must read before any code

| Priority | Document | Why |
|----------|----------|-----|
| 1 | `convex/_generated/ai/guidelines.md` | Convex API rules that override training data — read first always |
| 2 | `PRD.md` | Base architecture, existing component map, Stream client init patterns |
| 3 | `AGENTS.md` | Project-wide coding rules, security rules, Stream integration constraints |
| 4 | `STREAM_AUTH.md` | Exact token auth pattern — StreamVideoClient init, tokenProvider, cleanup |
| 5 | `getstreamextra.md` | Full Stream docs index and "which doc to fetch" map |
| 6 | `SETUP.md` | Environment setup, installed deps, Stream dashboard config steps |

### Stream live docs — fetch before each feature area

| Feature area | Doc URL to fetch |
|--------------|-----------------|
| Chat (all messaging features) | https://getstream.io/chat/docs/react.md |
| Video auth + token refresh | https://getstream.io/video/docs/react/guides/client-auth.md |
| Chat + Video ring calls, `useCalls` | https://getstream.io/video/docs/react/advanced/chat-with-video.md |
| Call layouts (SpeakerLayout, grid) | https://getstream.io/video/docs/react/ui-components/core/call-layout/ |
| Ringing call UI | https://getstream.io/video/docs/react/ui-cookbook/ringing-call/ |
| Participant permissions, mute | https://getstream.io/video/docs/react/guides/permissions-and-moderation/ |
| Recording | https://getstream.io/video/docs/react/guides/recording-calls/ |
| Transcription / captions | https://getstream.io/video/docs/react/guides/transcriptions/ |
| Waiting room / lobby | https://getstream.io/video/docs/react/guides/lobby/ |
| Custom call types | https://getstream.io/video/docs/react/call_types/ |
| React Compiler compat | https://getstream.io/video/docs/react/advanced/react-compiler/ |

### External compliance and integration docs

| Topic | Resource |
|-------|----------|
| COPPA compliance | https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa |
| FERPA overview | https://studentprivacy.ed.gov/ferpa |
| Stream Data Processing Agreement | https://getstream.io/legal/dpa/ — must be signed before going live with student data |
| Google Perspective API (moderation) | https://developers.perspectiveapi.com/s/docs |
| Resend email SDK | https://resend.com/docs/send-with-nextjs |
| iCal RFC 5545 | https://datatracker.ietf.org/doc/html/rfc5545 |

---

*Last updated: March 2026. All Stream API references must be verified against live docs before implementation — the SDK evolves frequently.*
