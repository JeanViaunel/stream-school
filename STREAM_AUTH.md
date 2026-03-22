# Stream Video React SDK — Client Authentication

> Source: https://getstream.io/video/docs/react/guides/client-auth.md
> Last fetched: 2026-03-22

---

## Best Practices (follow these always)

- Create `StreamVideoClient` **once** at app root; pass `tokenProvider` (not a static token) so tokens auto-refresh.
- Always clean up with `client.disconnectUser()` in the `useEffect` cleanup return.
- Use **short-lived tokens** with a `tokenProvider` in production.
- Handle connection errors with `try/catch` around `connectUser()`.
- Never expose `STREAM_API_SECRET` to the browser — generate tokens server-side only.

---

## Basic Client Setup

```ts
import { StreamVideoClient, User } from "@stream-io/video-react-sdk";

const user: User = { id: "sara" };
const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

// tokenProvider calls YOUR server to get a fresh token
const tokenProvider = async () => {
  const response = await fetch("/api/stream-token");
  const data = await response.json();
  return data.token as string;
};

const client = new StreamVideoClient({ apiKey, user, tokenProvider });
```

---

## Token Generation (Server-Side Only)

Tokens **must** be generated server-side. In this project we use a **Convex `internalAction`** to do this — the `STREAM_API_SECRET` is only ever present in the Convex environment, never in the browser.

```ts
// convex/stream.ts  (server-side, internalAction)
import { StreamClient } from "@stream-io/node-sdk";

const serverClient = new StreamClient(
  process.env.STREAM_API_KEY!,
  process.env.STREAM_API_SECRET!
);

// Validity: 1 hour. Issue short-lived tokens and let tokenProvider refresh.
const token = serverClient.generateUserToken({ user_id: userId });
```

> For development, use the token generator at https://getstream.io/chat/docs/react/tokens_and_authentication/

---

## User Types

| Type | When to Use | Token Required? |
|---|---|---|
| Authenticated | Logged-in users with an account | Yes (token or tokenProvider) |
| Guest | Temporary users (no account) | No |
| Anonymous | Viewers, unauthenticated | Optional (call-scoped only) |

This app uses **Authenticated** users only. Always pass `tokenProvider`.

---

## StreamVideo Context Provider

Wrap the app in `<StreamVideo>` so the client is available everywhere via hooks.

```tsx
import { useEffect, useState } from "react";
import {
  StreamVideo,
  StreamVideoClient,
  User,
} from "@stream-io/video-react-sdk";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

export const VideoProvider = ({ userId, displayName, tokenProvider }: Props) => {
  const [client, setClient] = useState<StreamVideoClient>();

  useEffect(() => {
    const user: User = { id: userId, name: displayName };
    const myClient = new StreamVideoClient({ apiKey, user, tokenProvider });
    setClient(myClient);

    return () => {
      myClient.disconnectUser();
      setClient(undefined);
    };
  }, [userId]);

  if (!client) return null;

  return (
    <StreamVideo client={client}>
      {children}
    </StreamVideo>
  );
};
```

---

## Client Options Reference

### `rejectCallWhenBusy`

Auto-reject incoming ringing calls when user is already in a call:

```ts
const client = new StreamVideoClient({
  apiKey,
  tokenProvider,
  user,
  options: { rejectCallWhenBusy: true },
});
```

### Logging

```ts
const client = new StreamVideoClient({
  apiKey,
  token,
  user,
  options: {
    logOptions: {
      default: { level: "warn" },
    },
  },
});
```

---

## Integration Pattern for This App

```
1. User logs in → Convex `auth.login` mutation verifies password
2. Convex calls `internal.stream.generateToken` (internalAction) → returns short-lived token
3. Client receives { userId, displayName, token }
4. Client stores session in localStorage / React context
5. App layout initialises StreamChat client (connectUser) + StreamVideoClient (tokenProvider)
6. tokenProvider hits /api/stream-token (Next.js Route Handler) which calls Convex to refresh token
7. On logout: call chat.disconnectUser() + videoClient.disconnectUser(), clear session
```

---

## Key SDK Imports

```ts
// Video
import {
  StreamVideoClient,
  StreamVideo,
  StreamCall,
  useCallStateHooks,
  useStreamVideoClient,
  SpeakerLayout,
  CallControls,
  User,
} from "@stream-io/video-react-sdk";

// Chat
import {
  StreamChat,
  Chat,
  Channel,
  ChannelList,
  MessageList,
  MessageInput,
  Window,
  Thread,
} from "stream-chat-react";
import { StreamChat as StreamChatClient } from "stream-chat";
```
