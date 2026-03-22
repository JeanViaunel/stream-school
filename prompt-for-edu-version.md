You are building StreamSchool — a K–12 virtual classroom platform — on top of an existing Next.js + Convex + Stream Chat/Video codebase. The base app (messaging, video calls, auth) is already complete. Your job is to build all educational platform features described in the project docs.

═══════════════════════════════════════════
STEP 1 — READ THESE FILES BEFORE ANYTHING ELSE (in this order)
═══════════════════════════════════════════

Read every file in this list completely before writing a single line of code. Do not skip any.

1. convex/\_generated/ai/guidelines.md — Convex API rules. These override your training data.
2. AGENTS.md — Security rules, Stream rules, TypeScript rules, component rules. All non-negotiable.
3. CURRENT-STATE.md — Full inventory of what is already built. Do not recreate any of it.
4. SPECS-EDU.md — Full product spec: personas, features V1→V3, data model, component architecture, routes.
5. EDU-TASKS.md — 68 ordered atomic build tasks. This is your work queue.
6. EDU-SETUP.md — New dependencies, Stream Dashboard config, env vars you need before coding.
7. COMPLIANCE.md — COPPA/FERPA/moderation implementation patterns. Read before any auth, moderation, or recording work.
8. GRADE-SKIN.md — Design spec for three grade-band UIs (Primary/Middle/High). Read before any UI component.
9. STREAM_AUTH.md — Stream token auth pattern. Read before touching StreamVideoClient or StreamChat.
10. getstreamextra.md — Full Stream SDK doc index + "which page?" map for both base app and EDU features.
11. PRD.md — Base app architecture (for context on existing patterns).

═══════════════════════════════════════════
STEP 2 — INSTALL MISSING DEPENDENCIES FIRST
═══════════════════════════════════════════

Before writing any code, run the npm install and shadcn add commands listed in EDU-SETUP.md §1. Verify with `npx convex dev` that the deployment is healthy.

Do NOT run `npm run dev` or `npm run build` unless explicitly asked.

═══════════════════════════════════════════
STEP 3 — WORK THE TASK LIST
═══════════════════════════════════════════

Work EDU-TASKS.md from EDU-T01 through EDU-T68 in order. Mark each task [x] before moving to the next. Never skip a task; never mark a task done without having written and verified the code.

USE SUBAGENTS FOR PARALLEL WORK. The following groups of tasks are independent and should be launched as parallel subagents simultaneously to save time:

PARALLEL BATCH A (schema + backend, no UI dependency — run all at once):
• EDU-T01 through EDU-T05 — Convex schema extensions + backend files (organizations, classes, parentLinks, stream channel helpers)

PARALLEL BATCH B (contexts + routing — depends on Batch A schema only):
• EDU-T06 — OrgContext
• EDU-T07 — GradeSkinContext
• EDU-T08 — layout.tsx update

PARALLEL BATCH C (V1 UI components — independent of each other, depend on Batch B):
• EDU-T09 + EDU-T10 — RegisterForm update + ConsentWizard (assign together, they share the registration flow)
• EDU-T11 + EDU-T12 + EDU-T13 + EDU-T14 — ClassSidebar, ClassHeader, class page, dashboard page
• EDU-T15 + EDU-T16 + EDU-T17 + EDU-T18 + EDU-T19 + EDU-T20 — Lobby, LobbyAdmitter, ClassCallRoom, MuteAllButton, RaisedHandsPanel, session page

PARALLEL BATCH D (V1 portal + admin — independent of Batch C):
• EDU-T21 + EDU-T22 — ParentPortal + parent page
• EDU-T23 + EDU-T24 — Admin Convex functions + admin pages

PARALLEL BATCH E (V2 backend — schema + Convex files, run together after Batch A):
• EDU-T25 + EDU-T26 + EDU-T27 + EDU-T28 — Sessions schema, sessions.ts, AttendanceReport, webhook handler
• EDU-T29 + EDU-T30 + EDU-T31 — Assignments schema, assignments.ts, submissions.ts
• EDU-T35 + EDU-T36 — Polls schema, polls.ts

PARALLEL BATCH F (V2 UI components — after Batch E):
• EDU-T32 + EDU-T33 + EDU-T34 — AssignmentCreator, AssignmentViewer, QuizResults
• EDU-T37 + EDU-T38 — PollPanel, QAPanel
• EDU-T39 — BreakoutManager

