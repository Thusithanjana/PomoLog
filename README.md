# PromoLog

PromoLog is a React-based work logging app that tracks tasks and calls with live durations and Pomodoro timer integration.

## Features

- **Task & Call Tracking**: Start and stop task timers independently or track calls
- **Live Duration Updates**: Real-time duration display while tasks/calls are active
- **Pomodoro Timer** (default, optional):
  - 25-minute focus sessions
  - Break selection: 5-minute short break or 45-minute long break
  - Automatic pause when timer completes
  - Resume task manually after break
  - Break time is tracked and logged separately
  - Duration breakdown shows: Focus time | Break time | Total time
  - **Alarm Notification**: Audio beep when session completes
  - **Mobile Vibration**: Device vibration when timer rings (mobile browsers)
  - **Browser Notification**: Optional desktop notification with task name
- **Session Management**: Edit task descriptions in-app
- **Persistence**: Session persistence using sessionStorage (survives page refresh)
- **CSV Export**: Export all task logs to CSV for analysis
- **Concurrent Task Awareness**: Multiple tasks can run, with warning notifications
- **Responsive Design**: Works on desktop and mobile

## Getting Started

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
```

## Architecture

- **Components**: Modular React components for header, controls, task table, timers, and modals
- **Hooks**: Custom hooks for task management, timer logic, and time calculations
- **State Management**: React useReducer for centralized task state
- **Utilities**: Reusable functions for time formatting, CSV generation, and Pomodoro calculations

## Usage

1. Enter a task description
2. Toggle "🍅 Pomodoro Timer" on/off (default: on)
3. Click "Start Task" to begin
4. When the 25-minute focus session completes, choose a break:
   - ☕ Short Break (5 min)
   - 🌳 Long Break (45 min)
   - ⏭️ Skip Break (start another Pomodoro)
5. After break ends or skip, manually resume the task
6. Task logs show focus/break breakdown for Pomodoro tasks
7. Export logs to CSV anytime

## Keyboard/Interaction Tips

- Edit task descriptions by clicking "Edit" in the table
- Tasks can run concurrently; you'll get a warning when starting a new task while one is active
- Session data is auto-saved and restored on page refresh

