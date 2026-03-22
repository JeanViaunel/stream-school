# Stream Video docs — context for `stream-school`

This file supplements the **Video Call Chat App** described in `PRD.md`. It gives **project context**, a **curated index** of official Stream Video React documentation URLs, and a **prompt** you can give to an LLM when implementing or debugging Stream Video in this repo.

**Related files in this directory**

| File | Role |
|------|------|
| `PRD.md` | Product scope, routes, components, data model, Stream setup snippets |
| `AGENTS.md` | Non-negotiable rules (Next.js App Router, Convex, Stream security) |
| `STREAM_AUTH.md` | Cached patterns for `StreamVideoClient`, `tokenProvider`, server tokens |
| `SETUP.md` | Dependencies and env vars |
| `TASKS.md` | Ordered build tasks |
| `getstream.md` | Short links to Stream **Chat** + top-level **Video** docs |

**Stack (video slice)** — Next.js (App Router), TypeScript, `@stream-io/video-react-sdk`, Convex for users/tokens (`STREAM_API_SECRET` only server-side), Tailwind + shadcn/ui.

**Integration constraints (must respect)**

- One `StreamVideoClient` at app root; use **`tokenProvider`**, not a long-lived static token.
- Disconnect with `videoClient.disconnectUser()` on logout (`useEffect` cleanup).
- Prefer `rejectCallWhenBusy: true` on the client (see UI cookbook link below).
- Never put `STREAM_API_SECRET` in client code or `NEXT_PUBLIC_*` vars; tokens from Convex `internalAction` / verified API routes per `AGENTS.md`.

When choosing a doc page, prefer **guides** for behavior and **ui-cookbook** for UI patterns; use **call_types** and **advanced** for configuration and production concerns.

