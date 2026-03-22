"use client";

import { useState } from "react";
import { Sidebar } from "@/components/chat/Sidebar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface SettingGroup {
  title: string;
  items: {
    id: string;
    label: string;
    description: string;
    defaultValue: boolean;
  }[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: "Notifications",
    items: [
      {
        id: "desktopNotifications",
        label: "Desktop Notifications",
        description: "Show notifications for new messages",
        defaultValue: true,
      },
      {
        id: "messagePreview",
        label: "Message Preview",
        description: "Show message content in notifications",
        defaultValue: true,
      },
    ],
  },
  {
    title: "Sound",
    items: [
      {
        id: "messageSounds",
        label: "Message Sounds",
        description: "Play a sound when you receive a message",
        defaultValue: true,
      },
      {
        id: "callSounds",
        label: "Call Sounds",
        description: "Play ringtone for incoming calls",
        defaultValue: true,
      },
    ],
  },
  {
    title: "Privacy",
    items: [
      {
        id: "readReceipts",
        label: "Read Receipts",
        description: "Let others know when you've read their messages",
        defaultValue: true,
      },
      {
        id: "typingIndicators",
        label: "Typing Indicators",
        description: "Show when you're typing to others",
        defaultValue: true,
      },
    ],
  },
  {
    title: "Appearance",
    items: [
      {
        id: "compactMode",
        label: "Compact Mode",
        description: "Display messages in a more compact layout",
        defaultValue: false,
      },
      {
        id: "animations",
        label: "Animations",
        description: "Enable UI transition animations",
        defaultValue: true,
      },
    ],
  },
];

function loadSettings(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem("appSettings");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, boolean>) {
  localStorage.setItem("appSettings", JSON.stringify(settings));
}

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, boolean>>(() => {
    const stored = loadSettings();
    const defaults: Record<string, boolean> = {};
    SETTING_GROUPS.forEach((group) =>
      group.items.forEach((item) => {
        defaults[item.id] = item.id in stored ? stored[item.id] : item.defaultValue;
      })
    );
    return defaults;
  });

  function handleToggle(id: string, value: boolean) {
    const next = { ...values, [id]: value };
    setValues(next);
    saveSettings(next);
  }

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
            {SETTING_GROUPS.map((group, gi) => (
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
                          checked={values[item.id] ?? item.defaultValue}
                          onCheckedChange={(v) => handleToggle(item.id, v)}
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
