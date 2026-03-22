"use client";

import { Sidebar } from "@/components/chat/Sidebar";
import { Separator } from "@/components/ui/separator";

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["⌘", "N"], description: "New direct message" },
      { keys: ["⌘", "G"], description: "New group chat" },
      { keys: ["⌘", ","], description: "Open settings" },
    ],
  },
  {
    title: "Calls",
    shortcuts: [
      { keys: ["⌘", "V"], description: "Start video call" },
      { keys: ["⌘", "D"], description: "Toggle microphone" },
      { keys: ["⌘", "E"], description: "Toggle camera" },
      { keys: ["⌘", "⇧", "L"], description: "Leave call" },
    ],
  },
  {
    title: "Messages",
    shortcuts: [
      { keys: ["Enter"], description: "Send message" },
      { keys: ["⇧", "Enter"], description: "New line in message" },
      { keys: ["↑"], description: "Edit last message" },
      { keys: ["Esc"], description: "Cancel editing / close dialog" },
    ],
  },
  {
    title: "App",
    shortcuts: [
      { keys: ["⌘", "⇧", "Q"], description: "Log out" },
      { keys: ["⌘", "/"], description: "Show keyboard shortcuts" },
    ],
  },
];

function Key({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-md border border-border/60 bg-muted text-[11px] font-mono font-medium text-muted-foreground shadow-sm">
      {label}
    </kbd>
  );
}

export default function KeyboardShortcutsPage() {
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
              Keyboard Shortcuts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Work faster with these shortcuts
            </p>
          </div>

          <div className="space-y-8">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {group.title}
                </h2>
                <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
                  {group.shortcuts.map((shortcut, i) => (
                    <div key={shortcut.description}>
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key) => (
                            <Key key={key} label={key} />
                          ))}
                        </div>
                      </div>
                      {i < group.shortcuts.length - 1 && (
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
