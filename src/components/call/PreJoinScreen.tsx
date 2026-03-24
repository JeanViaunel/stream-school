"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Loader2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PreJoinPrefs {
  cameraEnabled: boolean;
  micEnabled: boolean;
}

interface PreJoinScreenProps {
  roomName: string;
  isTeacher: boolean;
  onContinue: (prefs: PreJoinPrefs) => void;
}

type PermissionStatus = "pending" | "granted" | "denied";

export function PreJoinScreen({
  roomName,
  isTeacher,
  onContinue
}: PreJoinScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraPermission, setCameraPermission] =
    useState<PermissionStatus>("pending");
  const [micPermission, setMicPermission] =
    useState<PermissionStatus>("pending");
  const [isRequesting, setIsRequesting] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const requestPermissions = useCallback(async () => {
    // Stop any existing preview stream before re-requesting
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setIsRequesting(true);
    setCameraPermission("pending");
    setMicPermission("pending");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setCameraPermission("granted");
      setMicPermission("granted");
    } catch (err) {
      if (!mountedRef.current) return;
      const name = (err as Error).name;
      const isBothDenied =
        name === "NotAllowedError" || name === "PermissionDeniedError";

      if (isBothDenied) {
        setCameraPermission("denied");
        setMicPermission("denied");
        // Fallback: try audio-only in case only camera was blocked
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });
          if (!mountedRef.current) {
            audioStream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = audioStream;
          setMicPermission("granted");
        } catch {
          // both denied
        }
      } else if (name === "NotFoundError") {
        // No camera device found — try audio only
        setCameraPermission("denied");
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });
          if (!mountedRef.current) {
            audioStream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = audioStream;
          setMicPermission("granted");
        } catch {
          setMicPermission("denied");
        }
      } else {
        setCameraPermission("denied");
        setMicPermission("denied");
      }
    } finally {
      if (mountedRef.current) setIsRequesting(false);
    }
  }, []);

  // Request permissions on mount
  useEffect(() => {
    void requestPermissions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach stream to video element when camera becomes visible
  useEffect(() => {
    if (videoRef.current && streamRef.current && cameraEnabled) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraEnabled, cameraPermission]);

  const toggleCamera = useCallback(() => {
    const newEnabled = !cameraEnabled;
    streamRef.current
      ?.getVideoTracks()
      .forEach((t) => (t.enabled = newEnabled));
    setCameraEnabled(newEnabled);
  }, [cameraEnabled]);

  const toggleMic = useCallback(() => {
    const newEnabled = !micEnabled;
    streamRef.current
      ?.getAudioTracks()
      .forEach((t) => (t.enabled = newEnabled));
    setMicEnabled(newEnabled);
  }, [micEnabled]);

  const handleContinue = useCallback(() => {
    // Stop the preview — the Stream SDK will open its own tracks on join
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onContinue({ cameraEnabled, micEnabled });
  }, [cameraEnabled, micEnabled, onContinue]);

  const cameraBlocked = cameraPermission === "denied";
  const micBlocked = micPermission === "denied";
  const anyBlocked = cameraBlocked || micBlocked;
  const showPreview = cameraPermission === "granted" && cameraEnabled;

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-linear-to-br from-indigo-950/50 via-slate-950 to-purple-950/30" />

      <div className="relative z-10 w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            {roomName}
          </h2>
          <p className="text-white/50 mt-1 text-sm">
            {isTeacher
              ? "Set up your devices before starting the class"
              : "Set up your devices before joining"}
          </p>
        </div>

        {/* Camera preview */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
          {showPreview && (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}

          {!showPreview && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              {isRequesting ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-white/40" />
                  <p className="text-sm text-white/40">
                    Requesting camera & microphone access...
                  </p>
                </>
              ) : cameraBlocked ? (
                <>
                  <AlertCircle className="w-10 h-10 text-red-400/60" />
                  <p className="text-sm text-white/50">Camera access denied</p>
                  <p className="text-xs text-white/30">
                    Allow camera in your browser settings to be seen
                  </p>
                </>
              ) : (
                <>
                  <VideoOff className="w-10 h-10 text-white/30" />
                  <p className="text-sm text-white/40">Camera is off</p>
                </>
              )}
            </div>
          )}

          {/* Mic muted badge */}
          {!isRequesting && !micEnabled && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-sm">
              <MicOff className="w-3 h-3 text-red-400" />
              <span className="text-xs text-red-400">Muted</span>
            </div>
          )}
        </div>

        {/* Device toggle buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleMic}
            disabled={micBlocked || isRequesting}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-150",
              micBlocked || isRequesting
                ? "border-white/5 bg-white/5 text-white/30 cursor-not-allowed"
                : micEnabled
                  ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
                  : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            )}
          >
            {micEnabled && !micBlocked ? (
              <Mic className="w-4 h-4" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {micBlocked ? "Mic blocked" : micEnabled ? "Mic on" : "Mic off"}
            </span>
          </button>

          <button
            onClick={toggleCamera}
            disabled={cameraBlocked || isRequesting}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-150",
              cameraBlocked || isRequesting
                ? "border-white/5 bg-white/5 text-white/30 cursor-not-allowed"
                : cameraEnabled
                  ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
                  : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            )}
          >
            {cameraEnabled && !cameraBlocked ? (
              <Video className="w-4 h-4" />
            ) : (
              <VideoOff className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {cameraBlocked
                ? "Camera blocked"
                : cameraEnabled
                  ? "Camera on"
                  : "Camera off"}
            </span>
          </button>
        </div>

        {/* Permission denied notice */}
        {anyBlocked && !isRequesting && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs text-amber-400 font-medium">
                  {cameraBlocked && micBlocked
                    ? "Camera and microphone access denied"
                    : cameraBlocked
                      ? "Camera access denied"
                      : "Microphone access denied"}
                </p>
                <p className="text-xs text-white/40">
                  {cameraBlocked && micBlocked
                    ? "You'll join without audio or video."
                    : cameraBlocked
                      ? "You'll join without video."
                      : "You'll join without audio."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void requestPermissions()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Try again
              </button>
              <p className="text-xs text-white/30">
                Allow access in your browser settings, then tap Try again.
              </p>
            </div>
          </div>
        )}

        {/* Continue button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleContinue}
          disabled={isRequesting}
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Waiting for permissions...
            </>
          ) : isTeacher ? (
            "Start class"
          ) : (
            "Join lobby"
          )}
        </Button>

        {isRequesting && (
          <p className="text-xs text-center text-white/30">
            Your browser will ask to use your camera and microphone
          </p>
        )}
      </div>
    </div>
  );
}
