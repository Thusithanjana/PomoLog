export function BreakModal({ onShortBreak, onLongBreak, onSkip, onContinue }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="break-title"
      >
        <h2 id="break-title">🍅 Pomodoro Complete!</h2>
        <p className="break-message">You've completed a 25-minute focus session.</p>

        <div className="break-options">
          <button type="button" onClick={onShortBreak}>
            ☕ Short Break (5 min)
          </button>
          <button type="button" onClick={onLongBreak}>
            🌳 Long Break (45 min)
          </button>
          <button type="button" className="ghost" onClick={onSkip}>
            ⏭️ Skip Break
          </button>
        </div>

        <div className="break-footer">
          <button
            type="button"
            className="ghost"
            onClick={onContinue}
            style={{ fontSize: '12px' }}
          >
            Continue Without Break
          </button>
        </div>
      </div>
    </div>
  )
}