The long index below is the core `/video/docs/react/` set. **Additional high-value pages** (hub, tutorials, Chat+Video, component API reference, extra cookbooks) are listed in [Additional important links](#additional-important-links) so you can prioritize them for this repo.

---

## Prompt for LLMs (copy into system or user message)

You are helping implement or debug **Stream Video** in the **stream-school** repo: a Next.js App Router app with **Stream Chat** + **Stream Video**, **Convex** backend, and **local username/password** auth.

**Before writing code**

1. Read `AGENTS.md` and `STREAM_AUTH.md` in the repo root (`stream-school/`).
2. For API shape and hooks, rely on **current** Stream docs (URLs in this file), not training-data guesses — Stream APIs change.
3. Match existing patterns: `tokenProvider` fetching a fresh token, single video client at root, cleanup on logout.
4. This app combines **Chat + Video**: read `advanced/chat-with-video` (and the PRD) when wiring channels to calls, ring flows, or `useCalls()`.

**Security**

- Never suggest exposing `STREAM_API_SECRET` or generating user tokens in the browser.
- Token generation belongs in Convex (e.g. `internalAction` with `@stream-io/node-sdk`) or other server-only code.

**Implementation expectations**

- Use `@stream-io/video-react-sdk` React components and hooks as documented (e.g. `StreamVideo`, `StreamCall`, call state hooks).
- Align with PRD routes: e.g. `/call/[callId]` for full-screen call UI; calls tied to chat channels as specified in `PRD.md`.
- Follow Convex rules: validators on functions, indexes in `schema.ts`, no `ctx.db` inside actions.

**When answering**

- Cite the relevant doc section conceptually; if unsure, say which doc URL should be opened to verify.
- Prefer minimal, focused changes; do not refactor unrelated files.

---

## Stream Video React — documentation index (official URLs)

### Basics & changelog

https://getstream.io/video/docs/react/basics/quickstart.md  
https://getstream.io/video/docs/react/basics/supported-platforms.md  
https://getstream.io/video/docs/react/basics/prebuilt.md  
https://getstream.io/video/docs/react/roadmap_and_changelog.md  

### Auth, calls, state, media

https://getstream.io/video/docs/react/guides/client-auth.md  
https://getstream.io/video/docs/react/guides/joining-and-creating-calls.md  
https://getstream.io/video/docs/react/guides/call-and-participant-state.md  
https://getstream.io/video/docs/react/guides/calling-state-and-lifecycle.md  
https://getstream.io/video/docs/react/guides/camera-and-microphone.md  
https://getstream.io/video/docs/react/guides/noise-cancellation.md  
https://getstream.io/video/docs/react/guides/screensharing.md  

### Call configuration, queries, permissions, realtime features

https://getstream.io/video/docs/react/guides/configuring-call-types.md  
https://getstream.io/video/docs/react/guides/querying-calls.md  
https://getstream.io/video/docs/react/guides/querying-call-members.md  
https://getstream.io/video/docs/react/guides/permissions-and-moderation.md  
https://getstream.io/video/docs/react/guides/sorting-api.md  
https://getstream.io/video/docs/react/guides/reactions.md  
https://getstream.io/video/docs/react/guides/events.md  
https://getstream.io/video/docs/react/guides/custom-events.md  
https://getstream.io/video/docs/react/guides/livestreaming.md  

### Call types, quality, AI

https://getstream.io/video/docs/react/call_types/builtin.md  
https://getstream.io/video/docs/react/call_types/manage.md  
https://getstream.io/video/docs/react/call_types/geofencing.md  
https://getstream.io/video/docs/react/call_types/permissions.md  
https://getstream.io/video/docs/react/call_types/settings.md  
https://getstream.io/video/docs/react/quality/introduction.md  
https://getstream.io/video/docs/react/ai-integration/openai-realtime.md  

### Moderation, recording, transcribing, compliance, webhooks

https://getstream.io/video/docs/react/moderation/overview.md  
https://getstream.io/video/docs/react/moderation/audio-video.md  
https://getstream.io/video/docs/react/recording/calls.md  
https://getstream.io/video/docs/react/recording/frame-recording.md  
https://getstream.io/video/docs/react/recording/storage.md  
https://getstream.io/video/docs/react/transcribing/calls.md  
https://getstream.io/video/docs/react/transcribing/storage.md  
https://getstream.io/video/docs/react/gdpr/overview.md  
https://getstream.io/video/docs/react/webhooks/overview.md  

### UI components & cookbooks

https://getstream.io/video/docs/react/ui-components/overview.md  
https://getstream.io/video/docs/react/ui-cookbook/call-quality-rating.md  
https://getstream.io/video/docs/react/ui-cookbook/participant-view-customizations.md  
https://getstream.io/video/docs/react/ui-cookbook/fullscreen-mode.md  
https://getstream.io/video/docs/react/ui-cookbook/participant-notification-sound.md  
https://getstream.io/video/docs/react/ui-cookbook/video-placeholder.md  
https://getstream.io/video/docs/react/ui-cookbook/audio-volume-indicator.md  
https://getstream.io/video/docs/react/ui-cookbook/ringing-call.md  
https://getstream.io/video/docs/react/ui-cookbook/reject-call-when-busy.md  

### Advanced

https://getstream.io/video/docs/react/advanced/integration-best-practices.md  
https://getstream.io/video/docs/react/advanced/broadcasting.md  

---

## Additional important links

These are official GetStream pages that are not duplicated in the index above but are especially useful for **stream-school** (chat + video, layouts, component APIs, tutorials).

### Documentation hub

https://getstream.io/video/docs/react.md  

### Step-by-step tutorials (`/video/sdk/` — walkthroughs, not the same tree as `/video/docs/`)

https://getstream.io/video/sdk/react/tutorial/video-calling/  
https://getstream.io/video/sdk/react/tutorial/audio-room/  
https://getstream.io/video/sdk/react/tutorial/livestreaming/  

### Chat + Video (ring calls, `useCalls`, shared tokens)

https://getstream.io/video/docs/react/advanced/chat-with-video.md  

### Advanced (extra)

https://getstream.io/video/docs/react/advanced/stats.md  
https://getstream.io/video/docs/react/advanced/react-compiler.md  

### UI component reference (props and built-in building blocks)

https://getstream.io/video/docs/react/ui-components/core/participant-view.md  
https://getstream.io/video/docs/react/ui-components/core/call-layout.md  
https://getstream.io/video/docs/react/ui-components/participants/video-preview.md  
https://getstream.io/video/docs/react/ui-components/video-theme.md  
https://getstream.io/video/docs/react/ui-components/call/call-controls.md  
https://getstream.io/video/docs/react/ui-components/call/ringing-call.md  
https://getstream.io/video/docs/react/ui-components/utility/call-statistics.md  

### UI cookbooks (extra)

https://getstream.io/video/docs/react/ui-cookbook/video-layout.md  
https://getstream.io/video/docs/react/ui-cookbook/picture-in-picture.md  
https://getstream.io/video/docs/react/ui-cookbook/document-pip.md  
https://getstream.io/video/docs/react/ui-cookbook/manual-video-quality-selection.md  
https://getstream.io/video/docs/react/ui-cookbook/runtime-layout-switching.md  
https://getstream.io/video/docs/react/ui-cookbook/network-quality-indicator.md  
https://getstream.io/video/docs/react/ui-cookbook/connection-unstable.md  
https://getstream.io/video/docs/react/ui-cookbook/participant-label.md  
https://getstream.io/video/docs/react/ui-cookbook/lobby-preview.md  
https://getstream.io/video/docs/react/ui-cookbook/replacing-call-controls.md  

Note: **`ui-cookbook/ringing-call`** is the customization guide; **`ui-components/call/ringing-call`** is the `RingingCall` component reference. Use both when building incoming/outgoing call UI.

---

## Quick “which page?” map for this PRD

| Topic | Start here |
|--------|----------------|
| Tokens & `StreamVideoClient` | `guides/client-auth.md` + repo `STREAM_AUTH.md` |
| Chat app + video + ring calls | `advanced/chat-with-video.md` |
| Join/create calls, call IDs | `guides/joining-and-creating-calls.md` |
| Hooks / participant state | `guides/call-and-participant-state.md`, `guides/calling-state-and-lifecycle.md` |
| Mic, camera, screen share | `guides/camera-and-microphone.md`, `guides/screensharing.md` |
| Ringing / busy | `ui-cookbook/ringing-call.md`, `ui-cookbook/reject-call-when-busy.md`, `ui-components/call/ringing-call.md` |
| Layouts (`SpeakerLayout`, grid, custom) | `ui-components/core/call-layout.md`, `ui-cookbook/video-layout.md` |
| `ParticipantView` API | `ui-components/core/participant-view.md` |
| React Compiler + `useCallStateHooks` | `advanced/react-compiler.md` |
| `default` call type & settings | `call_types/builtin.md`, `guides/configuring-call-types.md` |
| Production hardening | `advanced/integration-best-practices.md` |

For **Stream Chat** (channels, messages, DMs), use `getstream.md` and the Chat docs linked there.

---

## EDU "which page?" map — StreamSchool K–12 additions

Use this table when implementing features described in `SPECS-EDU.md` and `EDU-TASKS.md`. These topics are in the index above but were not in the original "which page?" map.

| EDU Feature | Start here |
|-------------|------------|
| **Lobby / waiting room** (student waits, teacher admits) | https://getstream.io/video/docs/react/ui-cookbook/lobby-preview.md |
| **Mute a single participant** | https://getstream.io/video/docs/react/guides/permissions-and-moderation.md + https://getstream.io/video/docs/react/moderation/audio-video.md |
| **Remove a participant from call** | https://getstream.io/video/docs/react/guides/permissions-and-moderation.md |
| **Grant / revoke per-user call permissions** (screenshare, unmute-self) | https://getstream.io/video/docs/react/guides/permissions-and-moderation.md + https://getstream.io/video/docs/react/call_types/permissions.md |
| **Custom `classroom` call type** (create in dashboard, configure server-side) | https://getstream.io/video/docs/react/call_types/manage.md + https://getstream.io/video/docs/react/call_types/settings.md + https://getstream.io/video/docs/react/call_types/permissions.md |
| **Recording a call** (`call.startRecording`, webhook for storage) | https://getstream.io/video/docs/react/recording/calls.md + https://getstream.io/video/docs/react/recording/storage.md |
| **Transcriptions / live captions** (`call.startTranscription`) | https://getstream.io/video/docs/react/transcribing/calls.md + https://getstream.io/video/docs/react/transcribing/storage.md |
| **Custom events in-call** (raised hands, poll launched, breakout assigned) | https://getstream.io/video/docs/react/guides/custom-events.md |
| **Stream Video webhooks** (join/leave for attendance, recording ready) | https://getstream.io/video/docs/react/webhooks/overview.md |
| **Stream Chat message moderation / flagging** | https://getstream.io/chat/docs/react/moderation.md |
| **Stream Chat webhooks** (`message.new` for pre-delivery moderation) | https://getstream.io/chat/docs/react/webhooks_overview.md |
| **Stream Chat custom channel type** (`classroom` type configuration) | https://getstream.io/chat/docs/react/channel_features.md |
| **Querying call members** (roster, attendance list) | https://getstream.io/video/docs/react/guides/querying-call-members.md |
| **Reactions in-call** (emoji reactions from students) | https://getstream.io/video/docs/react/guides/reactions.md |
| **GDPR / data deletion via Stream** (delete user messages on account close) | https://getstream.io/video/docs/react/gdpr/overview.md |
| **Participant sorting** (teacher pinned at top of grid) | https://getstream.io/video/docs/react/guides/sorting-api.md |
| **Connection quality / network indicator** (extend for class view) | https://getstream.io/video/docs/react/ui-cookbook/network-quality-indicator.md + https://getstream.io/video/docs/react/ui-cookbook/connection-unstable.md |
