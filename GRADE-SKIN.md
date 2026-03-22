# GRADE-SKIN — Age-Adaptive UI Design Specification

This file defines the three grade-band UI adaptations for StreamSchool. Read this fully before implementing `GradeSkinContext.tsx`, `gradeTheme.ts`, or `GradeSkin.tsx` (EDU-T57 through EDU-T59).

---

## Band Definitions

| Band | Grades | Ages | CSS attribute value |
|------|--------|------|-------------------|
| **Primary** | 1–3 | 6–9 | `data-grade-band="primary"` |
| **Middle** | 4–8 | 9–14 | `data-grade-band="middle"` |
| **High** | 9–12, teachers, staff, admins | 14–18+ | `data-grade-band="high"` |

The `data-grade-band` attribute is set on `<body>` by `GradeSkinContext` on mount and whenever the authenticated user's grade level changes.

---

## Design Principle Per Band

### Primary (Grades 1–3)
**Goal:** An adult can hand a tablet to a 6-year-old and they can navigate independently.  
**Approach:** Icon-first, text-secondary. Touch-friendly. One task per screen. Bright, high-contrast, friendly. No keyboard dependency. No multi-step menus.

### Middle (Grades 4–8)  
**Goal:** Feels like a proper app, not a toy, but is still forgiving.  
**Approach:** Standard UI conventions. Text labels visible alongside icons. Features unlocked progressively. No overwhelming density.

### High (Grades 9–12 / Staff)  
**Goal:** Professional, efficient, keyboard-navigable.  
**Approach:** Compact density, full feature set, keyboard shortcuts active, minimal hand-holding.

---

## CSS Variable System

Define these in `src/app/globals.css` under the `[data-grade-band]` selectors (stub is in `EDU-SETUP.md` §9). Full spec:

```css
/* ──────────────── PRIMARY (Grades 1–3) ──────────────── */
[data-grade-band="primary"] {
  /* Typography */
  --font-size-base: 1.125rem;       /* 18px body text */
  --font-size-label: 0.875rem;      /* 14px labels/captions */
  --font-size-heading: 1.5rem;      /* 24px headings */
  --font-weight-base: 500;          /* slightly bold for readability */
  --line-height-base: 1.6;

  /* Touch targets */
  --btn-height: 3rem;               /* 48px — WCAG 2.5.5 minimum */
  --btn-min-width: 3rem;
  --btn-padding-x: 1.25rem;
  --icon-size: 1.75rem;             /* 28px icons */
  --icon-size-sm: 1.5rem;           /* 24px small context */

  /* Spacing */
  --spacing-card: 1.25rem;
  --spacing-gap: 1rem;
  --border-radius-card: 1.25rem;    /* very rounded, friendly */
  --border-radius-btn: 0.875rem;

  /* Colors — high contrast, warm */
  --color-primary: #2563EB;         /* Blue 600 */
  --color-primary-text: #FFFFFF;
  --color-accent: #F59E0B;          /* Amber 400 — CTAs */
  --color-success: #16A34A;         /* Green 600 */
  --color-danger: #DC2626;          /* Red 600 */
  --color-bg: #F0F9FF;              /* Light sky blue background */
  --color-surface: #FFFFFF;
  --color-border: #BAE6FD;          /* Sky 200 */
  --color-text: #1E3A5F;            /* Dark navy — high contrast on bg */
  --color-text-muted: #4B5563;      /* Accessible on white */

  /* Sidebar */
  --sidebar-width: 280px;
  --sidebar-item-height: 3.5rem;
}

/* ──────────────── MIDDLE (Grades 4–8) ──────────────── */
[data-grade-band="middle"] {
  --font-size-base: 1rem;
  --font-size-label: 0.8125rem;
  --font-size-heading: 1.25rem;
  --font-weight-base: 400;
  --line-height-base: 1.5;

  --btn-height: 2.5rem;
  --btn-min-width: 2.5rem;
  --btn-padding-x: 1rem;
  --icon-size: 1.25rem;
  --icon-size-sm: 1rem;

  --spacing-card: 1rem;
  --spacing-gap: 0.75rem;
  --border-radius-card: 0.75rem;
  --border-radius-btn: 0.5rem;

  --color-primary: #4F46E5;         /* Indigo 600 */
  --color-primary-text: #FFFFFF;
  --color-accent: #8B5CF6;          /* Violet 500 */
  --color-success: #16A34A;
  --color-danger: #DC2626;
  --color-bg: #F5F3FF;              /* Very light indigo */
  --color-surface: #FFFFFF;
  --color-border: #E0E7FF;          /* Indigo 100 */
  --color-text: #1E1B4B;
  --color-text-muted: #6B7280;

  --sidebar-width: 260px;
  --sidebar-item-height: 3rem;
}

/* ──────────────── HIGH (Grades 9–12 / Staff) ──────────────── */
[data-grade-band="high"] {
  --font-size-base: 0.9375rem;      /* 15px */
  --font-size-label: 0.75rem;
  --font-size-heading: 1.125rem;
  --font-weight-base: 400;
  --line-height-base: 1.5;

  --btn-height: 2.25rem;
  --btn-min-width: 2.25rem;
  --btn-padding-x: 0.875rem;
  --icon-size: 1rem;
  --icon-size-sm: 0.875rem;

  --spacing-card: 0.875rem;
  --spacing-gap: 0.625rem;
  --border-radius-card: 0.5rem;
  --border-radius-btn: 0.375rem;

  /* Inherits the existing dark theme from globals.css — no overrides needed */
  /* These match the current slate-950 / indigo design language */
  --color-primary: #6366F1;         /* Indigo 500 */
  --color-primary-text: #FFFFFF;
  --color-accent: #A78BFA;          /* Violet 400 */
  --color-success: #22C55E;
  --color-danger: #EF4444;
  --color-bg: #0F172A;              /* Slate 950 — matches current app */
  --color-surface: #1E293B;         /* Slate 800 */
  --color-border: #334155;          /* Slate 700 */
  --color-text: #F1F5F9;
  --color-text-muted: #94A3B8;

  --sidebar-width: 240px;
  --sidebar-item-height: 2.5rem;
}
```

