# EDU Build Tasks — StreamSchool K–12 Platform

Complete tasks in order within each phase. Mark each complete (`[x]`) before starting the next.  
Read `SPECS-EDU.md` for full feature context, `COMPLIANCE.md` for safety implementation patterns, and `EDU-SETUP.md` for new dependencies before starting.

**Prerequisite:** All base tasks T01–T35 in `TASKS.md` must be complete before starting here.  
See `CURRENT-STATE.md` for current base-app completion status.

---

## Phase V1 — Core Classroom

### Schema & backend foundation

- [ ] **EDU-T01** — Extend `convex/schema.ts`:
  - Add `role`, `organizationId`, `gradeLevel`, `isActive`, `parentConsentGiven`, `parentConsentAt`, `avatarUrl`, `lastSeenAt` fields to `users` table
  - Add indexes: `by_organization`, `by_role_and_organization`
  - Add `organizations` table (see `SPECS-EDU.md` §5)
  - Add `classes` table with indexes `by_organization`, `by_teacher`, `by_join_code`
  - Add `enrollments` table with indexes `by_class`, `by_student`, `by_class_and_student`
  - Deploy and verify: `npx convex dev` must show zero errors

- [ ] **EDU-T02** — Write `convex/organizations.ts`:
  - `createOrganization` internalMutation: insert org, return id
  - `getBySlug` query: fetch org by slug, return org or null
  - `getById` internalQuery: fetch org by id
  - All functions with full arg and return validators

- [ ] **EDU-T03** — Write `convex/classes.ts`:
  - `createClass` mutation (teacher role only): insert class record, create Stream `messaging` channel with `channel.type = "classroom"` via `ctx.runAction(internal.stream.createClassChannel)`
  - `getClassesByTeacher` query: classes where `teacherId == caller`
  - `getClassesByStudent` query: joins `enrollments` → `classes` for a student
  - `getClassById` query: single class, verified membership
  - `enrollByJoinCode` mutation: validate code, insert enrollment, add user to Stream channel
  - `archiveClass` mutation (teacher only): set `isArchived = true`

- [ ] **EDU-T04** — Extend `convex/stream.ts`:
  - `createClassChannel` internalAction: use Stream server SDK to create a channel of type `"classroom"` with the teacher as owner
  - `addMemberToChannel` internalAction: call `channel.addMembers([streamUserId])`
  - `removeMemberFromChannel` internalAction: call `channel.removeMembers([streamUserId])`
  - All Node runtime actions — keep `"use node";` at top of file

- [ ] **EDU-T05** — Write `convex/parentLinks.ts`:
  - `createLink` mutation: insert `parentLinks` record, send invite email via `internal.notifications.sendParentInvite`
  - `acceptLink` mutation: set `consentGiven = true`, write `consentMethod`
  - `getLinksByParent` query: all children linked to a parent
  - `getLinksByStudent` query: all parents linked to a student

### Contexts & routing

- [ ] **EDU-T06** — Create `src/contexts/OrgContext.tsx`:
  - Reads `organizationId` from current session (extend `AuthContext` session type to include `organizationId`, `role`, `gradeLevel`)
  - Fetches org via `api.organizations.getById`
  - Provides `org`, `orgSettings`, `userRole` to all children
  - Must be mounted inside `AuthContext` but outside `StreamContext`

- [ ] **EDU-T07** — Create `src/contexts/GradeSkinContext.tsx`:
  - Derives `gradeBand: "primary" | "middle" | "high"` from `gradeLevel` in session (1–3 → primary, 4–8 → middle, 9–12 → high; teachers and admins get "high")
  - Sets `data-grade-band` attribute on `<body>` element
  - Provides `gradeBand` and `isBand(band)` helper to all consumers
  - Read `GRADE-SKIN.md` before implementing

- [ ] **EDU-T08** — Update `src/app/(app)/layout.tsx`:
  - Mount `OrgContext` and `GradeSkinContext` around existing `StreamContext`
  - Add role-based redirect: students without `isActive` → `/pending-approval`; parents → `/parent`; admins → `/admin` dashboard on first login

- [ ] **EDU-T09** — Update `src/app/(auth)/register/page.tsx` and `RegisterForm.tsx`:
  - Add role selector (Student / Teacher / Parent)
  - Add date of birth field — if age < 13, set `requiresParentalConsent = true` in session and redirect to `/consent` after registration
  - Add `organizationId` resolution by subdomain (use `OrgContext` or a pre-auth org resolver)
  - Add `gradeLevel` selector for students (1–12)

