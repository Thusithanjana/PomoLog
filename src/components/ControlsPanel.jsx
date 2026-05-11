export function ControlsPanel({
  description,
  onDescriptionChange,
  onToggleTask,
  onToggleCall,
  onSaveCsv,
  isTaskRunning,
  isCallRunning,
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
