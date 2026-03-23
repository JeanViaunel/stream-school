export type Theme = "light" | "dark" | "system";

export interface AppSettings {
  desktopNotifications: boolean;
  messagePreview: boolean;
  messageSounds: boolean;
  callSounds: boolean;
  readReceipts: boolean;
  typingIndicators: boolean;
  compactMode: boolean;
  animations: boolean;
  theme: Theme;
}

export const DEFAULT_SETTINGS: AppSettings = {
  desktopNotifications: true,
  messagePreview: true,
  messageSounds: true,
  callSounds: true,
  readReceipts: true,
  typingIndicators: true,
  compactMode: false,
  animations: true,
  theme: "system",
};

const STORAGE_KEY = "appSettings";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Play a short notification beep using the Web Audio API */
export function playMessageBeep(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch {
    // AudioContext not available
  }
}

/** Start a repeating ringtone. Returns a stop function. */
export function startRingtone(): () => void {
  let stopped = false;
  let ctx: AudioContext | null = null;

  function ring() {
    if (stopped) return;
    try {
      ctx = new AudioContext();
      const schedule = (freq: number, start: number, dur: number) => {
        const osc = ctx!.createOscillator();
        const gain = ctx!.createGain();
        osc.connect(gain);
        gain.connect(ctx!.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx!.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3, ctx!.currentTime + start + 0.02);
        gain.gain.setValueAtTime(0.3, ctx!.currentTime + start + dur - 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx!.currentTime + start + dur);
        osc.start(ctx!.currentTime + start);
        osc.stop(ctx!.currentTime + start + dur);
      };
      schedule(880, 0, 0.18);
      schedule(880, 0.22, 0.18);
      setTimeout(() => {
        ctx?.close();
        if (!stopped) setTimeout(ring, 1200);
      }, 700);
    } catch {
      // AudioContext not available
    }
  }

  ring();

  return () => {
    stopped = true;
    ctx?.close().catch(() => {});
  };
}
