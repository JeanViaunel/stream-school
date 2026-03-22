# Project Setup — Video Call Chat App

Follow these steps in order before writing any application code.

---

## Prerequisites

- Node.js 20+
- A [Stream](https://dashboard.getstream.io/) account — create an app, copy API Key + Secret
- A [Convex](https://dashboard.convex.dev/) account

---

## 1. Scaffold Next.js

```bash
npx create-next-app@latest stream-chat-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd stream-chat-app
```

---

## 2. Initialize Convex

```bash
npx convex dev
```

Follow the prompts to link or create a Convex project. This generates `convex/_generated/`.

---

## 3. Install Dependencies

```bash
# Stream SDKs
npm install stream-chat stream-chat-react @stream-io/video-react-sdk @stream-io/node-sdk

# Convex
npm install convex

# Auth utilities
npm install bcryptjs
npm install --save-dev @types/bcryptjs

# UI
npx shadcn@latest init
npx shadcn@latest add button input dialog avatar badge separator scroll-area

# Utilities
npm install clsx tailwind-merge lucide-react
```

---

## 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `STREAM_API_KEY` | Stream Dashboard → App → API Keys |
| `STREAM_API_SECRET` | Stream Dashboard → App → API Keys |
| `NEXT_PUBLIC_STREAM_API_KEY` | Same as `STREAM_API_KEY` |
| `CONVEX_DEPLOYMENT` | Output of `npx convex dev` |
| `NEXT_PUBLIC_CONVEX_URL` | Output of `npx convex dev` |

> `STREAM_API_SECRET` must **never** appear in client-side code or `NEXT_PUBLIC_*` variables.

---

## 5. Convex Environment Variables

Set `STREAM_API_KEY` and `STREAM_API_SECRET` in the Convex dashboard (Settings → Environment Variables), or via CLI:

```bash
npx convex env set STREAM_API_KEY your_key_here
npx convex env set STREAM_API_SECRET your_secret_here
```

These are accessed in Convex actions via `process.env.STREAM_API_KEY`.

---

## 6. Stream Dashboard Configuration

In your Stream app dashboard:
- Enable **Chat** product
- Enable **Video & Audio** (Calls) product
- Under Call Types, ensure `default` call type exists
- Optional: set up webhook URL for call events

---

## 7. TypeScript Config

Ensure `tsconfig.json` has strict mode and path aliases configured:

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 8. Tailwind Config

Make sure `tailwind.config.ts` includes the `stream-chat-react` styles path:

```ts
content: [
  "./src/**/*.{ts,tsx}",
  "./node_modules/stream-chat-react/dist/**/*.js",
]
```

Import Stream Chat CSS in your root layout:

```ts
// src/app/layout.tsx
import "stream-chat-react/dist/css/v2/index.css";
import "@stream-io/video-react-sdk/dist/css/styles.css";
```

---

## 9. Run Development Server

```bash
# In terminal 1 — Convex dev server (keep running)
npx convex dev

# In terminal 2 — Next.js dev server
npm run dev
```

App runs at http://localhost:3000
