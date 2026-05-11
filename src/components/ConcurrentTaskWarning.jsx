export function ConcurrentTaskWarning({
  runningTaskDescription,
  onPauseAndStart,
  onStopAndStart,
  onCancel,
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="concurrent-title"
      >
        <h2 id="concurrent-title">⚠️ Task Already Running</h2>
        <p className="break-message">
          You have an active task: <strong>{runningTaskDescription || 'Unnamed'}</strong>
        </p>
        <p className="break-message" style={{ fontSize: '13px' }}>
          What would you like to do?
        </p>

        <div className="break-options">
          <button type="button" onClick={onPauseAndStart}>
            ⏸️ Pause Current & Start New
          </button>
          <button type="button" className="danger" onClick={onStopAndStart}>
            ⏹️ Stop Current & Start New
          </button>
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
