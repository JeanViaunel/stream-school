Here's the prompt to paste directly into any agent (Cursor, Claude, etc.):

---

**System / first message:**

```
Read these files in order before writing a single line of code:
1. stream-school/AGENTS.md       — rules and constraints (non-negotiable)
2. stream-school/PRD.md          — product scope, routes, components, data model
3. stream-school/SETUP.md        — scaffold commands and dependencies
4. stream-school/TASKS.md        — ordered build tasks (work through them in sequence)
5. stream-school/STREAM_AUTH.md  — Stream Video client auth integration patterns
6. stream-school/getstreamextra.md — full Stream Video docs index and "which page?" map

Then follow the LLM prompt at the top of getstreamextra.md as your operating instructions.

Start at TASKS.md Phase 1 — T01. Complete each task, confirm it works, then move to the next.
Do not skip tasks or work out of order.
Do not write code that isn't covered by a task without stating it explicitly.
```

---

**Then, per phase, send this as a follow-up:**

```
Phase 1 complete. Move to Phase 2 — Convex Backend (T07–T10).
Before writing convex/stream.ts, fetch and read:
https://getstream.io/video/docs/react/guides/client-auth.md
```

```
Phase 2 complete. Move to Phase 3 — Authentication UI (T11–T15).
```

```
Phase 4 — Stream Client init (T16–T18).
Before writing StreamContext, fetch and read:
https://getstream.io/video/docs/react/advanced/chat-with-video.md
```

```
Phase 5 — Messaging UI (T19–T23).
```

```
Phase 6 — Video Call UI (T24–T28).
Before writing CallRoom and IncomingCallModal, fetch and read:
https://getstream.io/video/docs/react/ui-components/core/call-layout.md
https://getstream.io/video/docs/react/ui-cookbook/ringing-call.md
https://getstream.io/video/docs/react/ui-components/call/ringing-call.md
```

```
Phase 7 — Polish (T29–T35). Then verify all acceptance criteria in TASKS.md.
```

---

**Key rules to enforce if the agent goes off-track:**

- "Stop. Re-read `AGENTS.md` Security Rules before continuing."
- "You are exposing `STREAM_API_SECRET` — move token generation to a Convex `internalAction`."
- "Do not use a static token. Use `tokenProvider` as specified in `STREAM_AUTH.md`."
- "Check the live doc at `[URL from getstreamextra.md]` — that API may have changed."