### Consent flow

- [ ] **EDU-T10** — Create `src/app/(auth)/consent/page.tsx` + `src/components/auth/ConsentWizard.tsx`:
  - Step 1: Explain what data is collected and why (plain language, age-appropriate)
  - Step 2: Collect parent/guardian email address
  - Step 3: Send consent email via `api.notifications.sendParentConsentEmail` (Convex action → Resend)
  - Step 4: Show "check your email" confirmation; gate access until consent confirmed
  - On consent confirmed (parent clicks link → `/consent/confirm?token=...`): write `parentConsentGiven = true` to user record, activate account
  - Read `COMPLIANCE.md` §1 before implementing

### Class UI

- [ ] **EDU-T11** — Create `src/components/class/ClassSidebar.tsx`:
  - Replaces/wraps existing `Sidebar.tsx` for edu routes
  - Lists enrolled classes grouped by subject, ordered by next scheduled session
  - Teachers see their classes with "Create class" button at top
  - Badge shows unread message count per class channel (Stream Chat `channel.countUnread()`)
  - Applies grade skin: primary band shows large icons + class color dots, no text labels on mobile

- [ ] **EDU-T12** — Create `src/components/class/ClassHeader.tsx`:
  - Displays class name, subject, grade level, teacher avatar, enrollment count
  - Teacher view: shows "Start Session" button + gear icon for class settings
  - Student view: shows "Join Session" button when a session is active

- [ ] **EDU-T13** — Create `src/app/(app)/class/[classId]/page.tsx`:
  - Loads class from Convex, verifies enrollment
  - Renders `ClassHeader` + `ClassView` (reuses Stream `<Channel>` from `ChannelView.tsx` patterns)
  - Renders `AssignmentBar` (collapsed panel at bottom, V2 content — stub in V1)
  - Redirects non-members to `/dashboard`

- [ ] **EDU-T14** — Create `src/app/(app)/dashboard/page.tsx`:
  - Role-aware layout:
    - Student: class grid with next session time, recent assignment, attendance streak
    - Teacher: "My Classes" list + "Create Class" CTA + upcoming sessions panel
    - Parent: linked children's class list (read-only) + teacher DM button
    - Admin: org stats cards + quick links to `/admin` sections

### Lobby & live session

- [ ] **EDU-T15** — Create `src/components/call/Lobby.tsx`:
  - Student waiting room shown before teacher admits them
  - Shows class name, teacher name, "Waiting to be admitted…" state with animated indicator
  - Shows device check (mic/camera preview using `useCallStateHooks`)
  - Read `https://getstream.io/video/docs/react/ui-cookbook/lobby-preview.md` before implementing

- [ ] **EDU-T16** — Create `src/components/call/LobbyAdmitter.tsx`:
  - Teacher-only panel (shown alongside `ClassCallRoom`)
  - Lists participants pending in lobby with name and avatar
  - "Admit" button → `call.updateUserPermissions` or lobby grant API
  - "Deny" button → `call.blockUser` from lobby
  - Read `https://getstream.io/video/docs/react/guides/permissions-and-moderation.md` before implementing

- [ ] **EDU-T17** — Create `src/components/call/ClassCallRoom.tsx`:
  - Wraps existing `CallRoom.tsx` (`<CallRoom call={call} onLeave={onLeave} />`)
  - Renders `LobbyAdmitter` as a slide-in panel (teacher only, `userRole === "teacher"`)
  - Renders `MuteAllButton` in the controls bar (teacher only)
  - Renders `RaisedHandsPanel` toggle button in controls
  - Passes `callType = "classroom"` when joining

- [ ] **EDU-T18** — Create `src/components/call/MuteAllButton.tsx`:
  - Calls `call.muteAllUsers("audio")` on click
  - Shows confirmation toast "All participants muted"
  - Teacher only — guard with role check before rendering

- [ ] **EDU-T19** — Create `src/components/call/RaisedHandsPanel.tsx`:
  - Students: single "Raise Hand" button — sends a Stream Video custom event `{ type: "raise-hand", userId }`
  - Teacher: panel listing students who raised hands in order, with "Lower hand" dismiss button per student
  - Read `https://getstream.io/video/docs/react/guides/custom-events.md` before implementing

