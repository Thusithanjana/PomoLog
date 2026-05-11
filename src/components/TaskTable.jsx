import { durationBetween, fmtTime } from '../utils/time'
import { formatPomodoroStats } from '../utils/pomodoro'

export function TaskTable({
  rows,
  totalCount,
  runningId,
  runningCallId,
  nowMs,
  onEdit,
  tasks,
}) {
  return (
    <div className="table-wrap">
      <table aria-label="Task log table">
        <thead>
          <tr>
            <th style={{ width: 60 }}>No</th>
            <th>Description</th>
            <th className="nowrap">Start Time</th>
            <th className="nowrap">End Time</th>
            <th className="nowrap">Duration</th>
            <th style={{ width: 140 }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((task, index) => {
            const no = totalCount - index
            const isLive =
              !task.endISO && (task.id === runningId || task.id === runningCallId)
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

            return (
              <tr key={task.id}>
                <td>{no}</td>
                <td>{task.description || ''}</td>
                <td>{fmtTime(task.startISO)}</td>
                <td>{fmtTime(task.endISO)}</td>
                <td className="nowrap">{displayDuration}</td>
                <td>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onEdit(task.id)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
