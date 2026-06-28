import { durationBetween, fmtTime } from '../utils/time'
import { formatPomodoroStats } from '../utils/pomodoro'
import { msToMMSS } from '../utils/pomodoro'

export function TaskTable({
  rows,
  totalCount,
  runningId,
  runningCallId,
  nowMs,
  onEdit,
  onDelete,
  onResume,
  isAnyRunning,
  breakTaskId,
  isBreakTime,
  breakTimeRemaining,
}) {
  return (
    <div className="table-wrap">
      <table aria-label="Task log table">
        <thead>
          <tr>
            <th style={{ width: 48 }}>No</th>
            <th>Description</th>
            <th className="nowrap">Start Time</th>
            <th className="nowrap">End Time</th>
            <th className="nowrap">Duration</th>
            <th style={{ width: 160 }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((task, index) => {
            const no = totalCount - index
            const isLive =
              !task.endISO && (task.id === runningId || task.id === runningCallId)
            const isOnBreak = isBreakTime && task.id === breakTaskId
            const duration = durationBetween(
              task.startISO,
              isLive ? null : task.endISO,
              nowMs,
            )

            // Show Pomodoro stats breakdown if applicable
            const pomodoroStats = formatPomodoroStats(task)
            const displayDuration = pomodoroStats
              ? `Focus: ${pomodoroStats.focus}m | Breaks: ${pomodoroStats.breaks}m | Total: ${pomodoroStats.total}m`
              : duration

            const isRunning = task.id === runningId || task.id === runningCallId
          const isCall = task.description === 'Call -'
          const isStopped = Boolean(task.endISO) && !isRunning
          const canResume = isStopped && !isCall && !isAnyRunning

          return (
              <tr key={task.id} className={isOnBreak ? 'break-row' : ''}>
                <td>{no}</td>
                <td>
                  {task.description || ''}
                  {isOnBreak && <span className="break-pill">On break</span>}
                </td>
                <td>{fmtTime(task.startISO)}</td>
                <td>{fmtTime(task.endISO)}</td>
                <td className="nowrap">
                  {isOnBreak
                    ? `Break: ${msToMMSS(breakTimeRemaining)} left`
                    : displayDuration}
                </td>
                <td className="actions-cell">
                  <div className="table-actions">
                    <button
                      type="button"
                      className="table-action"
                      onClick={() => onEdit(task.id)}
                    >
                      Edit
                    </button>
                    {canResume && (
                      <button
                        type="button"
                        className="table-action resume"
                        onClick={() => onResume(task.id)}
                      >
                        Resume
                      </button>
                    )}
                    {isStopped && (
                      <button
                        type="button"
                        className="table-action delete"
                        onClick={() => onDelete(task.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
