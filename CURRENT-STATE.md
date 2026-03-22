# CURRENT-STATE — Base App Completion Status

This file tells an LLM starting a new session exactly what is already built so it does not re-implement existing code or assume missing code exists.

**Last updated:** March 2026  
**Base task reference:** `TASKS.md` (T01–T35)  
**EDU task reference:** `EDU-TASKS.md` (EDU-T01 through EDU-T68) — none started yet

---

## Base App Tasks (TASKS.md) — Status

| Task | Description | Status |
|------|-------------|--------|
| T01 | Bootstrap Next.js with TypeScript + App Router | ✅ Done |
| T02 | Initialize Convex and link deployment | ✅ Done |
| T03 | Install all dependencies | ✅ Done |
| T04 | Configure Tailwind + global CSS | ✅ Done |
| T05 | Initialize shadcn/ui and add components | ✅ Done |
| T06 | Create `.env.local` with Stream + Convex keys | ✅ Done |
| T07 | Write `convex/schema.ts` — `users` table | ✅ Done |
| T08 | Write `convex/auth.ts` — register, login, getMe | ✅ Done |
| T09 | Write `convex/stream.ts` — generateToken, upsertStreamUser | ✅ Done |
| T10 | Verify Convex functions deploy without errors | ✅ Done |
| T11 | Create `lib/session.ts` | ✅ Done |
| T12 | Create `contexts/AuthContext.tsx` | ✅ Done |
| T13 | Create `app/(auth)/login/page.tsx` + `LoginForm` | ✅ Done |
| T14 | Create `app/(auth)/register/page.tsx` + `RegisterForm` | ✅ Done |
| T15 | Add redirect logic (unauthenticated → /login) | ✅ Done |
| T16 | Create `app/api/stream-token/route.ts` | ✅ Done |
| T17 | Create `contexts/StreamContext.tsx` | ✅ Done |
| T18 | Wrap `app/(app)/layout.tsx` with auth + stream providers | ✅ Done |
| T19 | Create `components/chat/Sidebar.tsx` | ✅ Done |
| T20 | Create `components/chat/ChannelView.tsx` | ✅ Done |
| T21 | Create `components/chat/NewGroupModal.tsx` | ✅ Done |
| T22 | Create `app/(app)/messages/page.tsx` | ✅ Done |
| T23 | Create `app/(app)/messages/[channelId]/page.tsx` | ✅ Done |
| T24 | Create `components/call/CallButton.tsx` | ✅ Done |
| T25 | Create `components/call/CallRoom.tsx` | ✅ Done |
| T26 | Create `components/call/CallControls.tsx` (as `FloatingControls.tsx`) | ✅ Done |
| T27 | Create `components/call/IncomingCallModal.tsx` | ✅ Done |
| T28 | Create `app/(app)/call/[callId]/page.tsx` | ✅ Done |
| T29 | Online presence indicator | ✅ Done |
| T30 | User search across app | ✅ Done |
| T31 | Loading and error states | ✅ Done |
| T32 | `rejectCallWhenBusy: true` on StreamVideoClient | ✅ Done |
| T33 | `disconnectUser` on logout for both clients | ✅ Done |
| T34 | All Convex functions have arg + return validators | ✅ Done |
| T35 | Remove debug console.log, proper error handling | ✅ Done |

**All 35 base tasks are complete. The base app is fully functional.**

---

## What Is Already Built (file inventory)

### Convex backend (`convex/`)

| File | What it contains |
|------|-----------------|
| `schema.ts` | `users` table: `username`, `passwordHash`, `streamUserId`, `displayName`, `createdAt`. Index: `by_username`. |
| `auth.ts` | `register` action, `login` action, `refreshToken` action, `getMe` query |
| `stream.ts` | `generateToken` internalAction, `upsertStreamUser` internalAction |
| `users.ts` | `createUser` internalMutation, `getUserByUsername` internalQuery |

**Not yet created:** `organizations.ts`, `classes.ts`, `sessions.ts`, `assignments.ts`, `submissions.ts`, `grades.ts`, `polls.ts`, `schedule.ts`, `moderation.ts`, `admin.ts`, `parentLinks.ts`, `notifications.ts`, `auditLog.ts`, `crons.ts`, `http.ts`

