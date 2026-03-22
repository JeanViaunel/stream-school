"use client";

import { useEffect, useRef, useState } from "react";
import {
  type Call,
} from "@stream-io/video-react-sdk";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Sparkles,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VolumeIndicator } from "./VolumeVisualizer";
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
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedMicDevice, setSelectedMicDevice] = useState("");
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [volume, setVolume] = useState(0);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onJoinRef = useRef(onJoin);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Keep ref up to date with the latest callback
  useEffect(() => {
    onJoinRef.current = onJoin;
  }, [onJoin]);

  // Enumerate media devices on mount and on device change
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === "videoinput");
        const mics = devices.filter((d) => d.kind === "audioinput");
        setCameraDevices(cameras);
        setMicDevices(mics);
        setSelectedDevice((prev) => (prev === "" ? (cameras[0]?.deviceId ?? "") : prev));
        setSelectedMicDevice((prev) => (prev === "" ? (mics[0]?.deviceId ?? "") : prev));
      } catch (err) {
        console.error("Failed to enumerate devices:", err);
      }
    };

    enumerateDevices();
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
    };
  }, []);

  // Initialize camera preview
  useEffect(() => {
    let stream: MediaStream | null = null;

    const initCamera = async () => {
      if (!isCameraEnabled) {
        if (videoStream) {
          videoStream.getTracks().forEach((track) => track.stop());
          setVideoStream(null);
        }
        return;
      }

      try {
        const videoConstraint: MediaTrackConstraints = selectedDevice
          ? { deviceId: { exact: selectedDevice }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } };

        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: false,
        });
        setVideoStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to get camera:", err);
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraEnabled, selectedDevice]);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Real mic volume via AudioContext
  useEffect(() => {
    if (!isMicEnabled) {
      setVolume(0);

      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const startAudio = async () => {
      try {
        const audioConstraint: MediaTrackConstraints | boolean = selectedMicDevice
          ? { deviceId: { exact: selectedMicDevice } }
          : true;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        micStreamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = (sum / dataArray.length / 255) * 100;
          setVolume(avg);
          animFrameRef.current = requestAnimationFrame(tick);
        };

        animFrameRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.error("Failed to get microphone:", err);
      }
    };

    startAudio();

    return () => {
      cancelled = true;

      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
    };
  }, [isMicEnabled, selectedMicDevice]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      onJoinRef.current();
      return;
    }
    timeoutRef.current = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [countdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

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
              {/* Native video preview */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Preview overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Camera off state */}
              {!isCameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="flex flex-col items-center gap-3 text-white/50">
                    <VideoOff className="h-12 w-12" />
                    <span className="text-sm">Camera is off</span>
                  </div>
                </div>
              )}

              {/* Status badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
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

              {/* Volume indicator */}
              {isMicEnabled && (
                <div className="absolute bottom-4 left-4">
                  <div className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5 border border-white/10">
                    <VolumeIndicator level={volume} />
                    <span className="text-xs text-white/60 font-mono">{Math.round(volume)}%</span>
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

            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
              {/* Camera selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
                  Camera
                </label>
                <Select
                  value={selectedDevice}
                  onValueChange={(value) => setSelectedDevice(value)}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {cameraDevices.length === 0 ? (
                      <SelectItem value="default" disabled className="text-white/40">
                        No camera found
                      </SelectItem>
                    ) : (
                      cameraDevices.map((d, i) => (
                        <SelectItem
                          key={d.deviceId}
                          value={d.deviceId}
                          className="text-white hover:bg-white/10"
                        >
                          {d.label || `Camera ${i + 1}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Microphone selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
                  Microphone
                </label>
                <Select
                  value={selectedMicDevice}
                  onValueChange={(value) => setSelectedMicDevice(value)}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {micDevices.length === 0 ? (
                      <SelectItem value="default" disabled className="text-white/40">
                        No microphone found
                      </SelectItem>
                    ) : (
                      micDevices.map((d, i) => (
                        <SelectItem
                          key={d.deviceId}
                          value={d.deviceId}
                          className="text-white hover:bg-white/10"
                        >
                          {d.label || `Microphone ${i + 1}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Background effects */}
              <div className="flex items-center justify-between py-2">
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
