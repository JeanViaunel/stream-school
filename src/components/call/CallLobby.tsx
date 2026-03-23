"use client";

import { useState, useEffect } from "react";
import {
  type Call,
  VideoPreview,
  DeviceSettings,
  DeviceSelectorVideo,
  DeviceSelectorAudioInput,
  DeviceSelectorAudioOutput,
  AudioVolumeIndicator,
  SpeakerTest,
} from "@stream-io/video-react-sdk";
import { Mic, MicOff, Video, VideoOff, Sparkles, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface CallLobbyProps {
  call: Call;
  onJoin: () => void;
  onCancel: () => void;
  isMicEnabled?: boolean;
  isCameraEnabled?: boolean;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
}

export function CallLobby({
  call,
  onJoin,
  onCancel,
  isMicEnabled = true,
  isCameraEnabled = true,
  onToggleMic,
  onToggleCamera,
}: CallLobbyProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [backgroundBlur, setBackgroundBlur] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      onJoin();
      return;
    }
    const timeout = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timeout);
  }, [countdown, onJoin]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-slate-950 to-purple-950/30" />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 w-full max-w-4xl mx-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Video Preview */}
          <div className="space-y-4">
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl">
              {/* Stream Video SDK VideoPreview component */}
              <VideoPreview 
                mirror={true}
                DisabledVideoPreview={() => (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="flex flex-col items-center gap-3 text-white/50">
                      <VideoOff className="h-12 w-12" />
                      <span className="text-sm">Camera is off</span>
                    </div>
                  </div>
                )}
                NoCameraPreview={() => (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="flex flex-col items-center gap-3 text-white/50">
                      <VideoOff className="h-12 w-12" />
                      <span className="text-sm">No camera found</span>
                    </div>
                  </div>
                )}
              />

              {/* Preview overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Status badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
                <div className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  isMicEnabled
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                )}>
                  {isMicEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                  <span>{isMicEnabled ? "Mic On" : "Muted"}</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  isCameraEnabled
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                )}>
                  {isCameraEnabled ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                  <span>{isCameraEnabled ? "Camera On" : "Camera Off"}</span>
                </div>
              </div>

              {/* Volume indicator using Stream SDK */}
              {isMicEnabled && (
                <div className="absolute bottom-4 left-4 pointer-events-none">
                  <div className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5 border border-white/10">
                    <AudioVolumeIndicator />
                  </div>
                </div>
              )}
            </div>

            {/* Quick controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onToggleMic}
                className={cn(
                  "group flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200",
                  isMicEnabled
                    ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                    : "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                )}
              >
                {isMicEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
              </button>
              <button
                onClick={onToggleCamera}
                className={cn(
                  "group flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200",
                  isCameraEnabled
                    ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                    : "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                )}
              >
                {isCameraEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </button>
              <button
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                className={cn(
                  "group flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200",
                  showDeviceSettings
                    ? "bg-purple-500/30 text-purple-400 border border-purple-500/40"
                    : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                )}
                title="Device Settings"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Settings */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-syne)" }}>
                Ready to join?
              </h2>
              <p className="text-white/50">Check your audio and video before entering the call</p>
            </div>

            {showDeviceSettings ? (
              /* Stream SDK DeviceSettings component */
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-white/80">Device Settings</h3>
                  <button
                    onClick={() => setShowDeviceSettings(false)}
                    className="text-xs text-white/50 hover:text-white/80 transition-colors"
                  >
                    Hide
                  </button>
                </div>
                <DeviceSettings />
              </div>
            ) : (
              /* Simple settings panel */
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
                {/* Camera selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
                    Camera
                  </label>
                  <DeviceSelectorVideo visualType="dropdown" />
                </div>

                {/* Microphone selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
                    Microphone
                  </label>
                  <DeviceSelectorAudioInput 
                    visualType="dropdown" 
                    volumeIndicatorVisible={true} 
                  />
                </div>

                {/* Speaker selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
                    Speaker
                  </label>
                  <DeviceSelectorAudioOutput 
                    visualType="dropdown" 
                    speakerTestVisible={true} 
                  />
                </div>

                {/* Speaker test */}
                <div className="flex items-center justify-between py-2 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Test Speaker</p>
                      <p className="text-xs text-white/40">Play a sound to test your speakers</p>
                    </div>
                  </div>
                  <SpeakerTest />
                </div>

                {/* Background effects */}
                <div className="flex items-center justify-between py-2 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Background blur</p>
                      <p className="text-xs text-white/40">Keep your background private</p>
                    </div>
                  </div>
                  <Switch
                    checked={backgroundBlur}
                    onCheckedChange={setBackgroundBlur}
                    className="data-[state=checked]:bg-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1 h-12 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => countdown === null ? setCountdown(3) : setCountdown(null)}
                className={cn(
                  "flex-1 h-12 gap-2 transition-all duration-300",
                  countdown !== null
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                )}
              >
                {countdown !== null ? (
                  <>
                    <span className="font-mono text-lg">{countdown}</span>
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Join Now</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
