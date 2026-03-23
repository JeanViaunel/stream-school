"use client";

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
    title: "Quick Navigation",
    shortcuts: [
      { keys: ["G"], description: "Go to... (press twice for actions)" },
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "A"], description: "Go to Assignments (students)" },
      { keys: ["G", "M"], description: "Go to Messages" },
      { keys: ["N"], description: "New direct message" },
      { keys: ["?"], description: "Show this help" },
    ],
  },
  {
    title: "Global",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["⌘", "/"], description: "Search everywhere" },
      { keys: ["⌘", ","], description: "Open settings" },
      { keys: ["⌘", "P"], description: "Go to profile" },
      { keys: ["Esc"], description: "Close modal / Cancel" },
    ],
  },
  {
    title: "Calls",
    shortcuts: [
      { keys: ["⌘", "V"], description: "Start/join video call" },
      { keys: ["⌘", "D"], description: "Toggle microphone" },
      { keys: ["⌘", "E"], description: "Toggle camera" },
      { keys: ["⌘", "⇧", "L"], description: "Leave call" },
      { keys: ["M"], description: "Mute/unmute (during call)" },
    ],
  },
  {
    title: "Messages",
    shortcuts: [
      { keys: ["Enter"], description: "Send message" },
      { keys: ["⇧", "Enter"], description: "New line in message" },
      { keys: ["↑"], description: "Edit last message" },
      { keys: ["/"], description: "Search in conversation" },
      { keys: ["R"], description: "Reply to message" },
    ],
  },
  {
    title: "Classroom",
    shortcuts: [
      { keys: ["1"], description: "Switch to Overview tab" },
      { keys: ["2"], description: "Switch to Chat tab" },
      { keys: ["3"], description: "Switch to Grades tab" },
      { keys: ["4"], description: "Switch to Sessions tab" },
      { keys: ["J"], description: "Join live session" },
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
    <div className="w-full px-4 sm:px-8 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto">
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
    </div>
  );
}