- [ ] **EDU-T20** — Create `src/app/(app)/class/[classId]/session/[sessionId]/page.tsx`:
  - Fetches call via `videoClient.call("classroom", sessionCallId)`
  - If teacher: join with `create: true`, write session record to Convex
  - If student: joins lobby, waits for admit
  - Renders `<ClassCallRoom>`

### Parent portal (V1 read-only)

- [ ] **EDU-T21** — Create `src/components/parent/ParentPortal.tsx`:
  - Shows linked child/children selector at top
  - Lists classes per child with teacher name and last session date
  - Shows attendance status per class (present / absent counts from `sessionLogs`)
  - "Message teacher" button → opens DM channel with the class teacher

- [ ] **EDU-T22** — Create `src/app/(app)/parent/page.tsx`:
  - Renders `ParentPortal`
  - Role-guarded: redirects non-parents to `/dashboard`

### Admin panel (V1 basic)

- [ ] **EDU-T23** — Write `convex/admin.ts`:
  - `inviteUser` mutation (admin only): create user record with `isActive = false`, send invite email
  - `getAllClasses` query (admin only): all classes in org with member counts
  - `getAllUsers` query (admin only): paginated user list for org
  - `deactivateUser` mutation (admin only): set `isActive = false`

- [ ] **EDU-T24** — Create `src/app/(app)/admin/page.tsx` + `src/app/(app)/admin/users/page.tsx` + `src/app/(app)/admin/classes/page.tsx`:
  - Admin dashboard home: org name, user count, class count, flagged content count
  - Users page: `UserTable.tsx` with role badge, active status, deactivate button
  - Classes page: class list with teacher, enrollment count, archive button
  - All pages role-guarded to `school_admin` and `platform_admin`

---

## Phase V2 — Engagement & Moderation

### Session logging & attendance

- [ ] **EDU-T25** — Add `sessions` and `sessionLogs` tables to `convex/schema.ts` (see `SPECS-EDU.md` §5); deploy

- [ ] **EDU-T26** — Write `convex/sessions.ts`:
  - `createSession` mutation: insert session record, return `sessionId`
  - `endSession` mutation: set `endedAt`, compute attendance summary
  - `logJoin` internalMutation: insert `sessionLog` on participant join (called from Stream webhook handler)
  - `logLeave` internalMutation: update `leftAt` on participant leave
  - `getAttendance` query: returns present/late/absent per student for a session (late = joined > 5min after session start)
  - `getSessionsByClass` query: paginated session list for a class

- [ ] **EDU-T27** — Create `src/components/attendance/AttendanceReport.tsx`:
  - Table: student name, join time, leave time, status badge (Present / Late / Absent)
  - CSV export button: builds and downloads `attendance-{sessionId}.csv`
  - Teacher and admin only

- [ ] **EDU-T28** — Wire Stream Video webhook to Convex: create `convex/http.ts` HTTP endpoint `/webhooks/stream-video`; handle `call.session_participant_joined` and `call.session_participant_left` events to call `internal.sessions.logJoin` / `internal.sessions.logLeave`. Read `https://getstream.io/video/docs/react/webhooks/overview.md` first.

### Assignments

- [ ] **EDU-T29** — Add `assignments` and `submissions` tables to `convex/schema.ts`; deploy

- [ ] **EDU-T30** — Write `convex/assignments.ts`:
  - `createAssignment` mutation (teacher only): insert assignment, return id
  - `publishAssignment` mutation: set `isPublished = true`
  - `getAssignmentsByClass` query: all published assignments for a class
  - `getAssignmentById` query: single assignment, verified class membership

- [ ] **EDU-T31** — Write `convex/submissions.ts`:
  - `submitAnswers` mutation (student only): insert submission, compute `autoScore` for multiple-choice
  - `gradeSubmission` mutation (teacher only): set `teacherScore` and `teacherFeedback`
  - `getSubmissionsByAssignment` query (teacher only): all submissions for an assignment
  - `getMySubmission` query: student's own submission for an assignment

- [ ] **EDU-T32** — Create `src/components/assignments/AssignmentCreator.tsx`:
  - Form: title, instructions, type selector (Multiple Choice / Short Answer)
  - Multiple choice: add/remove questions, add/remove options per question, mark correct option
  - Short answer: add/remove questions with text prompts
  - Due date picker (shadcn Calendar component)
  - "Save Draft" → `createAssignment`; "Publish" → `publishAssignment`

