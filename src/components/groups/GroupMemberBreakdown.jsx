export function GroupMemberBreakdown({ displayName, totalSeconds, byTask }) {
  const totalHours = (totalSeconds / 3600).toFixed(1)
  const sortedTasks = Object.entries(byTask).sort((a, b) => b[1] - a[1])

  return (
    <div style={{
      padding: '18px 20px', marginBottom: '0',
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: sortedTasks.length ? '10px' : 0 }}>
        <span style={{ fontWeight: 600, color: 'var(--charcoal)', fontSize: '0.95rem' }}>{displayName}</span>
        <span style={{
          fontSize: '0.85rem', fontWeight: 600,
          color: totalSeconds > 0 ? 'var(--brand)' : 'var(--ink-soft)',
        }}>
          {totalHours}h this week
        </span>
      </div>

      {sortedTasks.length === 0 && (
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.82rem', margin: 0 }}>No entries this week.</p>
      )}

      {sortedTasks.map(([label, secs]) => {
        const pct = totalSeconds > 0 ? Math.round((secs / totalSeconds) * 100) : 0
        return (
          <div key={label} style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '3px' }}>
              <span style={{ color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '72%' }}>
                {label}
              </span>
              <span style={{ color: 'var(--ink-soft)', flexShrink: 0, marginLeft: '8px' }}>
                {(secs / 3600).toFixed(1)}h
              </span>
            </div>
            <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand)', borderRadius: '2px', opacity: 0.6 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