PARALLEL BATCH G (V2 moderation + notifications — independent):
• EDU-T40 + EDU-T41 + EDU-T42 + EDU-T43 — Moderation schema, moderation.ts, webhook, admin moderation page
• EDU-T44 + EDU-T45 — notifications.ts + cron

PARALLEL BATCH H (V3 — run groups simultaneously after V2 is complete):
• EDU-T46 + EDU-T47 + EDU-T48 + EDU-T49 — Grades schema, grades.ts, Gradebook.tsx, student grade view
• EDU-T50 + EDU-T51 + EDU-T52 + EDU-T53 — Schedule schema, schedule.ts, CalendarView, iCal route
• EDU-T54 + EDU-T55 + EDU-T56 — RecordingBanner, recording webhook, playback UI
• EDU-T57 + EDU-T58 + EDU-T59 — gradeTheme.ts, GradeSkin.tsx, grade-conditional rendering

Sequential (must run one at a time, in order, after all V3 batches):
• EDU-T60 through EDU-T68 — Admin advanced (auditLogs, analytics, multi-school, accessibility, captions, data privacy)

═══════════════════════════════════════════
STEP 4 — BEFORE WRITING EACH FEATURE AREA
═══════════════════════════════════════════

For every task that touches Stream SDK, fetch the relevant doc URL from the EDU "which page?" map in getstreamextra.md BEFORE writing the code. Do not guess Stream API method signatures — they change between versions.

For every task tagged with COPPA, FERPA, moderation, or recording: re-read the relevant section of COMPLIANCE.md before implementing.

For every UI component: check GRADE-SKIN.md to see if the component has grade-band-specific behavior or a feature gate.

═══════════════════════════════════════════
HARD RULES (from AGENTS.md — never violate)
═══════════════════════════════════════════

SECURITY:

- STREAM*API_SECRET must NEVER appear in any NEXT_PUBLIC* var, client component, or browser file.
- All Stream token generation: Convex internalAction only, using @stream-io/node-sdk.
- All Perspective API calls: Convex internalAction, Node runtime ("use node"; at top of file), with doNotStore: true in every request body.
- Recording consent banner must appear BEFORE call.startRecording() is called, never after.
- Under-13 users must not connect to Stream Chat/Video until parentConsentGiven === true.

CONVEX:

- Always use the new function syntax with explicit args and returns validators.
- Use internalQuery/internalMutation/internalAction for all private functions.
- Never use ctx.db inside an action. Use ctx.runQuery / ctx.runMutation.
- Always define indexes in schema.ts and use withIndex in queries. Never use .filter().
- If a function returns nothing, use returns: v.null() and return null.

NEXT.JS:

- App Router exclusively. No Pages Router.
- Never use "use client" in layout files. Keep providers in dedicated client components.
- Protected routes: redirect non-authenticated users in (app)/layout.tsx.

TYPESCRIPT:

- Strict mode. No any. No @ts-ignore.
- Use Id<'tableName'> from convex/\_generated/dataModel for all Convex document IDs.

COMPONENTS:

- No inline styles. Tailwind utility classes only.
- No business logic in page files — pages only compose components.
- Use shadcn/ui primitives before writing custom UI elements.
- Keep components small and single-purpose.
- Do not add comments that describe what code does. Only add comments that explain non-obvious intent or constraints.

SCOPE:

- Only modify code required by the current task. No drive-by refactors.
- Read the surrounding code before writing. Match naming, types, and abstraction level.

═══════════════════════════════════════════
STEP 5 — AFTER EACH TASK
═══════════════════════════════════════════

1. Mark the task [x] in EDU-TASKS.md.
2. Run ReadLints on every file you edited. Fix any linter errors before moving on.
3. Verify Convex schema changes with `npx convex dev` (check for deploy errors).
4. Do not run the dev server or build unless explicitly asked.

═══════════════════════════════════════════
YOUR GOAL
═══════════════════════════════════════════

A fully functional K–12 virtual classroom platform where:

- Teachers create class spaces, start sessions with a waiting room, admit students, mute/remove participants, share their screen, run polls and Q&A, create assignments, and view attendance.
- Students (grades 1–12) see an age-appropriate interface, join sessions from a lobby, raise their hand, take assignments, and see their grades.
- Parents receive consent emails, link to their child's account, and view attendance and teacher messages.
- Admins manage the org roster, review the moderation queue, view analytics, and export FERPA-compliant data.
- All student messages pass through content moderation before delivery.
- Recording requires a consent banner before starting.
- Under-13 accounts require verified parental consent before any Stream connection.

Start by reading all 11 files listed in Step 1. Then install dependencies (Step 2). Then begin EDU-T01.
