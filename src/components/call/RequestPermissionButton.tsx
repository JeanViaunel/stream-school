"use client";

import { useState, useCallback } from "react";
import {
  useRequestPermission,
  useCallStateHooks,
  OwnCapability,
} from "@stream-io/video-react-sdk";
import { toast } from "sonner";
import { Mic, Video, Monitor, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type PermissionType = "send-audio" | "send-video" | "screenshare";

interface PermissionConfig {
  type: PermissionType;
  capability: OwnCapability;
  icon: typeof Mic;
  activeIcon: typeof Mic;
  label: string;
  requestLabel: string;
  grantedLabel: string;
}

const PERMISSIONS: PermissionConfig[] = [
  {
    type: "send-audio",
    capability: OwnCapability.SEND_AUDIO,
    icon: Mic,
    activeIcon: Mic,
    label: "Microphone",
    requestLabel: "Request mic",
    grantedLabel: "Mic granted",
  },
  {
    type: "send-video",
    capability: OwnCapability.SEND_VIDEO,
    icon: Video,
    activeIcon: Video,
    label: "Camera",
    requestLabel: "Request camera",
    grantedLabel: "Camera granted",
  },
  {
    type: "screenshare",
    capability: OwnCapability.SCREENSHARE,
    icon: Monitor,
    activeIcon: Monitor,
    label: "Screen Share",
    requestLabel: "Request screenshare",
    grantedLabel: "Screenshare granted",
  },
];

type RequestState = "idle" | "pending" | "granted" | "denied";

interface PermissionButtonProps {
  config: PermissionConfig;
  state: RequestState;
  onRequest: (permission: PermissionType) => void;
  disabled: boolean;
}

function PermissionButton({
  config,
  state,
  onRequest,
  disabled,
}: PermissionButtonProps) {
  const Icon = config.icon;

  const getButtonContent = () => {
    switch (state) {
      case "pending":
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Pending...</span>
          </>
        );
      case "granted":
        return (
          <>
            <Check className="h-4 w-4" />
            <span className="text-xs">{config.grantedLabel}</span>
          </>
        );
      case "denied":
        return (
          <>
            <X className="h-4 w-4" />
            <span className="text-xs">Denied</span>
          </>
        );
      default:
        return (
          <>
            <Icon className="h-4 w-4" />
            <span className="text-xs">{config.requestLabel}</span>
          </>
        );
    }
  };

  const getButtonStyles = () => {
    switch (state) {
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "granted":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "denied":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-white/10 text-white/80 border-white/20 hover:bg-white/15";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex items-center gap-2 px-3 py-2 h-auto border",
              getButtonStyles(),
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => onRequest(config.type)}
            disabled={disabled || state === "pending" || state === "granted"}
          >
            {getButtonContent()}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>
            {state === "idle"
              ? `Request permission to use ${config.label.toLowerCase()}`
              : state === "pending"
                ? "Waiting for teacher approval"
                : state === "granted"
                  ? `You can now use ${config.label.toLowerCase()}`
                  : `Permission denied for ${config.label.toLowerCase()}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function RequestPermissionButton() {
  const { useHasPermissions } = useCallStateHooks();
  const [requestStates, setRequestStates] = useState<
    Record<PermissionType, RequestState>
  >({
    "send-audio": "idle",
    "send-video": "idle",
    screenshare: "idle",
  });

  const hasAudio = useHasPermissions(OwnCapability.SEND_AUDIO);
  const hasVideo = useHasPermissions(OwnCapability.SEND_VIDEO);
  const hasScreenShare = useHasPermissions(OwnCapability.SCREENSHARE);

  const { requestPermission: requestAudio, canRequestPermission: canRequestAudio } =
    useRequestPermission(OwnCapability.SEND_AUDIO);
  const { requestPermission: requestVideo, canRequestPermission: canRequestVideo } =
    useRequestPermission(OwnCapability.SEND_VIDEO);
  const { requestPermission: requestScreenShare, canRequestPermission: canRequestScreenShare } =
    useRequestPermission(OwnCapability.SCREENSHARE);

  const handleRequest = useCallback(
    async (permission: PermissionType) => {
      setRequestStates((prev) => ({ ...prev, [permission]: "pending" }));

      try {
        let success = false;

        switch (permission) {
          case "send-audio":
            if (canRequestAudio) {
              success = await requestAudio();
            }
            break;
          case "send-video":
            if (canRequestVideo) {
              success = await requestVideo();
            }
            break;
          case "screenshare":
            if (canRequestScreenShare) {
              success = await requestScreenShare();
            }
            break;
        }

        if (success) {
          setRequestStates((prev) => ({ ...prev, [permission]: "granted" }));
          const config = PERMISSIONS.find((p) => p.type === permission);
          toast.success(`${config?.label || "Permission"} request sent`);
        } else {
          setRequestStates((prev) => ({ ...prev, [permission]: "denied" }));
          toast.error("Failed to send permission request");
        }
      } catch (error) {
        setRequestStates((prev) => ({ ...prev, [permission]: "denied" }));
        toast.error("Failed to send permission request");
        console.error("Error requesting permission:", error);
      }
    },
    [requestAudio, requestVideo, requestScreenShare, canRequestAudio, canRequestVideo, canRequestScreenShare]
  );

  // Update states when permissions change
  const updateStatesFromPermissions = useCallback(() => {
    setRequestStates((prev) => ({
      "send-audio": hasAudio ? "granted" : prev["send-audio"],
      "send-video": hasVideo ? "granted" : prev["send-video"],
      screenshare: hasScreenShare ? "granted" : prev.screenshare,
    }));
  }, [hasAudio, hasVideo, hasScreenShare]);

  // Check if user can request any permissions
  const canRequestAny =
    (!hasAudio && canRequestAudio) ||
    (!hasVideo && canRequestVideo) ||
    (!hasScreenShare && canRequestScreenShare);

  // If user already has all permissions, don't show the button
  if (hasAudio && hasVideo && hasScreenShare) {
    return null;
  }

  // If user can't request any permissions, don't show
  if (!canRequestAny) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
      <span className="text-xs text-white/50 mr-1">Request:</span>
      {PERMISSIONS.map((config) => {
        const hasPermission =
          config.type === "send-audio"
            ? hasAudio
            : config.type === "send-video"
              ? hasVideo
              : hasScreenShare;

        const canRequest =
          config.type === "send-audio"
            ? canRequestAudio
            : config.type === "send-video"
              ? canRequestVideo
              : canRequestScreenShare;

        if (hasPermission || !canRequest) return null;

        return (
          <PermissionButton
            key={config.type}
            config={config}
            state={requestStates[config.type]}
            onRequest={handleRequest}
            disabled={!canRequest}
          />
        );
      })}
    </div>
  );
}
