import { useCallback, useEffect, useState } from 'react'
import { POMODORO_PRESETS } from '../utils/pomodoro'

export function usePomodoroTimer(isTaskRunning, onBreakRequired, focusMinutes = 25) {
  const focusDurationMs = Math.max(1, focusMinutes) * 60 * 1000
  const [timeRemaining, setTimeRemaining] = useState(focusDurationMs)
  const [isBreakTime, setIsBreakTime] = useState(false)
  const [breakDuration, setBreakDuration] = useState(null)
  const [hasCompleted, setHasCompleted] = useState(false)

  useEffect(() => {
    if (isTaskRunning || isBreakTime) return
    setTimeRemaining(focusDurationMs)
  }, [focusDurationMs, isTaskRunning, isBreakTime])

  // Main timer countdown
  useEffect(() => {
    if (!isTaskRunning && !isBreakTime) return undefined

    const intervalId = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) return 0

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

  const selectBreak = useCallback((breakType, remainingMs = null) => {
    setIsBreakTime(true)
    const fullDuration = breakType === 'short' ? POMODORO_PRESETS.SHORT_BREAK : POMODORO_PRESETS.LONG_BREAK
    setBreakDuration({
      type: breakType,
      ms: fullDuration,
    })
    setTimeRemaining(remainingMs ?? fullDuration)
    setHasCompleted(false)
  }, [])

  const syncTimer = useCallback((ms) => {
    setTimeRemaining(Math.max(0, ms))
  }, [])

  const skipBreak = useCallback(() => {
    // Start another focus session
    setIsBreakTime(false)
    setBreakDuration(null)
    setTimeRemaining(focusDurationMs)
    setHasCompleted(false)
  }, [focusDurationMs])

  const resetTimer = useCallback(() => {
    setTimeRemaining(focusDurationMs)
    setIsBreakTime(false)
    setBreakDuration(null)
    setHasCompleted(false)
  }, [focusDurationMs])

  return {
    timeRemaining,
    isBreakTime,
    breakDuration,
    hasCompleted,
    selectBreak,
    skipBreak,
    resetTimer,
    syncTimer,
  }
}
