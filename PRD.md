# PRD — Video Call Chat App (Stream-Powered)

## Overview

A real-time communication platform where users can send direct and group messages, make audio/video calls, add participants to live calls, and manage contacts — all powered by [Stream Chat React SDK](https://getstream.io/chat/docs/react.md) and [Stream Video React SDK](https://getstream.io/video/docs/react.md).

---

## Goals

- Simple, fast, production-quality communication app
- Messaging (DM + groups) via Stream Chat
- Audio/video calls via Stream Video
- Local authentication (no external OAuth for now)
- Clean component architecture, best practices throughout

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Chat | `stream-chat-react` + `stream-chat` |
| Video/Audio | `@stream-io/video-react-sdk` |
| Auth | Local auth — username/password stored in Convex |
| Database | Convex |
| Styling | Tailwind CSS + shadcn/ui |
| State | React Context + Stream SDK built-in state |

---

## Authentication

- **Local auth only** — no OAuth providers
- User registers with `username` + `password` (hashed with bcrypt in a Convex mutation)
- On login, server returns a **Stream User Token** generated server-side via Stream's server-side SDK
- Token is stored in memory / localStorage for the session
- Stream user is created/upserted on first login using `serverClient.upsertUser()`
- Protected routes redirect unauthenticated users to `/login`

---

## Features

### 1. Messaging

- **Direct Messages (DM):** 1-on-1 channel between two users (`channel.type = "messaging"`)
- **Group Chats:** Named groups with multiple members (`channel.type = "messaging"`, multiple members)
- **Features per channel:**
  - Text messages with emoji support
  - File and image attachments
  - Message reactions
  - Read receipts
  - Typing indicators
  - Message threads
  - Unread badge counts

### 2. Video & Audio Calls

- Initiate a call from any DM or group channel
- Call types: `default` (audio + video)
- **In-call features:**
  - Toggle camera on/off
  - Toggle microphone on/off
  - Screen sharing
  - Add participants to a live call
  - Participant grid / speaker view
  - Call duration timer
  - Leave / end call controls
- Incoming call notification UI (ringing screen)
- Call state is surfaced via `useCallStateHooks` from Stream Video SDK

### 3. Contacts / User Discovery

- Search for users by username
- Start a DM or add to a group from search results
- Online presence indicators (via Stream Chat)

### 4. Notifications

- Unread message badge in sidebar
- Incoming call overlay/modal
- Browser notifications (optional, `Notification API`)

---

## Pages & Routes

```
/login               — Login form
/register            — Register form
/                    — Redirect → /messages
/messages            — Channel list + active channel view
/messages/[channelId]— Active DM or group chat
/call/[callId]       — Full-screen active call view
```

---

## Component Architecture

```
app/
  (auth)/
    login/page.tsx
    register/page.tsx
  (app)/
    layout.tsx          ← StreamChatProvider + StreamVideoClient init
    messages/
      page.tsx          ← ChannelList sidebar + ChannelView
      [channelId]/
        page.tsx        ← Channel messages + call trigger button
    call/
      [callId]/
        page.tsx        ← Full call UI

components/
  auth/
    LoginForm.tsx
    RegisterForm.tsx
  chat/
    Sidebar.tsx         ← ChannelList, search, new group button
    ChannelView.tsx     ← Stream <Channel> + <MessageList> + <MessageInput>
    NewGroupModal.tsx
  call/
    CallButton.tsx      ← Triggers outgoing call
    CallRoom.tsx        ← SpeakerLayout, ParticipantView, controls
    CallControls.tsx    ← Mic, camera, screen share, end call
    IncomingCallModal.tsx
  ui/                   ← shadcn/ui primitives

convex/
  schema.ts             ← users table
  auth.ts               ← register, login mutations/queries
  stream.ts             ← generateStreamToken action (server-side token gen)
```

---

## Data Model (Convex)

### `users` table

```ts
{
  username: v.string(),       // unique
  passwordHash: v.string(),
  streamUserId: v.string(),   // matches Stream user ID
  displayName: v.string(),
  createdAt: v.number(),
}
```

Indexes:
- `by_username: ["username"]`

---

## Stream Setup

### Chat

```ts
// Client init (browser)
import { StreamChat } from "stream-chat";
const client = StreamChat.getInstance(STREAM_API_KEY);
await client.connectUser({ id: userId, name: displayName }, userToken);
```

### Video

```ts
// Client init (browser)
import { StreamVideoClient } from "@stream-io/video-react-sdk";
const videoClient = new StreamVideoClient({
  apiKey: STREAM_API_KEY,
  user: { id: userId, name: displayName },
  token: userToken,
});
```

### Server-side token generation (Convex action)

```ts
// convex/stream.ts
import { ServerClient } from "stream-chat";
const serverClient = new ServerClient(STREAM_API_KEY, STREAM_API_SECRET);
const token = serverClient.createToken(userId);
```

---

## Environment Variables

```env
STREAM_API_KEY=
STREAM_API_SECRET=
NEXT_PUBLIC_STREAM_API_KEY=
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

---

## Implementation Prompt

> Build a **Next.js** (App Router, TypeScript) video call and chat application using **Stream Chat React SDK** (`stream-chat-react`) for messaging and **Stream Video React SDK** (`@stream-io/video-react-sdk`) for audio/video calls. Use **Convex** as the backend database and **Tailwind CSS + shadcn/ui** for styling.
>
> **Auth:** Implement simple local auth — users register with a `username` and `password`. Store users in a Convex `users` table with a hashed password (`bcrypt`). On login, call a Convex action that generates a **Stream user token** server-side and returns it to the client. Use this token to `connectUser` on the Stream Chat client and initialize `StreamVideoClient`.
>
> **Messaging:** Use Stream Chat's `<Chat>`, `<Channel>`, `<ChannelList>`, `<MessageList>`, and `<MessageInput>` components. Support DMs (`messaging` channel type) and group chats. Include typing indicators, reactions, read receipts, and unread counts in the sidebar.
>
> **Calls:** Allow users to start a call from any channel. Use `StreamVideoClient.call('default', callId)` and `call.join({ create: true })`. Render the call UI in `/call/[callId]` using `<StreamVideo>`, `<StreamCall>`, `<SpeakerLayout>`, and `<CallControls>` from the Stream Video SDK. Support add-participant-to-call, mic/camera toggles, screen sharing, and leave/end call. Show an incoming call modal using Stream Video's `useCall` and `useCallStateHooks`.
>
> **File structure:** Follow the component architecture defined in the PRD. Keep all Stream providers initialized in the app layout. Use `internalAction` in Convex for anything that touches the Stream server-side secret. Never expose `STREAM_API_SECRET` to the client. Follow all Convex best practices (typed validators, indexes, no raw filters).
>
> Read the Stream Chat docs at `https://getstream.io/chat/docs/react.md` and Stream Video docs at `https://getstream.io/video/docs/react.md` before writing any SDK calls to ensure you use the correct, up-to-date API surface.

---

## Out of Scope (v1)

- Push notifications (mobile/web)
- OAuth / social login
- Message encryption
- Call recording
- Admin dashboard
- Background blur / video effects (requires MediaPipe or canvas pipeline — external lib dependency)
- Settings page UI
- Effects & backgrounds panel
- In-call mic volume visualizer using real audio track (Stream SDK does not expose raw audio levels via React hooks; AudioContext integration is deferred)