### Next.js app (`src/`)

**Contexts:**
- `AuthContext.tsx` — session management (userId, displayName, streamUserId, token); login/logout
- `StreamContext.tsx` — Stream Chat + Video client init; tokenProvider; disconnect on logout
- `UIActionsContext.tsx` — global UI action bus (open modals etc.)
- `SettingsContext.tsx` — app settings (notifications, sound, etc.) via localStorage

**Not yet created:** `OrgContext.tsx`, `GradeSkinContext.tsx`

**Auth pages:**
- `(auth)/login/page.tsx` — Login form
- `(auth)/register/page.tsx` — Register form with username + password + displayName

**Not yet created:** `(auth)/consent/page.tsx` (COPPA consent wizard)

**App pages:**
- `(app)/layout.tsx` — auth guard + providers
- `(app)/messages/page.tsx` — channel list + empty state
- `(app)/messages/[channelId]/page.tsx` — active channel view
- `(app)/call/[callId]/page.tsx` — full-screen call room
- `(app)/settings/page.tsx` — settings page (notifications, audio, display)
- `(app)/profile/page.tsx` — user profile view
- `(app)/keyboard-shortcuts/page.tsx` — keyboard shortcut reference

**Not yet created:** `(app)/dashboard/page.tsx`, `(app)/class/[classId]/page.tsx`, `(app)/class/[classId]/session/[sessionId]/page.tsx`, `(app)/class/[classId]/assignments/...`, `(app)/parent/page.tsx`, `(app)/admin/...`, `(app)/staff/page.tsx`, `(app)/schedule/page.tsx`

**Chat components (`components/chat/`):**
- `Sidebar.tsx` — channel list sidebar with Stream `<ChannelList>`, new DM/group buttons, unread badges
- `ChannelView.tsx` — Stream `<Channel>` with `<MessageList>`, `<MessageInput>`, thread panel, call button in header
- `ChannelItem.tsx` — single channel list item with unread count
- `NewGroupModal.tsx` — user search + multi-select + create group channel
- `UserSearchModal.tsx` — search users by username for DM creation
- `CustomMessageInput.tsx` — custom message input with emoji, attachments
- `MessageBubble.tsx` — custom message bubble component
- `MessageActions.tsx` — message hover actions (react, reply, delete)
- `DateSeparator.tsx` — date header between message groups
- `ScrollToBottom.tsx` — scroll-to-bottom button when not at bottom
- `SearchBar.tsx` — global search bar
- `SectionHeader.tsx` — sidebar section headers (DMs, Groups)
- `ThreadPanel.tsx` — message thread side panel
- `TypingIndicator.tsx` — typing indicator component
- `UserMenu.tsx` — user avatar + presence + settings dropdown

**Call components (`components/call/`):**
- `CallRoom.tsx` — main call room: `StreamCall` wrapper, layout switching, auto-hide header, leave-handler
- `FloatingControls.tsx` — floating control bar: mic, camera, screen share, layout, participants, chat, leave
- `CallButton.tsx` — button to initiate a call from a channel; generates callId, joins, sends system message
- `CallControls.tsx` — individual control buttons (used inside FloatingControls)
- `IncomingCallModal.tsx` — incoming ring notification with accept/decline
- `ParticipantList.tsx` — slide-in panel listing all call participants with status
- `SelfView.tsx` — picture-in-picture self-view overlay (draggable)
- `CallEnded.tsx` — post-call screen: duration, participant count, rejoin button
- `CallLobby.tsx` — pre-join lobby with device preview (for `default` call type — NOT the `classroom` lobby with teacher admit)
- `NetworkIndicator.tsx` — network quality dot indicator + banner
- `LayoutSwitcher.tsx` — layout selection UI (spotlight, grid, sidebar)
- `CallMessage.tsx` — system message in chat for call events
- `VolumeVisualizer.tsx` — audio level visualizer bars