- [ ] **EDU-T33** — Create `src/components/assignments/AssignmentViewer.tsx`:
  - Student view: reads published assignment, renders questions
  - Multiple choice: radio buttons per question
  - Short answer: textarea per question
  - Submit button → `submitAnswers` mutation; shows score immediately for multiple-choice
  - Grade-skin adaptation: primary band shows larger radio targets and simpler layout

- [ ] **EDU-T34** — Create `src/components/assignments/QuizResults.tsx`:
  - Teacher view: per-question bar chart showing option distribution
  - Student average score callout
  - Student list with individual scores and link to their submission detail

### Polls & in-session engagement

- [ ] **EDU-T35** — Add `polls` and `pollResponses` tables to `convex/schema.ts`; deploy

- [ ] **EDU-T36** — Write `convex/polls.ts`:
  - `createPoll` mutation (teacher only): insert poll, `isOpen = true`
  - `closePoll` mutation: set `isOpen = false`
  - `submitPollResponse` mutation (student only): insert response, enforce one response per student per poll
  - `getPollResults` query: returns option counts (teacher sees per-student breakdown; student sees aggregate only)

- [ ] **EDU-T37** — Create `src/components/call/PollPanel.tsx`:
  - Teacher view: question input + options builder + "Launch Poll" → `createPoll`; live result bars auto-updating; "Close Poll" button
  - Student view: shows open poll as modal overlay during session; radio select + submit
  - Pushes poll data via Stream Video custom event `{ type: "poll-launched", pollId }` to all participants
  - Read `https://getstream.io/video/docs/react/guides/custom-events.md` before implementing

- [ ] **EDU-T38** — Create `src/components/call/QAPanel.tsx`:
  - Students submit text questions (stored as Stream custom events or in-call messages)
  - Teacher sees queue of pending questions with student name
  - "Answer" marks as answered and highlights that student's tile; "Skip" removes from queue
  - Questions are anonymous to other students (teacher sees names)

### Breakout rooms

- [ ] **EDU-T39** — Create `src/components/call/BreakoutManager.tsx`:
  - Teacher UI: set number of rooms (2–8), assign students manually or auto-randomly
  - "Start Breakout" button: creates N child calls with IDs `{parentCallId}-breakout-{n}` via `videoClient.call("default", breakoutCallId).join({ create: true })`
  - "Broadcast message" input: sends a message to the chat of all breakout room channels simultaneously
  - "End all breakouts" + countdown timer
  - "Join room N" button for teacher to peek into any room
  - Each student receives a Stream Video custom event `{ type: "breakout-assigned", callId }` directing them to join their room
  - Read `https://getstream.io/video/docs/react/guides/custom-events.md` and `https://getstream.io/video/docs/react/guides/joining-and-creating-calls.md` before implementing

### Content moderation

- [ ] **EDU-T40** — Add `moderationFlags` table to `convex/schema.ts`; deploy

- [ ] **EDU-T41** — Write `convex/moderation.ts`:
  - `checkMessage` internalAction (Node runtime, `"use node";`): calls Perspective API with message text; if `TOXICITY > 0.7` or `SEVERE_TOXICITY > 0.5` or `IDENTITY_ATTACK > 0.6` → return `{ hold: true, score }`
  - `flagMessage` mutation: insert `moderationFlag` record with `status = "pending"`
  - `reviewFlag` mutation (teacher/admin only): set `status = "reviewed"` | `"actioned"` | `"dismissed"`; if actioned, call `internal.stream.deleteMessage`
  - `getFlagQueue` query (teacher/admin only): all pending flags for org
  - Read `COMPLIANCE.md` §3 before implementing

- [ ] **EDU-T42** — Wire moderation to Stream Chat webhook: in `convex/http.ts`, handle `message.new` webhook event; call `internal.moderation.checkMessage`; if hold → call `internal.stream.shadowHoldMessage` (mark message as pending in Stream). Read `https://getstream.io/chat/docs/react/moderation.md` first.

- [ ] **EDU-T43** — Create `src/app/(app)/admin/moderation/page.tsx` + `src/components/admin/ModerationQueue.tsx`:
  - Table: flagged message text, author, channel, flag reason, timestamp
  - Action buttons: "Approve & deliver", "Delete", "Dismiss flag"
  - Filter tabs: Pending / Reviewed / All

### Parent notifications

- [ ] **EDU-T44** — Write `convex/notifications.ts`:
  - `sendParentConsentEmail` internalAction: Resend email with consent link and child account details
  - `sendParentInvite` internalAction: email to parent with link to create their own account and link to child
  - `sendSessionStartNotification` internalAction: email to all parents of enrolled students when a session is created
  - `sendWeeklyDigest` internalAction: summary of sessions attended, assignments submitted per child (called by cron)
  - All internalActions in Node runtime

