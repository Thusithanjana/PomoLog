# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server (Vite, hot reload)
npm run build      # production build → dist/
npm run preview    # preview production build locally
npm run lint       # ESLint check
npm run deploy     # build + push dist/ to GitHub Pages via gh-pages
```

There is no test framework configured in this project.

## Architecture

### Data flow

`App.jsx` is the top-level coordinator. It owns all UI state (modal visibility, `breakTaskId`, `editingTaskId`) and wires three hooks together:

- **`useTaskTimer`** — the only source of task data. Wraps a `useReducer` with all task/call actions and syncs to `localStorage` on every relevant state change.
- **`usePomodoroTimer`** — a self-contained countdown timer. It does not know about tasks; `App.jsx` passes it the active focus minutes and an `onBreakRequired` callback that triggers the break modal.
- **`useNowTicker`** — fires every second while any timer is active; its return value (`nowMs`) is passed into `TaskTable` for live duration display.

The break flow is the most complex interaction: when a Pomodoro completes, `App.jsx` sets `breakTaskId` (the ID of the task that was running), stops the task via `stopTask()`, and calls `pomodoroTimer.selectBreak()`. The timer then counts down the break duration. On resume, `finalizeBreakDuration()` records the actual elapsed break time before calling `resumeTask()`.

### State shape (useTaskTimer)

```js
{
  tasks: Task[],             // append-only; calls are also stored here
  runningId: string | null,
  runningCallId: string | null,
  description: string,
  status: string,            // user-facing status message
  usePomodo: boolean,
  pomodoroFocusMinutes: number,
}
```

### Task data model

```js
{
  id, description, startISO, endISO,
  usePomodo, pomodoroFocusMinutes,
  pomodoroSessions: [{ startISO, endISO, breaks: [{ type, duration, startISO }] }],
  totalBreakTime,  // ms — denormalized sum kept in sync by reducer
}
```

Calls are stored in the same `tasks` array with `description: 'Call -'` and no Pomodoro fields.

### Persistence

Storage key: `taskTimerApp.v1` (defined in `src/constants/storage.js`). Data is scoped to the calendar day — if the stored date doesn't match today, the state resets to empty. Only `tasks`, `runningId`, and `runningCallId` are persisted; settings like `usePomodo` and `pomodoroFocusMinutes` reset on page load.

### Brand colors

The design uses a fixed color palette defined as CSS custom properties in `src/index.css`:

| Variable | Hex | Use |
|---|---|---|
| `--brand` | `#FC0719` | Primary actions, focus timer |
| `--brand-hover` | `#C70414` | Button hover, danger states |
| `--brand-tint` | `#FDE7E9` | Break row tints, focus ring glow |
| `--charcoal` | `#252629` | Body text, secondary buttons |
| `--leaf` | `#238E2F` | Call button, break timer |
| `--ink-soft` | `#5A5C63` | Labels, captions |
| `--border` | `#E4E5E8` | All dividers and input borders |

### Deployment

The Vite base path is `/PomoLog/` (for GitHub Pages). `npm run deploy` runs `vite build` then `gh-pages -d dist`. Do not change the base path without updating `package.json`'s `homepage` field and any asset references.

## Suggested by Claude
This is a Pomodoro time-tracker app. We are adding a Pro tier built on Supabase.

Free tier = solo and local (single-user timer, no account, browser-local data).
Pro tier = anything needing an account: cross-device sync, persistent history, and group-based time tracking.

Stack: [fill in your framework, e.g. React + Vite], Supabase (Postgres + Auth + Realtime).

Hard rules:
- Never commit secrets or Supabase service-role keys. Client uses the anon key only.
- Every new table that holds user data must have Row Level Security enabled with explicit policies before we consider it done.
- Add Postgres CHECK constraints for any numeric input (e.g. session length must be > 0 and under a sane max).
- Prefer Supabase migrations in /supabase/migrations over editing the DB by hand, so schema changes are version-controlled.
- Work in small commits, one logical change at a time.