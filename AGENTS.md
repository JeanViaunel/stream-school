<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Agent Rules — Video Call Chat App

## Before Writing Any Code

1. Read `PRD.md` for product scope, component architecture, and data model.
2. Read `SETUP.md` for bootstrap steps and dependency list.
3. Read `TASKS.md` and work tasks **in order**. Mark each task complete before starting the next.
4. Read `STREAM_AUTH.md` for the exact Stream Video client auth integration pattern.
5. Read `getstreamextra.md` — it contains the full Stream Video docs index, a curated "which page?" map for this PRD, and a copy-paste LLM prompt. Use it to identify **which doc URL to fetch** before writing any Stream Video code.
6. Read the Stream docs before making any SDK calls:
   - Chat: https://getstream.io/chat/docs/react.md
   - Video auth: https://getstream.io/video/docs/react/guides/client-auth.md
   - Chat + Video (ring calls, `useCalls`): https://getstream.io/video/docs/react/advanced/chat-with-video.md
   - Full doc index: see `getstreamextra.md`

---

## Security Rules (non-negotiable)

- `STREAM_API_SECRET` must **never** appear in any file prefixed `NEXT_PUBLIC_`, any client component, or any file that runs in the browser.
- All Stream token generation must happen inside a Convex `internalAction` using `@stream-io/node-sdk`'s `StreamClient`.
- The `/api/stream-token` Next.js Route Handler must verify the user is authenticated before returning a token.
- Passwords are always hashed with `bcryptjs` before storing. Never store plaintext passwords.

---

## Stream Integration Rules

- `StreamVideoClient` is created **once** at app root, not per-page.
- Always pass `tokenProvider` (not a static `token`) to `StreamVideoClient` so tokens auto-refresh.
- Always call `client.disconnectUser()` and `videoClient.disconnectUser()` in `useEffect` cleanup on logout.
- Enable `rejectCallWhenBusy: true` in `StreamVideoClient` options.
- Import Stream Chat CSS: `stream-chat-react/dist/css/v2/index.css`
- Import Stream Video CSS: `@stream-io/video-react-sdk/dist/css/styles.css`
- Do NOT use deprecated Stream APIs — check the live docs URL above before using any method.
- For Chat + Video ring calls and `useCalls()`: read `advanced/chat-with-video.md` (linked in `getstreamextra.md`) before writing any ring/call-from-channel logic.
- For layouts (`SpeakerLayout`, grid, custom): read `ui-components/core/call-layout.md` and `ui-cookbook/video-layout.md`.
- For ringing UI: read both `ui-cookbook/ringing-call.md` (customization) and `ui-components/call/ringing-call.md` (component API).
- For `useCallStateHooks` with React Compiler: read `advanced/react-compiler.md`.
- Use `guides/` pages for behavior, `ui-cookbook/` for UI patterns, `call_types/` and `advanced/` for configuration — as noted in `getstreamextra.md`.

---

## Convex Rules

- Always use the new function syntax with explicit `args` and `returns` validators.
- Use `internalAction` / `internalMutation` / `internalQuery` for anything private (token generation, password ops).
- Use `query`, `mutation`, `action` only for public-facing endpoints.
- Never use `ctx.db` inside an `action`. Use `internalQuery` / `internalMutation` via `ctx.runQuery` / `ctx.runMutation`.
- Always define indexes in `schema.ts` and use `withIndex` in queries — never use `.filter()`.
- `STREAM_API_KEY` and `STREAM_API_SECRET` in Convex are set via `npx convex env set`, not `.env.local`.

---

## Next.js Rules

- Use App Router exclusively — no Pages Router.
- Route groups: `(auth)` for login/register (no layout), `(app)` for authenticated pages (with StreamContext layout).
- Protected routes: add redirect logic in `(app)/layout.tsx` — if no session, `redirect('/login')`.
- Use Next.js Route Handlers (`app/api/*/route.ts`) for the token refresh endpoint only.
- Never use `"use client"` in layout files that wrap Stream providers — keep providers in dedicated client components.

---

## TypeScript Rules

- Strict mode is on. No `any`. No `@ts-ignore`.
- Use `Id<'tableName'>` from `convex/_generated/dataModel` for all Convex document IDs.
- All session data types must be explicitly typed — no implicit `any` from `JSON.parse`.

---

## Component Rules

- Keep components small and single-purpose.
- No business logic in page files — pages only compose components.
- No inline styles — use Tailwind utility classes only.
- Use shadcn/ui primitives for all UI elements before writing custom ones.

---

## File Reference Map

| File | Purpose |
|---|---|
| `PRD.md` | Product scope, features, architecture |
| `SETUP.md` | Bootstrap commands, dependencies, env vars |
| `TASKS.md` | Ordered atomic build tasks |
| `STREAM_AUTH.md` | Stream Video client auth patterns (cached from docs) |
| `getstreamextra.md` | Full Stream Video docs index, "which page?" map, LLM prompt |
| `.env.example` | Environment variable template |
| `getstream.md` | Stream Chat + Video top-level doc links |