- [ ] **EDU-T45** — Add cron in `convex/crons.ts`: run `internal.notifications.sendWeeklyDigest` every Monday at 7am UTC using `crons.cron("weekly parent digest", { minuteUTC: 0, hourUTC: 7, dayOfWeek: "monday" }, internal.notifications.sendWeeklyDigest, {})`

---

## Phase V3 — Full Platform

### Gradebook

- [ ] **EDU-T46** — Add `grades` table to `convex/schema.ts`; deploy

- [ ] **EDU-T47** — Write `convex/grades.ts`:
  - `recordGrade` mutation (teacher only): upsert grade from submission
  - `getGradebookByClass` query (teacher/admin only): all students × all assignments matrix
  - `getMyGrades` query (student): own grades across all assignments for a class
  - `getChildGrades` query (parent): child's grades (verified via `parentLinks`)

- [ ] **EDU-T48** — Create `src/components/gradebook/Gradebook.tsx`:
  - Teacher: spreadsheet-style grid — rows = students, columns = assignments, cells = score or "—"
  - Click a cell: opens inline grade edit for short-answer assignments
  - Column header shows assignment average
  - "Export CSV" button downloads full gradebook

- [ ] **EDU-T49** — Add student grade view to `src/app/(app)/class/[classId]/page.tsx`:
  - "My Grades" tab alongside class chat
  - Shows assignment list with score, submission date, teacher feedback

### Scheduling & calendar

- [ ] **EDU-T50** — Add `scheduledSessions` table to `convex/schema.ts`; deploy

- [ ] **EDU-T51** — Write `convex/schedule.ts`:
  - `createScheduledSession` mutation (teacher only): insert record, generate stable `icalUid`
  - `getUpcoming` query: all sessions in next 30 days for current user's classes
  - `deleteScheduledSession` mutation: soft-delete (set archived flag)

- [ ] **EDU-T52** — Create `src/components/schedule/CalendarView.tsx`:
  - Month/week toggle (shadcn Calendar or a lightweight grid)
  - Upcoming sessions as colored event blocks per class
  - Click event → class details + "Join when live" button (enabled only when session is active)

- [ ] **EDU-T53** — Create `src/lib/ical.ts` + `src/app/api/schedule/[classId]/ical/route.ts`:
  - Route handler: verifies auth, builds RFC 5545 iCal string from `scheduledSessions`, returns with `Content-Type: text/calendar`
  - `ical.ts`: `buildIcal(sessions: ScheduledSession[]): string` — pure function, no external lib required for simple implementation

### Recording

- [ ] **EDU-T54** — Create `src/components/call/RecordingBanner.tsx`:
  - Appears as a banner at the top of `ClassCallRoom` when recording is active
  - Shown to all participants (including students who join mid-recording)
  - Teacher controls: "Stop Recording" button
  - Must be shown **before** `call.startRecording()` is called — teacher sees a confirmation dialog first
  - Read `COMPLIANCE.md` §4 and `https://getstream.io/video/docs/react/recording/calls.md` before implementing

- [ ] **EDU-T55** — Wire recording storage: in `convex/http.ts`, handle `call.recording_ready` Stream webhook; download recording URL from payload; upload to S3 via `internal.recordings.storeRecording`; update `sessions.recordingUrl`

- [ ] **EDU-T56** — Add recording playback UI to class page: "Past Sessions" tab shows session list with recording thumbnail and play link (opens recording URL in a new tab or in-app player)

### Grade-adaptive UI

- [ ] **EDU-T57** — Create `src/lib/gradeTheme.ts`:
  - Export `GRADE_BANDS` constant mapping band → CSS variable overrides (font size scale, icon size, border radius, button height)
  - Export `getGradeBand(gradeLevel: number): GradeBand` function

- [ ] **EDU-T58** — Create `src/components/ui/GradeSkin.tsx`:
  - Reads `gradeBand` from `GradeSkinContext`
  - Sets CSS variables on a wrapping `<div>` according to `gradeTheme.ts`
  - Mount once at the top of `app/(app)/layout.tsx` wrapping all content
  - Read `GRADE-SKIN.md` fully before implementing

