export function BreakModal({
  onShortBreak,
  onLongBreak,
  onSkip,
  onContinue,
  focusMinutes = 25,
  mode = 'auto',
}) {
  const isManual = mode === 'manual'

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="break-title"
      >
        <h2 id="break-title">{isManual ? 'Take a Break' : 'Pomodoro Complete'}</h2>
        <p className="break-message">
          {isManual
            ? 'Pause this task and choose a break length.'
            : `You've completed a ${focusMinutes}-minute focus session.`}
        </p>

        <div className="break-options">
          <button type="button" onClick={onShortBreak}>
            Short Break (5 min)
          </button>
          <button type="button" onClick={onLongBreak}>
            Long Break (45 min)
          </button>
          <button type="button" className="ghost" onClick={onSkip}>
            {isManual ? 'Cancel' : 'Skip Break'}
          </button>
        </div>

        <div className="break-footer">
          <button
            type="button"
            className="ghost"
            onClick={onContinue}
            style={{ fontSize: '12px' }}
          >
            {isManual ? 'Keep Working' : 'Continue Without Break'}
          </button>
        </div>
      </div>
    </div>
  )
}
