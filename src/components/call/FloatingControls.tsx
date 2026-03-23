"use client";

import { useState, useEffect } from "react";
import {
  useCall,
  useCallStateHooks,
  RecordCallButton,
  RecordCallConfirmationButton,
  DeviceSelectorVideo,
  DeviceSelectorAudioInput,
  DeviceSelectorAudioOutput,
} from "@stream-io/video-react-sdk";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  LogOut,
  X,
  LayoutGrid,
  Maximize2,
  Presentation,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VolumeIndicator } from "./VolumeVisualizer";
import { ToggleClosedCaptions } from "./ToggleClosedCaptions";
import { VirtualBackgroundToggle } from "./VirtualBackgroundToggle";
import { LiveReactions } from "./LiveReactions";
import { TranscriptionToggle } from "./TranscriptionToggle";

export type CallLayout = "spotlight" | "grid" | "sidebar";

interface ControlButtonProps {
  onClick: () => void;
  isActive?: boolean;
  isDanger?: boolean;
  icon: React.ElementType;
  activeIcon?: React.ElementType;
  label: string;
  volume?: number;
  showVolume?: boolean;
}

function ControlButton({
  onClick,
  isActive = true,
  isDanger = false,
  icon: Icon,
  activeIcon: ActiveIcon,
  label,
  volume = 0,
  showVolume = false,
}: ControlButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const DisplayIcon = isActive ? Icon : (ActiveIcon || Icon);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={onClick}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={cn(
                "group relative flex h-14 w-14 items-center justify-center rounded-2xl",
                "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                isDanger
                  ? "bg-red-500/90 hover:bg-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:shadow-[0_0_28px_rgba(239,68,68,0.5)] hover:scale-110"
                  : isActive
                    ? "bg-white/12 hover:bg-white/18 text-white border border-white/10 hover:border-white/20 hover:scale-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    : "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 hover:scale-110"
              )}
            />
          }
        >
          <DisplayIcon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />

          {showVolume && isActive && isHovered && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 rounded-lg px-2 py-1">
              <VolumeIndicator level={volume} />
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const layouts = [
  { value: "spotlight" as CallLayout, label: "Spotlight", icon: Maximize2 },
  { value: "grid" as CallLayout, label: "Grid", icon: LayoutGrid },
  { value: "sidebar" as CallLayout, label: "Sidebar", icon: Presentation },
];

interface LayoutSwitcherProps {
  currentLayout: CallLayout;
  onLayoutChange: (layout: CallLayout) => void;
}

function LayoutSwitcher({ currentLayout, onLayoutChange }: LayoutSwitcherProps) {
  const current = layouts.find((l) => l.value === currentLayout);
  const Icon = current?.icon || LayoutGrid;

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                className={cn(
                  "group relative flex h-14 w-14 items-center justify-center rounded-2xl",
                  "transition-all duration-150 focus-visible:outline-none",
                  "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white",
                  "border border-white/5 hover:border-white/15"
                )}
              />
            }
          >
            <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Change layout ({current?.label})</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align="center"
          className="glass-strong border-white/10 min-w-[160px]"
        >
          {layouts.map((layout) => {
            const LayoutIcon = layout.icon;
            return (
              <DropdownMenuItem
                key={layout.value}
                onClick={() => onLayoutChange(layout.value)}
                className={cn(
                  "flex items-center gap-3 cursor-pointer",
                  "text-white/80 hover:text-white focus:text-white",
                  "hover:bg-white/10 focus:bg-white/10",
                  currentLayout === layout.value && "bg-white/10 text-white"
                )}
              >
                <LayoutIcon className="h-4 w-4" />
                <span>{layout.label}</span>
                {currentLayout === layout.value && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}

/** Stream's `DeviceSettings` is a nested menu toggle (icon-only until clicked). Use selectors directly so the dialog shows camera/mic/speaker immediately. */
function DeviceSettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                className={cn(
                  "group relative flex h-14 w-14 items-center justify-center rounded-2xl",
                  "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                  "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white",
                  "border border-white/5 hover:border-white/15"
                )}
              >
                <Settings className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              </DialogTrigger>
            }
          />
          <TooltipContent side="top">
            <p>Settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-md glass-strong border-white/10 bg-slate-900/95">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Call Settings
          </DialogTitle>
        </DialogHeader>

        <div className="str-video__device-settings space-y-5 py-2 text-white">
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
              Camera
            </p>
            <DeviceSelectorVideo visualType="dropdown" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
              Microphone
            </p>
            <DeviceSelectorAudioInput
              visualType="dropdown"
              volumeIndicatorVisible
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
              Speakers
            </p>
            <DeviceSelectorAudioOutput visualType="dropdown" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FloatingControlsProps {
  onLeave: () => void;
  onEndForAll?: () => Promise<void>;
  currentLayout: CallLayout;
  onLayoutChange: (layout: CallLayout) => void;
  isTeacher?: boolean;
}

export function FloatingControls({
  onLeave,
  onEndForAll,
  currentLayout,
  onLayoutChange,
  isTeacher = false,
}: FloatingControlsProps) {
  const call = useCall();
  const { session } = useAuth();
  const { useMicrophoneState, useCameraState, useScreenShareState, useIsCallRecordingInProgress, useIsCallTranscribingInProgress } = useCallStateHooks();
  const { isMute: isMicMuted, microphone } = useMicrophoneState();
  const { isMute: isCameraMuted, camera } = useCameraState();
  const { isMute: isScreenShareMuted, screenShare } = useScreenShareState();
  const isRecording = useIsCallRecordingInProgress();
  const isTranscribing = useIsCallTranscribingInProgress();
  const isHost = isTeacher;
  const canEndCall = isHost || session?.role === "admin";
  
  const [isVisible, setIsVisible] = useState(true);
  const [lastMouseMove, setLastMouseMove] = useState(Date.now());
  const [micVolume, setMicVolume] = useState(0);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const isMicOn = !isMicMuted;
  const isCamOn = !isCameraMuted;
  const isScreenSharing = !isScreenShareMuted;

  // Auto-hide controls after 3s of inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setIsVisible(true);
      setLastMouseMove(Date.now());
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastMouseMove > 3000) {
        setIsVisible(false);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [lastMouseMove]);

  // Simulate mic volume for visualizer
  useEffect(() => {
    if (!isMicOn) return;
    const interval = setInterval(() => {
      setMicVolume(Math.random() * 60 + 20);
    }, 100);
    return () => clearInterval(interval);
  }, [isMicOn]);

  async function handleLeave() {
    try { await camera.disable(); } catch {}
    try { await microphone.disable(); } catch {}
    await call?.leave();
    onLeave();
  }

  async function handleEndForAll() {
    try { await camera.disable(); } catch {}
    try { await microphone.disable(); } catch {}
    if (onEndForAll) {
      await onEndForAll();
    } else {
      await call?.endCall();
      onLeave();
    }
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2 p-2 rounded-3xl glass-strong border border-white/10 shadow-2xl">
          {/* Media controls - Core functionality */}
          <div className="flex items-center gap-2">
            <ControlButton
              onClick={() => microphone.toggle()}
              isActive={isMicOn}
              icon={Mic}
              activeIcon={MicOff}
              label={isMicOn ? "Mute" : "Unmute"}
              showVolume={true}
              volume={micVolume}
            />
            <ControlButton
              onClick={() => camera.toggle()}
              isActive={isCamOn}
              icon={Video}
              activeIcon={VideoOff}
              label={isCamOn ? "Turn off camera" : "Turn on camera"}
            />
            <ControlButton
              onClick={() => screenShare.toggle()}
              isActive={isScreenSharing}
              icon={Monitor}
              activeIcon={MonitorOff}
              label={isScreenSharing ? "Stop sharing" : "Share screen"}
            />
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-white/10" />

          {/* Recording button - only for teachers */}
          {isTeacher && (
            <div className="flex items-center gap-2">
              {isRecording ? (
                <RecordCallConfirmationButton />
              ) : (
                <RecordCallButton />
              )}
              {/* Transcription toggle - only for teachers */}
              <TranscriptionToggle isTeacher={isTeacher} variant="icon" />
            </div>
          )}

          {/* Closed Captions */}
          <ToggleClosedCaptions variant="icon" />

          {/* Virtual Background */}
          <VirtualBackgroundToggle />

          {/* Live Reactions */}
          <LiveReactions />

          {/* Divider */}
          <div className="h-8 w-px bg-white/10" />

          {/* Layout switcher */}
          <LayoutSwitcher
            currentLayout={currentLayout}
            onLayoutChange={onLayoutChange}
          />

          {/* Settings */}
          <DeviceSettingsButton />

          {/* Leave button - opens confirmation modal */}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="flex h-14 px-6 items-center justify-center gap-2 rounded-2xl bg-red-500/90 hover:bg-red-400 text-white transition-all duration-150 hover:scale-105 shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:shadow-[0_0_28px_rgba(239,68,68,0.5)]"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="font-medium">Leave</span>
          </button>
        </div>
      </div>

      {/* Recording indicator banner */}
      {isRecording && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 backdrop-blur-md px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium text-red-400">Recording</span>
        </div>
      )}

      {/* Transcription indicator banner */}
      {isTranscribing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md px-4 py-2 mt-10">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-emerald-400">Transcribing</span>
        </div>
      )}

      {/* Leave confirmation modal */}
      {showLeaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowLeaveModal(false)}
        >
          <div
            className="relative w-full max-w-sm mx-4 rounded-3xl border border-white/10 bg-slate-900/95 shadow-2xl p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setShowLeaveModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/20">
                <PhoneOff className="h-7 w-7 text-red-400" />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white text-center mb-1">
              Leave this call?
            </h3>
            <p className="text-sm text-white/50 text-center mb-6">
              Choose how you want to exit
            </p>

            <div className="space-y-3">
              {/* Leave quietly */}
              <button
                onClick={() => { setShowLeaveModal(false); handleLeave(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-left transition-all duration-150 group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 group-hover:bg-white/15 transition-colors">
                  <LogOut className="h-5 w-5 text-white/70" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Leave call</p>
                  <p className="text-xs text-white/40">Others can continue without you</p>
                </div>
              </button>

              {/* End for everyone - visible to call creator, teachers, and admins */}
              {canEndCall && (
                <button
                  onClick={() => { setShowLeaveModal(false); handleEndForAll(); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-left transition-all duration-150 group"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
                    <PhoneOff className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-400">End for everyone</p>
                    <p className="text-xs text-red-400/60">This will disconnect all participants</p>
                  </div>
                </button>
              )}
            </div>

            <button
              onClick={() => setShowLeaveModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