**Not yet created:** `ClassCallRoom.tsx`, `Lobby.tsx` (classroom lobby), `LobbyAdmitter.tsx`, `MuteAllButton.tsx`, `RaisedHandsPanel.tsx`, `QAPanel.tsx`, `PollPanel.tsx`, `BreakoutManager.tsx`, `RecordingBanner.tsx`, `SpotlightController.tsx`

**Auth components (`components/auth/`):**
- `LoginForm.tsx` — username + password form
- `RegisterForm.tsx` — username + displayName + password form (no role/grade yet)
- `PasswordInput.tsx` — password input with show/hide toggle
- `FormField.tsx` — labeled form field wrapper
- `AuthBrandPanel.tsx` — left-side branding panel on auth pages
- `SocialProof.tsx` — social proof block on auth pages

**Not yet created:** `ConsentWizard.tsx`

**Other components:**
- `AppShell.tsx` — app-level layout shell (sidebar + main area split)
- `CommandPalette.tsx` — `⌘K` command palette
- `ConvexClientProvider.tsx` — Convex client provider wrapper
- `NotificationManager.tsx` — browser notification permission + incoming call detection

**Not yet created:** any `class/`, `assignments/`, `gradebook/`, `attendance/`, `parent/`, `admin/`, `schedule/` component directories

**Lib (`src/lib/`):**
- `session.ts` — `getSession`, `setSession`, `clearSession` with localStorage
- `settings.ts` — `AppSettings` type + defaults
- `utils.ts` — `cn()` and other utility functions

**Not yet created:** `gradeTheme.ts`, `moderation.ts`, `ical.ts`

---

## Schema — Current State

```ts
// convex/schema.ts (current — as of base app)
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    streamUserId: v.string(),
    displayName: v.string(),
    createdAt: v.number(),
  }).index("by_username", ["username"]),
});
```

**EDU-T01 must extend this schema** — do not re-create the users table, only add fields to it.

---

## Known Extension Points

When starting EDU tasks, these existing files will need modification (do not recreate them):

| File | What EDU adds |
|------|--------------|
| `convex/schema.ts` | New fields on `users` + 12 new tables (EDU-T01, EDU-T25, EDU-T29, EDU-T35, EDU-T40, EDU-T46, EDU-T50, EDU-T60) |
| `convex/auth.ts` | `register` must accept `role`, `gradeLevel`, `dateOfBirth`; handle under-13 COPPA flag |
| `convex/stream.ts` | Add `createClassChannel`, `addMemberToChannel`, `removeMemberFromChannel` actions |
| `src/app/(auth)/register/page.tsx` | Add role selector, grade selector, DOB field |
| `src/app/(app)/layout.tsx` | Mount `OrgContext` and `GradeSkinContext` |
| `src/lib/session.ts` | Extend session type with `organizationId`, `role`, `gradeLevel` |
| `src/contexts/AuthContext.tsx` | Expose `role` and `gradeLevel` from session |
| `src/app/(app)/settings/page.tsx` | Add data export + account deletion section |

---

## Installed Packages (base app)

```json
{
  "stream-chat": "✅",
  "stream-chat-react": "✅",
  "@stream-io/video-react-sdk": "✅",
  "@stream-io/node-sdk": "✅",
  "convex": "✅",
  "bcryptjs": "✅",
  "clsx": "✅",
  "tailwind-merge": "✅",
  "lucide-react": "✅",
  "sonner": "✅",
  "next": "✅"
}
```

**Not yet installed** (see `EDU-SETUP.md` §1): `resend`, `date-fns`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `recharts`, `jose`

---

## shadcn/ui Components Available

Already installed: `button`, `input`, `dialog`, `avatar`, `badge`, `separator`, `scroll-area`, `checkbox`, `switch`, `slider`, `skeleton`, `popover`, `tooltip`, `command`, `dropdown-menu`, `context-menu`, `select`, `sonner`, `textarea`

**Not yet installed** (see `EDU-SETUP.md` §1): `calendar`, `table`, `tabs`, `progress`, `radio-group`, `label`, `card`, `alert`, `alert-dialog`
