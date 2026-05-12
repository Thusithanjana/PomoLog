export function BreakFinishedModal({ onResumeNow, onResumeLater }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="break-finished-title"
      >
        <h2 id="break-finished-title">Break Finished</h2>
        <p className="break-message">
          Your break is over. Resume the same task now?
        </p>

        <div className="break-options">
          <button type="button" onClick={onResumeNow}>
            Resume Task
          </button>
          <button type="button" className="ghost" onClick={onResumeLater}>
            Resume Later
          </button>
        </div>
      </div>
    </div>
  )
}
