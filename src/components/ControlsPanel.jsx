export function ControlsPanel({
  description,
  onDescriptionChange,
  onToggleTask,
  onTakeBreak,
  onResumeDuringBreak,
  onToggleCall,
  onSaveCsv,
  isTaskRunning,
  isCallRunning,
  canTakeBreak,
  canResumeDuringBreak,
  usePomodo,
  onTogglePomodo,
  pomodoroFocusMinutes,
  onPomodoroFocusMinutesChange,
}) {
  return (
    <div className="controls">
      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="What are you working on?"
          disabled={isTaskRunning}
        />
      </div>

      <div className="pomodo-toggle">
        <label htmlFor="pomodo-checkbox">
          <input
            id="pomodo-checkbox"
            type="checkbox"
            checked={usePomodo}
            onChange={(event) => onTogglePomodo(event.target.checked)}
            disabled={isTaskRunning}
          />
          <span>Pomodoro Timer ({pomodoroFocusMinutes} min focus)</span>
        </label>
      </div>

      <div className="pomodo-config">
        <label htmlFor="pomodoro-focus-minutes">Focus Minutes</label>
        <input
          id="pomodoro-focus-minutes"
          type="number"
          min={1}
          max={180}
          step={1}
          value={pomodoroFocusMinutes}
          onChange={(event) => onPomodoroFocusMinutesChange(event.target.value)}
          disabled={isTaskRunning || !usePomodo}
        />
      </div>

      <div className="row">
        <div className="left">
          <button
            type="button"
            className="secondary"
            onClick={onSaveCsv}
            title="Download the table as a CSV file"
          >
            Save as CSV
          </button>
        </div>

        <div className="right">
          {canTakeBreak && (
            <button type="button" className="ghost" onClick={onTakeBreak}>
              Take Break
            </button>
          )}

          {canResumeDuringBreak && (
            <button type="button" className="ghost" onClick={onResumeDuringBreak}>
              Resume Task
            </button>
          )}

          <button
            type="button"
            className={isTaskRunning ? 'running' : ''}
            onClick={onToggleTask}
          >
            {isTaskRunning ? 'Stop Task' : 'Start Task'}
          </button>

          <button
            type="button"
            className={isCallRunning ? 'active' : ''}
            id="callBtn"
            onClick={onToggleCall}
          >
            {isCallRunning ? 'Hang Up' : 'Call'}
          </button>
        </div>
      </div>

      <div className="hint">
        The app saves your table in this browser session automatically.
      </div>
    </div>
  )
}
