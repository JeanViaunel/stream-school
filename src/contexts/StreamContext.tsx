"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { StreamVideoClient, StreamVideo, StreamTheme } from "@stream-io/video-react-sdk";
import { useCreateChatClient, Chat } from "stream-chat-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Session } from "@/lib/session";

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

interface ConnectedProvidersProps {
  session: Session;
  children: ReactNode;
}

function ConnectedProviders({ session, children }: ConnectedProvidersProps) {
  const [videoClient, setVideoClient] = useState<StreamVideoClient | undefined>();
  const latestToken = useRef(session.token);

  const tokenProvider = useCallback(async () => {
    const res = await fetch(
      `/api/stream-token?userId=${encodeURIComponent(session.streamUserId)}&currentToken=${encodeURIComponent(latestToken.current)}`
    );
    if (!res.ok) throw new Error("Failed to refresh token");
    const data = (await res.json()) as { token: string };
    latestToken.current = data.token;
    return data.token;
  }, [session.streamUserId]);

  const chatClient = useCreateChatClient({
    apiKey: API_KEY,
    tokenOrProvider: tokenProvider,
    userData: { id: session.streamUserId, name: session.displayName },
  });

  useEffect(() => {
    const client = new StreamVideoClient({
      apiKey: API_KEY,
      user: { id: session.streamUserId, name: session.displayName },
      token: session.token,
      tokenProvider,
      options: { rejectCallWhenBusy: true },
    });
    setVideoClient(client);

    return () => {
      client.disconnectUser();
      setVideoClient(undefined);
    };
  }, [session.streamUserId, session.token, session.displayName, tokenProvider]);

  if (!chatClient || !videoClient) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/30" />
            <span className="relative inline-flex h-6 w-6 rounded-full bg-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground tracking-wide">Connecting…</p>
        </div>
      </div>
    );
  }

  return (
    <Chat client={chatClient} theme="str-chat__theme-dark">
      <StreamVideo client={videoClient}>
        <StreamTheme as="main" className="str-video">
          {children}
        </StreamTheme>
      </StreamVideo>
    </Chat>
  );
}

export function StreamContext({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  if (!session) return <>{children}</>;

  return <ConnectedProviders session={session}>{children}</ConnectedProviders>;
}
