import { useCallback, useEffect, useState } from 'react'
import { POMODORO_PRESETS } from '../utils/pomodoro'

export function usePomodoroTimer(isTaskRunning, onBreakRequired) {
  const [timeRemaining, setTimeRemaining] = useState(POMODORO_PRESETS.FOCUS)
  const [isBreakTime, setIsBreakTime] = useState(false)
  const [breakDuration, setBreakDuration] = useState(null)
  const [hasCompleted, setHasCompleted] = useState(false)

  // Main timer countdown
  useEffect(() => {
    if (!isTaskRunning) return undefined

    const intervalId = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1000

        if (next <= 0) {
          // Timer complete
          setHasCompleted(true)
          if (onBreakRequired) {
            onBreakRequired(isBreakTime)
          }
          return 0
        }

        return next
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [isTaskRunning, isBreakTime, onBreakRequired])

  const selectBreak = useCallback((breakType) => {
    setIsBreakTime(true)
    const duration = breakType === 'short' ? POMODORO_PRESETS.SHORT_BREAK : POMODORO_PRESETS.LONG_BREAK
    setBreakDuration({
      type: breakType,
      ms: duration,
    })
    setTimeRemaining(duration)
    setHasCompleted(false)
  }, [])

  const skipBreak = useCallback(() => {
    // Start another focus session
    setIsBreakTime(false)
    setBreakDuration(null)
    setTimeRemaining(POMODORO_PRESETS.FOCUS)
    setHasCompleted(false)
  }, [])

  const resetTimer = useCallback(() => {
    setTimeRemaining(POMODORO_PRESETS.FOCUS)
    setIsBreakTime(false)
    setBreakDuration(null)
    setHasCompleted(false)
  }, [])

  return {
    timeRemaining,
    isBreakTime,
    breakDuration,
    hasCompleted,
    selectBreak,
    skipBreak,
    resetTimer,
  }
}
