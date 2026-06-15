import { msToMMSS } from '../utils/pomodoro'

export function PomodoroTimerDisplay({ timeRemaining, isBreakTime }) {
  return (
    <div className={`pomodoro-display ${isBreakTime ? 'pomodoro-break' : 'pomodoro-focus'}`}>
      <div className="pomodoro-label">{isBreakTime ? 'Break' : 'Focus'}</div>
      <div className="pomodoro-time">{msToMMSS(timeRemaining)}</div>
    </div>
  )
}
