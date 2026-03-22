"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCalls,
  CallingState,
  StreamCall,
  useCallStateHooks,
  type Call,
} from "@stream-io/video-react-sdk";
import { Phone, PhoneOff, Video, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { startRingtone } from "@/lib/settings";

function IncomingCallPanel({ call }: { call: Call }) {
  const router = useRouter();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const [countdown, setCountdown] = useState(30);
  const { settings } = useSettings();
  const stopRingtoneRef = useRef<(() => void) | null>(null);

  // Start / stop ringtone based on callSounds setting and ringing state
  useEffect(() => {
    if (settings.callSounds && callingState === CallingState.RINGING) {
      stopRingtoneRef.current = startRingtone();
    }
    return () => {
      stopRingtoneRef.current?.();
      stopRingtoneRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.callSounds, callingState]);

  useEffect(() => {
    if (countdown <= 0) {
      decline();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (callingState !== CallingState.RINGING) return null;

  const caller = call.state.createdBy;
  const callerName = caller?.name ?? caller?.id ?? "Unknown";
  const callerInitials = callerName.slice(0, 2).toUpperCase();

  async function accept() {
    await call.join();
    router.push(`/call/${call.id}`);
  }

  async function decline() {
    const reason = call.isCreatedByMe ? "cancel" : "decline";
    await call.leave({ reject: true, reason });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
        {/* Caller avatar with animated rings */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Multiple animated rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute h-40 w-40 rounded-full border-2 border-purple-500/20 animate-ring-pulse" />
              <div className="absolute h-48 w-48 rounded-full border border-purple-500/10 animate-ring-pulse" style={{ animationDelay: "0.3s" }} />
              <div className="absolute h-56 w-56 rounded-full border border-purple-500/5 animate-ring-pulse" style={{ animationDelay: "0.6s" }} />
            </div>
            
            {/* Avatar */}
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-2 border-purple-500/40 shadow-2xl shadow-purple-500/20">
              {caller?.image ? (
                <img
                  src={caller.image}
                  alt={callerName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-syne)" }}>
                  {callerInitials}
                </span>
              )}
            </div>

            {/* Video indicator */}
            <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 border-4 border-slate-950">
              <Video className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        {/* Caller info */}
        <div className="text-center mb-10">
          <p className="text-sm uppercase tracking-[0.2em] text-purple-400 font-medium mb-2">
            Incoming Video Call
          </p>
          <h2 
            className="text-3xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            {callerName}
          </h2>
          <p className="text-white/50">is calling you...</p>
        </div>

        {/* Countdown ring */}
        <div className="flex justify-center mb-10">
          <div className="relative">
            <svg className="h-16 w-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                className="text-white/10"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 28}
                strokeDashoffset={2 * Math.PI * 28 * (1 - countdown / 30)}
                className="text-purple-400 transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-mono font-semibold text-white">{countdown}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-8">
          {/* Decline */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={decline}
              className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30 transition-all duration-200 hover:scale-110 hover:shadow-red-500/50"
            >
              <PhoneOff className="h-7 w-7 text-white transition-transform duration-200 group-hover:rotate-12" />
            </button>
            <span className="text-xs font-medium text-white/60">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={accept}
              className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/40 transition-all duration-200 hover:scale-110 hover:shadow-emerald-500/60"
            >
              <Phone className="h-8 w-8 text-white transition-transform duration-200 group-hover:rotate-12" />
            </button>
            <span className="text-sm font-semibold text-emerald-400">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IncomingCallModal() {
  const calls = useCalls();
  const ringingCalls = calls.filter(
    (call) => call.ringing && !call.isCreatedByMe
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
