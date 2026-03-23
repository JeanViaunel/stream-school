"use client";

import { useEffect, useState, useCallback } from "react";
import {
  useCall,
  useCallStateHooks,
  OwnCapability,
  type PermissionRequestEvent,
  type StreamCallEvent,
} from "@stream-io/video-react-sdk";
import { toast } from "sonner";
import { Check, X, UserPlus, Mic, Video, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PermissionRequest {
  id: string;
  userId: string;
  userName: string;
  permissions: string[];
  timestamp: number;
}

function getPermissionIcon(permission: string) {
  if (permission.includes("audio") || permission.includes("send-audio")) {
    return Mic;
  }
  if (permission.includes("video") || permission.includes("send-video")) {
    return Video;
  }
  if (permission.includes("screen") || permission.includes("screenshare")) {
    return Monitor;
  }
  return UserPlus;
}

function getPermissionLabel(permission: string): string {
  if (permission.includes("audio") || permission.includes("send-audio")) {
    return "microphone";
  }
  if (permission.includes("video") || permission.includes("send-video")) {
    return "camera";
  }
  if (permission.includes("screen") || permission.includes("screenshare")) {
    return "screen sharing";
  }
  return permission;
}

interface PermissionRequestCardProps {
  request: PermissionRequest;
  onAccept: (request: PermissionRequest) => void;
  onReject: (request: PermissionRequest) => void;
}

function PermissionRequestCard({
  request,
  onAccept,
  onReject,
}: PermissionRequestCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    await onAccept(request);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await onReject(request);
    setIsProcessing(false);
  };

  return (
    <div className="glass-strong border border-white/10 rounded-xl p-4 shadow-lg animate-in slide-in-from-right duration-300">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/30 shrink-0">
          <UserPlus className="h-5 w-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {request.userName}
          </p>
          <p className="text-xs text-white/60 mt-0.5">
            Requests permission to use:
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {request.permissions.map((permission) => {
              const Icon = getPermissionIcon(permission);
              return (
                <span
                  key={permission}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white/10 text-white/80"
                >
                  <Icon className="h-3 w-3" />
                  {getPermissionLabel(permission)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          variant="default"
          size="sm"
          className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
          onClick={handleAccept}
          disabled={isProcessing}
        >
          <Check className="h-4 w-4 mr-1.5" />
          Allow
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-transparent hover:bg-white/10 text-white/80 border-white/20"
          onClick={handleReject}
          disabled={isProcessing}
        >
          <X className="h-4 w-4 mr-1.5" />
          Deny
        </Button>
      </div>
    </div>
  );
}

export function PermissionRequests() {
  const call = useCall();
  const { useHasPermissions } = useCallStateHooks();
  const canManagePermissions = useHasPermissions(
    OwnCapability.UPDATE_CALL_PERMISSIONS
  );
  const [requests, setRequests] = useState<PermissionRequest[]>([]);

  const handlePermissionRequest = useCallback(
    (event: StreamCallEvent) => {
      if (event.type !== "call.permission_request") return;

      const permissionEvent = event as PermissionRequestEvent;
      const { user, permissions } = permissionEvent;

      const newRequest: PermissionRequest = {
        id: `${user.id}-${Date.now()}`,
        userId: user.id,
        userName: user.name || user.id,
        permissions: permissions || [],
        timestamp: Date.now(),
      };

      setRequests((prev) => {
        // Remove any existing request from the same user for the same permissions
        const filtered = prev.filter(
          (req) =>
            !(req.userId === newRequest.userId &&
              req.permissions.every((p) => newRequest.permissions.includes(p)))
        );
        return [...filtered, newRequest];
      });

      toast.info(`${newRequest.userName} is requesting permissions`, {
        description: `Asking for: ${newRequest.permissions.map(getPermissionLabel).join(", ")}`,
        duration: 5000,
      });
    },
    []
  );

  useEffect(() => {
    if (!call || !canManagePermissions) return;

    call.on("call.permission_request", handlePermissionRequest);

    return () => {
      call.off("call.permission_request", handlePermissionRequest);
    };
  }, [call, canManagePermissions, handlePermissionRequest]);

  const handleAccept = async (request: PermissionRequest) => {
    if (!call) return;

    try {
      await call.grantPermissions(request.userId, request.permissions);
      setRequests((prev) => prev.filter((req) => req.id !== request.id));
      toast.success(`Allowed ${request.userName} to use ${request.permissions.map(getPermissionLabel).join(", ")}`);
    } catch (error) {
      toast.error("Failed to grant permissions");
      console.error("Error granting permissions:", error);
    }
  };

  const handleReject = async (request: PermissionRequest) => {
    if (!call) return;

    try {
      await call.revokePermissions(request.userId, request.permissions);
      setRequests((prev) => prev.filter((req) => req.id !== request.id));
      toast.success(`Denied permissions for ${request.userName}`);
    } catch (error) {
      toast.error("Failed to revoke permissions");
      console.error("Error revoking permissions:", error);
    }
  };

  // Auto-remove old requests after 5 minutes
  useEffect(() => {
    if (requests.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setRequests((prev) =>
        prev.filter((req) => now - req.timestamp < 5 * 60 * 1000)
      );
    }, 60000);

    return () => clearInterval(interval);
  }, [requests.length]);

  if (!canManagePermissions || requests.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed right-4 top-20 z-50 flex flex-col gap-2 max-w-sm",
        "transition-all duration-300"
      )}
    >
      {requests.map((request) => (
        <PermissionRequestCard
          key={request.id}
          request={request}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      ))}
    </div>
  );
}
