# Build Tasks — Video Call Chat App

Complete tasks in order. Each task is atomic and testable before moving to the next.

---

## Phase 1 — Project Scaffold

- [ ] **T01** — Bootstrap Next.js app with TypeScript and App Router (`npx create-next-app@latest`)
- [ ] **T02** — Initialize Convex (`npx convex dev`) and link deployment
- [ ] **T03** — Install all dependencies (see `SETUP.md` for full list)
- [ ] **T04** — Configure `tailwind.config.ts` and global CSS
- [ ] **T05** — Initialize shadcn/ui (`npx shadcn@latest init`) and add Button, Input, Dialog, Avatar components
- [ ] **T06** — Create `.env.local` from `.env.example` and fill in Stream + Convex keys

---

## Phase 2 — Convex Backend

- [ ] **T07** — Write `convex/schema.ts` — `users` table with `by_username` index
- [ ] **T08** — Write `convex/auth.ts`:
  - `register` mutation: validate uniqueness, hash password with bcrypt, insert user, call `internal.stream.upsertStreamUser`
  - `login` mutation: fetch by username, verify password hash, call `internal.stream.generateToken`, return `{ userId, displayName, streamUserId, token }`
  - `getMe` query: return current user by id
- [ ] **T09** — Write `convex/stream.ts` (internalAction):
  - `generateToken`: use `@stream-io/node-sdk` `StreamClient.generateUserToken()` — return short-lived token (1h)
  - `upsertStreamUser`: call `serverClient.upsertUsers()` to create/update Stream user on registration
- [ ] **T10** — Verify Convex functions deploy without errors (`npx convex dev` output)

---

## Phase 3 — Authentication UI

- [ ] **T11** — Create `lib/session.ts` — thin wrapper around `localStorage` for `{ userId, displayName, streamUserId, token }`; exports `getSession`, `setSession`, `clearSession`
- [ ] **T12** — Create `contexts/AuthContext.tsx` — provides `session`, `login`, `logout`; reads from `localStorage` on mount
- [ ] **T13** — Create `app/(auth)/login/page.tsx` with `LoginForm` component
- [ ] **T14** — Create `app/(auth)/register/page.tsx` with `RegisterForm` component
- [ ] **T15** — Add redirect logic: unauthenticated → `/login`, authenticated on `/login` → `/messages`

---

## Phase 4 — Stream Client Initialization

- [ ] **T16** — Create `app/api/stream-token/route.ts` — Next.js Route Handler that calls Convex to refresh a Stream token (used by `tokenProvider`)
- [ ] **T17** — Create `contexts/StreamContext.tsx`:
  - Initialises `StreamChat` client and calls `connectUser` on mount
  - Initialises `StreamVideoClient` with `tokenProvider` pointing to `/api/stream-token`
  - Wraps children in `<Chat client={chatClient}>` and `<StreamVideo client={videoClient}>`
  - Calls `chatClient.disconnectUser()` and `videoClient.disconnectUser()` on cleanup
  - Doc ref: `guides/client-auth.md` + `STREAM_AUTH.md`; for Chat+Video combined init: `advanced/chat-with-video.md`
- [ ] **T18** — Wrap `app/(app)/layout.tsx` with `AuthContext` + `StreamContext`; redirect unauthenticated users

---

## Phase 5 — Messaging UI

- [ ] **T19** — Create `components/chat/Sidebar.tsx`:
  - `<ChannelList>` filtered to channels where current user is a member
  - "New DM" button that opens user search
  - "New Group" button that opens `NewGroupModal`
  - Unread count badges
- [ ] **T20** — Create `components/chat/ChannelView.tsx`:
  - `<Channel>` → `<Window>` → `<MessageList>` + `<MessageInput>`
  - `<Thread>` for threaded replies
  - Call button in channel header (`CallButton`)
- [ ] **T21** — Create `components/chat/NewGroupModal.tsx`:
  - Search users by username (Stream `client.queryUsers`)
  - Select multiple members
  - Create channel with `client.channel('messaging', { members, name })`
- [ ] **T22** — Create `app/(app)/messages/page.tsx` — splits into Sidebar + empty state
- [ ] **T23** — Create `app/(app)/messages/[channelId]/page.tsx` — loads channel, renders `ChannelView`

---

## Phase 6 — Video Call UI

- [ ] **T24** — Create `components/call/CallButton.tsx`:
  - Generates a `callId` (e.g. `${channelId}-${Date.now()}`)
  - Calls `videoClient.call('default', callId).join({ create: true })`
  - Sends a system message to the chat channel with the call link
  - Navigates to `/call/[callId]`
  - Doc ref: `guides/joining-and-creating-calls.md`, `advanced/chat-with-video.md`
- [ ] **T25** — Create `components/call/CallRoom.tsx`:
  - `<StreamCall call={call}>` wrapping the call UI
  - `<SpeakerLayout>` for participant grid
  - `<CallControls>` for mic, camera, screen share, end call
  - Call duration timer using `useCallStateHooks`
  - Doc ref: `ui-components/core/call-layout.md`, `ui-cookbook/video-layout.md`, `guides/call-and-participant-state.md`, `guides/calling-state-and-lifecycle.md`, `advanced/react-compiler.md`
- [ ] **T26** — Create `components/call/CallControls.tsx` (custom if needed):
  - Mic toggle, camera toggle, screen share, leave call, end call for host
  - Add participant button: opens user search → calls `call.addMembers([userId])`
  - Doc ref: `ui-components/call/call-controls.md`, `ui-cookbook/replacing-call-controls.md`, `guides/camera-and-microphone.md`, `guides/screensharing.md`
- [ ] **T27** — Create `components/call/IncomingCallModal.tsx`:
  - Listens to `useStreamVideoClient` for incoming ring events
  - Shows caller name + accept/decline buttons
  - Accept → navigate to `/call/[callId]`; Decline → `call.leave()`
  - Doc ref: `ui-cookbook/ringing-call.md`, `ui-components/call/ringing-call.md`, `ui-cookbook/reject-call-when-busy.md`, `advanced/chat-with-video.md`
- [ ] **T28** — Create `app/(app)/call/[callId]/page.tsx`:
  - Fetch call via `videoClient.call('default', callId)`
  - Join if not already joined
  - Render `<CallRoom>`

---

## Phase 7 — Polish & Integration

- [ ] **T29** — Add online presence indicator to user avatars (Stream Chat `user.online`)
- [ ] **T30** — Add user search across the app (Stream `client.queryUsers({ name: { $autocomplete: query } })`)
- [ ] **T31** — Handle loading and error states in all async flows
- [ ] **T32** — Add `rejectCallWhenBusy: true` to `StreamVideoClient` options
- [ ] **T33** — Ensure `disconnectUser` is always called on logout for both clients
- [ ] **T34** — Verify all Convex functions have arg and return validators
- [ ] **T35** — Review all `console.log` and remove or replace with proper error handling

---

## Acceptance Criteria

- [ ] User can register and log in with username + password
- [ ] User can see and send messages in DMs and group chats
- [ ] User can start a video/audio call from any channel
- [ ] User can accept or decline an incoming call
- [ ] User can add participants to an ongoing call
- [ ] User can toggle mic, camera, and screen share in a call
- [ ] Stream token is never exposed client-side in plaintext; generated via Convex internalAction
- [ ] All routes are protected; unauthenticated users are redirected to `/login`