- [ ] **EDU-T59** — Apply grade-band-conditional rendering to key components:
  - `ClassSidebar.tsx`: primary band → icon + color dot only (no text labels); high band → compact text list
  - `ClassCallRoom.tsx`: primary band → hide Q&A panel, screenshare button, layout switcher; show only mic/camera/leave
  - `RaisedHandsPanel.tsx`: primary band → single large ✋ button, no text queue
  - `AssignmentViewer.tsx`: primary band → larger radio targets, one question visible at a time

### Advanced admin

- [ ] **EDU-T60** — Add `auditLogs` table to `convex/schema.ts`; deploy

- [ ] **EDU-T61** — Write `convex/auditLog.ts`:
  - `logAction` internalMutation: insert audit record — call from every admin mutation
  - `getAuditLog` query (admin only): paginated log for org, filterable by action type and actor

- [ ] **EDU-T62** — Create `src/app/(app)/admin/analytics/page.tsx` + `src/components/admin/OrgAnalytics.tsx`:
  - Cards: DAU (last 7 days), total sessions this month, avg session duration, attendance rate %
  - Line chart: daily active users (7-day window) using a lightweight chart lib (Recharts or Chart.js)
  - Class health table: classes flagged for no session > 7 days, low attendance < 60%

- [ ] **EDU-T63** — Create `src/app/(app)/admin/audit-log/page.tsx` + `src/components/admin/AuditLogViewer.tsx`:
  - Paginated table: timestamp, actor, action, target, metadata
  - Filter by action type (role_changed, user_removed, class_archived, etc.)

### Multi-school & white-label

- [ ] **EDU-T64** — Create `src/middleware.ts`:
  - Resolve `organizationId` from subdomain (`req.nextUrl.hostname` → strip `.streamschool.app` suffix → look up org by slug)
  - Attach resolved `orgId` to request headers for use in server components
  - Pass through for localhost (development mode)

- [ ] **EDU-T65** — Update `OrgContext.tsx` to read org from the header set by middleware when running on a custom subdomain, falling back to query-param `?org=` for localhost dev

### Accessibility

- [ ] **EDU-T66** — Audit all custom components for WCAG 2.1 AA:
  - All `<button>` elements have accessible labels (no icon-only buttons without `aria-label`)
  - All form fields have associated `<label>` or `aria-label`
  - `ParticipantList`, `RaisedHandsPanel`, `QAPanel` have correct `role="list"` and `role="listitem"`
  - Color contrast: run axe-core or similar against all three grade skins
  - Keyboard navigation: Tab order is logical through all panels; Escape closes all modals

- [ ] **EDU-T67** — Add captions toggle to `ClassCallRoom.tsx`:
  - Teacher "CC" button: calls `call.startTranscription()` / `call.stopTranscription()`
  - Captions overlay renders transcription events from `useCallStateHooks` (verify exact hook name in live docs: `https://getstream.io/video/docs/react/transcribing/calls.md` before implementing)

### Data privacy

- [ ] **EDU-T68** — Add data export + account deletion to `src/app/(app)/settings/page.tsx`:
  - "Export my data" button: triggers Convex action that collects all user records (messages via Stream export API, Convex rows) and emails a JSON archive to the user's registered email
  - "Delete my account" button: confirmation dialog → deactivates user, queues deletion of PII after 30-day retention window
  - Read `COMPLIANCE.md` §2 before implementing

---

## Acceptance Criteria — Full Platform

- [ ] A teacher can create a class, share a join code, and start a live session with lobby enabled
- [ ] Students under 13 cannot access the platform without recorded parental consent
- [ ] Student messages pass through moderation before delivery; flagged messages appear in the teacher queue
- [ ] Teacher can mute all students, admit/deny from lobby, and end the session for all
- [ ] Assignments can be created, published, and submitted; multiple-choice is auto-scored
- [ ] Polls launch inside a live session and show live results to teacher, aggregate to students
- [ ] Attendance is automatically recorded per session from Stream webhooks
- [ ] Parents can see their child's attendance, grades, and message the teacher
- [ ] Admins can manage all users and classes, view the moderation queue, and export org data
- [ ] Recording requires a consent banner before starting; recording URL is stored in Convex
- [ ] Primary-band (grades 1–3) UI shows large icons, no advanced call controls, simplified chat
- [ ] All interactive elements are keyboard-accessible and meet 4.5:1 contrast ratio
- [ ] Subdomain routing resolves to the correct organization
- [ ] Stream API secret is never exposed to the browser; all tokens generated server-side via Convex