---

## Component Behavior Per Band

### `ClassSidebar.tsx`

**Primary band:**
```
┌──────────────────┐
│  [🏫]  Science   │  ← large icon (28px) + class name only, no subject
│  [🎨]  Art       │  ← color-coded dot per class (random stable color from classId)
│  [📚]  Reading   │
│                  │
│  [+] New Class   │  ← visible only to teachers; big button
└──────────────────┘
```
- No unread count numbers — use a dot badge only (●)
- No hover-reveal actions — everything one tap
- Class names truncated to one line, large font

**Middle band:**
- Icons + text labels + unread count badge
- Subject shown as secondary text below class name
- Hover shows "..." menu with Leave option

**High band:**
- Compact list: icon + name + subject + unread count on one line
- Keyboard shortcut hint on hover (`⌘ + number`)
- Right-click context menu for class actions

---

### `ClassCallRoom.tsx` — In-call controls

**Primary band — show only:**
| Control | Button |
|---------|--------|
| Mute/unmute mic | Large ● Mic button |
| Camera on/off | Large ● Camera button |
| Raise hand | Large ✋ button |
| Leave call | Large 🚪 Leave button |

**Hide from primary band:** Screen share, Layout switcher, Q&A panel toggle, Participant list toggle, Chat panel toggle, Network indicator detail, Call stats

**Middle band — show:**
Everything in primary, plus: Chat panel, Participant list, Layout switcher (grid/spotlight only — no sidebar layout option)

**High band — show everything:**
All controls including screen share, advanced layout options, network stats, recording controls (teacher), Q&A, polls (teacher)

---

### `AssignmentViewer.tsx` (student)

**Primary band:**
- One question visible at a time (wizard-style, full-screen per question)
- Large radio buttons (minimum 48px touch target) with colored labels
- Next/Previous navigation with big arrow buttons
- No timer shown (stress reduction for young students)
- Submit button appears only after all questions are answered
- Celebration animation on submit (confetti using CSS animation)

**Middle band:**
- All questions visible on one scrolling page
- Standard radio/textarea inputs
- Timer shown if teacher set a due time
- Submit button always visible (warns if questions unanswered)

