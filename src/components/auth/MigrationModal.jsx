export function MigrationModal({ onMigrate, onDiscard, migrating }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="migrate-title">
        <h2 id="migrate-title">Move local data to your account?</h2>
        <p className="break-message">
          You have task data saved locally in this browser from today. Would you like
          to move it to your account so it syncs across devices?
        </p>
        <p className="break-message" style={{ fontSize: '13px' }}>
          If you discard it, your local sessions will be lost and your account will
          start fresh for today.
        </p>

        <div className="break-options">
          <button type="button" onClick={onMigrate} disabled={migrating}>
            {migrating ? 'Moving…' : 'Move to my account'}
          </button>
          <button type="button" className="ghost" onClick={onDiscard} disabled={migrating}>
            Discard local data
          </button>
        </div>
      </div>
    </div>
  )
}
