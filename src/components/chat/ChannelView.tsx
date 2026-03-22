"use client";

import {
  Channel,
  MessageList,
  MessageInput,
  Thread,
  Window,
  ChannelHeader,
  useChannelStateContext,
} from "stream-chat-react";
import { CallButton } from "@/components/call/CallButton";

function ChannelHeader2() {
  const { channel } = useChannelStateContext();
  return (
    <div className="flex items-center justify-between border-b pr-2">
      <ChannelHeader />
      <CallButton channelId={channel.id ?? ""} />
    </div>
  );
}

export function ChannelView() {
  return (
    <Channel>
      <Window>
        <ChannelHeader2 />
        <MessageList />
        <MessageInput />
      </Window>
      <Thread />
    </Channel>
  );
}