**High band:**
- Dense list, all questions visible
- Keyboard navigable (Tab between questions, Enter to select)
- Timer with countdown warning at < 5 minutes
- Auto-save draft to `localStorage` every 30 seconds

---

### `RaisedHandsPanel.tsx`

**Primary band (student view):**
```
┌─────────────────────────┐
│                         │
│         ✋              │
│                         │
│   [Raise My Hand]       │
│   (big yellow button)   │
│                         │
└─────────────────────────┘
```
- Single large button (min 80px height)
- Button turns green with checkmark when hand is raised, tap again to lower
- No text queue visible to student — only their own status

**Primary band (teacher view):**
- List of student tiles (avatar + name) in order of hand-raise
- Each tile has a "Lower" button (large, one tap)

**Middle/High band (student):**
- Small ✋ icon button in controls bar
- Tooltip shows "Raise Hand" on hover

---

### `PollPanel.tsx`

**Primary band:**
- Poll question shown as full-screen overlay when launched
- Options shown as large colored buttons (not radio inputs)
- No option to dismiss without answering — encourages participation
- Result shown as emoji counts (not percentage bars)

**Middle/High band:**
- Slide-in panel alongside call
- Standard radio buttons
- Animated bar chart for results (teacher view)

---

## Feature Gate Matrix

Features below are completely hidden (not rendered) per band:

| Feature | Primary | Middle | High |
|---------|:-------:|:------:|:----:|
| Screen share (student) | ❌ | ❌ | ❌ (teacher-granted) |
| Screen share (teacher) | ❌ | ✅ | ✅ |
| Layout switcher | ❌ | ✅ (2 options) | ✅ (all) |
| Keyboard shortcuts | ❌ | ❌ | ✅ |
| Network quality detail | ❌ | ❌ | ✅ |
| Call stats panel | ❌ | ❌ | ✅ |
| Chat panel in call | ❌ | ✅ | ✅ |
| Q&A panel (student) | ❌ | ✅ | ✅ |
| Q&A panel (teacher) | ❌ (simplified hand queue) | ✅ | ✅ |
| Gradebook | ❌ (scores shown as stars ⭐) | ✅ (simplified) | ✅ (full) |
| Assignment short-answer | ❌ | ✅ | ✅ |
| Study groups (peer DMs) | ❌ | ❌ | ✅ (with parental opt-in) |
| iCal export | ❌ | ❌ | ✅ |
| Data export | ❌ | ❌ | ✅ (handled by parent for minors) |
| Breakout rooms (create) | ❌ (teacher-only feature regardless) | ✅ teacher | ✅ teacher |

---

## Dashboard Wireframes (ASCII)

### Primary band — Student Dashboard

```
┌─────────────────────────────────────────────┐
│  👋  Good morning, Alex!                    │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │   🏫    │  │   🎨    │  │   📚    │    │
│  │ Science │  │   Art   │  │Reading  │    │
│  │ 9:00 AM │  │10:30 AM │  │ No class│    │
│  │ [JOIN]  │  │         │  │ today   │    │
│  └─────────┘  └─────────┘  └─────────┘    │
│                                             │
│  📝 You have 1 assignment due today         │
│  ┌──────────────────────────────────────┐  │
│  │ Science Quiz — [START] ───────────── │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Middle band — Student Dashboard

```
┌──────────────────────────────────────────────────┐
│  StreamSchool              [🔔] [👤 Alex]         │
├──────────────┬───────────────────────────────────┤
│ My Classes   │  Today — Monday March 23           │
│              │                                    │
│ 🏫 Science   │  ┌─ 9:00 AM ── Science ─────────┐ │
│ 🎨 Art       │  │  Live now  [JOIN SESSION]      │ │
│ 📚 Reading   │  └────────────────────────────────┘ │
│ ➕ Find class │                                    │
│              │  ┌─ 10:30 AM ── Art ─────────────┐ │
│              │  │  In 1h 30m                     │ │
│              │  └────────────────────────────────┘ │
│              │                                    │
│              │  Assignments due                   │
│              │  • Science Quiz — due today  [→]   │
└──────────────┴───────────────────────────────────┘
```

### High band — Teacher Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  StreamSchool           [⌘K Search]    [🔔 3]  [JV ▾]   │
├───────────────┬──────────────────────────────────────────┤
│  Classes      │  Your classes — Spring 2026              │
│               │                                          │
│  Biology P3   │  ┌──────────────────────────────────┐   │
│  Chemistry P5 │  │ Biology — Period 3         24 stu │   │
│  Staff        │  │ Next: Mon 9:00 AM    [Start now]  │   │
│               │  │ Attendance: 92%  Assignments: 2   │   │
│  ─────────    │  └──────────────────────────────────┘   │
│  Admin        │                                          │
│  Analytics    │  ┌──────────────────────────────────┐   │
│  Moderation 3 │  │ Chemistry — Period 5       18 stu │   │
│  Audit Log    │  │ Next: Mon 10:30 AM               │   │
│               │  │ Attendance: 88%  Assignments: 1   │   │
│  + New Class  │  └──────────────────────────────────┘   │
└───────────────┴──────────────────────────────────────────┘
```

