"use client";

import { Sidebar } from "@/components/chat/Sidebar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/contexts/SettingsContext";
import { type AppSettings } from "@/lib/settings";
import { toast } from "sonner";

interface SettingItem {
  id: keyof AppSettings;
  label: string;
  description: string;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: "Notifications",
    items: [
      {
        id: "desktopNotifications",
        label: "Desktop Notifications",
        description: "Show browser notifications for new messages when the window is in the background",
      },
      {
        id: "messagePreview",
        label: "Message Preview",
        description: "Show message content in notifications (disable for privacy)",
      },
    ],
  },
  {
    title: "Sound",
    items: [
      {
        id: "messageSounds",
        label: "Message Sounds",
        description: "Play a sound when you receive a new message",
      },
      {
        id: "callSounds",
        label: "Call Sounds",
        description: "Play a ringtone for incoming video/audio calls",
      },
    ],
  },
  {
    title: "Privacy",
    items: [
      {
        id: "readReceipts",
        label: "Send Read Receipts",
        description: "Let others know when you've opened and read their messages",
      },
      {
        id: "typingIndicators",
        label: "Typing Indicators",
        description: "Show the typing indicator when you are composing a message",
      },
    ],
  },
  {
    title: "Appearance",
    items: [
      {
        id: "compactMode",
        label: "Compact Mode",
        description: "Reduce spacing and font size for a denser message layout",
      },
      {
        id: "animations",
        label: "Animations",
        description: "Enable UI transition and motion animations throughout the app",
      },
    ],
  },
];

export default function SettingsPage() {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto px-8 py-10">
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
                            toast.success(`${item.label} ${v ? "enabled" : "disabled"}`);
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
        </div>
      </main>
    </div>
  );
}
