"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { type AppSettings, type Theme } from "@/lib/settings";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sun, Moon, Monitor } from "lucide-react";

interface SettingItem {
  id: keyof AppSettings;
  label: string;
  description: string;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: "Notifications",
    items: [
      {
        id: "desktopNotifications",
        label: "Desktop Notifications",
        description:
          "Show browser notifications for new messages when the window is in the background"
      },
      {
        id: "messagePreview",
        label: "Message Preview",
        description:
          "Show message content in notifications (disable for privacy)"
      }
    ]
  },
  {
    title: "Sound",
    items: [
      {
        id: "messageSounds",
        label: "Message Sounds",
        description: "Play a sound when you receive a new message"
      },
      {
        id: "callSounds",
        label: "Call Sounds",
        description: "Play a ringtone for incoming video/audio calls"
      }
    ]
  },
  {
    title: "Privacy",
    items: [
      {
        id: "readReceipts",
        label: "Send Read Receipts",
        description:
          "Let others know when you've opened and read their messages"
      },
      {
        id: "typingIndicators",
        label: "Typing Indicators",
        description:
          "Show the typing indicator when you are composing a message"
      }
    ]
  },
  {
    title: "Appearance",
    items: [
      {
        id: "compactMode",
        label: "Compact Mode",
        description: "Reduce spacing and font size for a denser message layout"
      },
      {
        id: "animations",
        label: "Animations",
        description:
          "Enable UI transition and motion animations throughout the app"
      }
    ]
  }
];

export default function SettingsPage() {
  const { settings, updateSetting } = useSettings();
  const { session, logout } = useAuth();
  const exportData = useAction(api.privacy.exportMyDataJson);
  const deleteAccount = useAction(api.privacy.requestAccountDeletion);
  const [exportPassword, setExportPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    if (!session?.userId || !session.username) return;
    setExporting(true);
    try {
      const json = await exportData({
        username: session.username,
        password: exportPassword
      });
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stream-school-export-${session.userId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
      setExportPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!session?.userId || !session.username) return;
    setDeleting(true);
    try {
      await deleteAccount({
        username: session.username,
        password: deletePassword
      });
      toast.success("Account scheduled for deletion");
      logout();
      window.location.href = "/login";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="w-full px-4 sm:px-8 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-2xl font-bold tracking-tight gradient-text"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your experience
          </p>
        </div>

        <div className="space-y-8">
          {/* Theme Selector - Special Section */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Theme
            </h2>
            <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-sm font-medium">Appearance</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose your preferred color scheme
                  </p>
                </div>
                <Select
                  value={settings.theme}
                  onValueChange={(v) => {
                    updateSetting("theme", v as Theme);
                    toast.success(`Theme changed to ${v}`);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {SETTING_GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {group.title}
              </h2>
              <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
                {group.items.map((item, i) => (
                  <div key={item.id}>
                    <div className="flex items-center justify-between px-4 py-4">
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <Switch
                        checked={settings[item.id] as boolean}
                        onCheckedChange={(v) => {
                          updateSetting(item.id, v);
                          toast.success(
                            `${item.label} ${v ? "enabled" : "disabled"}`
                          );
                        }}
                      />
                    </div>
                    {i < group.items.length - 1 && (
                      <Separator className="bg-border/30 mx-4" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Data &amp; account
          </h2>
          <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden px-4 py-4 space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Export my data</p>
              <p className="text-xs text-muted-foreground">
                Download a JSON archive of your profile and enrollments. Enter
                your password to confirm.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="export-pw">Password</Label>
                  <Input
                    id="export-pw"
                    type="password"
                    autoComplete="current-password"
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={exporting || !exportPassword}
                  onClick={handleExport}
                >
                  {exporting ? "Exporting…" : "Download JSON"}
                </Button>
              </div>
            </div>
            <Separator className="bg-border/30" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Delete my account</p>
              <p className="text-xs text-muted-foreground">
                Deactivates your account and schedules removal of personal data
                after a 30-day retention window.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="delete-pw">Password</Label>
                  <Input
                    id="delete-pw"
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger
                    type="button"
                    disabled={!deletePassword}
                    className={cn(
                      buttonVariants({ variant: "destructive" }),
                      "w-full sm:w-auto"
                    )}
                  >
                    Delete account
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone from the app. Your account will be
                        deactivated and PII removed after the retention period.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          void handleDelete();
                        }}
                        disabled={deleting}
                      >
                        {deleting ? "Working…" : "Confirm delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