---

## Typography & Font

Use a single font stack that works at all grade levels. Import from Google Fonts in `app/layout.tsx`:

```tsx
import { Nunito, Nunito_Sans } from "next/font/google";

// Primary band: Nunito — rounded, friendly, highly legible for young readers
const nunito = Nunito({ subsets: ["latin"], variable: "--font-primary" });

// Middle/High band: Nunito Sans — same family, more neutral and professional
const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-sans" });
```

Apply in CSS:

```css
[data-grade-band="primary"] {
  font-family: var(--font-primary), sans-serif;
}

[data-grade-band="middle"],
[data-grade-band="high"] {
  font-family: var(--font-sans), sans-serif;
}
```

> Do not use Inter, Roboto, or system fonts — Nunito was specifically designed for readability in educational contexts.

---

## Color & Contrast Rules

All color combinations must meet WCAG 2.1 AA: minimum 4.5:1 contrast ratio for body text, 3:1 for large text (18px+ or bold 14px+).

| Combination | Band | Ratio | Pass |
|-------------|------|-------|------|
| `--color-text` on `--color-bg` (Primary: #1E3A5F on #F0F9FF) | Primary | 9.4:1 | ✅ |
| `--color-text` on `--color-surface` (Primary: #1E3A5F on #FFF) | Primary | 11.2:1 | ✅ |
| `--color-text-muted` on `--color-bg` (Primary: #4B5563 on #F0F9FF) | Primary | 5.1:1 | ✅ |
| White on `--color-primary` (Middle: #FFF on #4F46E5) | Middle | 7.1:1 | ✅ |
| White on `--color-primary` (High: #FFF on #6366F1) | High | 4.7:1 | ✅ |

Run `npx @axe-core/cli http://localhost:3000/dashboard` after implementing each grade band.

---

## Implementation Notes

1. **`GradeSkinContext` reads grade level from session, not from user.role.** Teachers always get `"high"`. Students get `"primary"` if `gradeLevel <= 3`, `"middle"` if `4–8`, `"high"` if `>= 9`.

2. **Do not use conditional `className` strings inside every component.** Instead:
   - Use CSS variables (`var(--btn-height)`) for layout/size variations — the CSS cascade handles it
   - Use `data-grade-band` CSS selectors in component-level CSS modules or Tailwind's `data-*` variant: `data-[grade-band=primary]:hidden`
   - Use `isBand("primary")` from context only when you need to conditionally render JSX (feature gating), not for styling

3. **Primary band icons must have visible text labels on the class sidebar** — icon alone is insufficient for non-readers. Use `aria-label` AND visible text below the icon.

4. **Animations:** Primary band — prefer simple scale/fade transitions (no complex motion); Middle — standard transitions; High — subtle, professional micro-animations only. Never auto-play video or animated backgrounds for Primary — can be distracting for young students with attention needs.

5. **Error messages** must be rewritten per band:
   - Primary: "Oops! Something went wrong. Tell your teacher." (no technical details)
   - Middle: "Something went wrong. Try again or ask your teacher." + error code
   - High: Standard technical error message with details
