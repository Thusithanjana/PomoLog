export const POMODORO_PRESETS = {
  FOCUS: 25 * 60 * 1000, // 25 minutes
  SHORT_BREAK: 5 * 60 * 1000, // 5 minutes
  LONG_BREAK: 45 * 60 * 1000, // 45 minutes
}

export const msToMMSS = (ms) => {
  if (ms == null || ms < 0) return '00:00'

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(minutes)}:${pad(seconds)}`
}

export const createPomodoroSession = () => ({
  startISO: new Date().toISOString(),
  endISO: null,
  breaks: [],
})

export const addBreakToSession = (session, breakType, duration) => {
  return {
    ...session,
    breaks: [
      ...session.breaks,
      {
        type: breakType,
        duration,
        startISO: new Date().toISOString(),
      },
    ],
  }
}

export const getTotalBreakTime = (sessions) => {
  if (!sessions || sessions.length === 0) return 0

  return sessions.reduce((total, session) => {
    const sessionBreakTime = session.breaks.reduce(
      (sum, breakItem) => sum + (breakItem.duration || 0),
      0,
    )
    return total + sessionBreakTime
  }, 0)
}

export const formatPomodoroStats = (task) => {
  if (!task.usePomodo || !task.pomodoroSessions) {
    return null
  }

  const sessions = task.pomodoroSessions
  const totalBreakMs = getTotalBreakTime(sessions)

  // Focus time = total time minus breaks
  const taskDuration = task.endISO
    ? new Date(task.endISO).getTime() - new Date(task.startISO).getTime()
    : Date.now() - new Date(task.startISO).getTime()

  const focusTimeMs = Math.max(0, taskDuration - totalBreakMs)

  const focusMin = Math.floor(focusTimeMs / 60000)
  const breakMin = Math.floor(totalBreakMs / 60000)
  const totalMin = Math.floor(taskDuration / 60000)

  return {
    focus: focusMin,
    breaks: breakMin,
    total: totalMin,
  }
}
