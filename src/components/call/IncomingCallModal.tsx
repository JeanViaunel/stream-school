"use client";

import { useRouter } from "next/navigation";
import {
  useCalls,
  CallingState,
  StreamCall,
  useCallStateHooks,
  type Call,
} from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";

function IncomingCallPanel({ call }: { call: Call }) {
  const router = useRouter();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (callingState !== CallingState.RINGING) return null;

  const caller = call.state.createdBy;
  const callerName = caller?.name ?? caller?.id ?? "Unknown";

  async function accept() {
    await call.join();
    router.push(`/call/${call.id}`);
  }

  async function decline() {
    const reason = call.isCreatedByMe ? "cancel" : "decline";
    await call.leave({ reject: true, reason });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-background rounded-xl p-6 flex flex-col items-center gap-4 shadow-2xl w-72">
        <div className="text-lg font-semibold">Incoming call</div>
        <div className="text-muted-foreground">{callerName} is calling…</div>
        <div className="flex gap-4 mt-2">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90"
            onClick={decline}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600"
            onClick={accept}
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function IncomingCallModal() {
  const calls = useCalls();
  const ringingCalls = calls.filter(
    (call) => call.state.callingState === CallingState.RINGING && !call.isCreatedByMe
  );

  return (
    <>
      {ringingCalls.map((call) => (
        <StreamCall call={call} key={call.cid}>
          <IncomingCallPanel call={call} />
        </StreamCall>
      ))}
    </>
  );
}
