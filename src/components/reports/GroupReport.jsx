import { useEffect, useState } from 'react'
import { fetchGroupLeaderboard, fetchGroupTaskBreakdown } from '../../lib/reports'

function fmtHours(seconds) {
  return (Number(seconds) / 3600).toFixed(1) + 'h'
}

function CssBar({ value, max, color = 'var(--brand)' }) {
  const pct = max > 0 ? Math.round((Number(value) / max) * 100) : 0
  return (
    <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '6px' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
    </div>
  )
}

export function GroupReport({ groupId }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    Promise.all([
      fetchGroupLeaderboard(groupId),
      fetchGroupTaskBreakdown(groupId),
    ]).then(([lb, tb]) => {
      setLeaderboard(lb)
      setTasks(tb)
      setLoading(false)
    })
  }, [groupId])

  if (!groupId) return (
    <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem' }}>Select a group to see its report.</p>
  )

  if (loading) return <p style={{ color: 'var(--ink-soft)' }}>Loading group stats…</p>

  const maxLbSec = Math.max(...leaderboard.map((r) => Number(r.total_seconds)), 1)
  const maxTaskSec = Math.max(...tasks.map((r) => Number(r.total_seconds)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Leaderboard */}
      <div>
        <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: 'var(--charcoal)', fontWeight: 600 }}>
          Leaderboard — this week
        </h3>
        {leaderboard.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem' }}>No entries logged this week.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leaderboard.map((row, i) => (
              <div key={row.user_id} style={{
                padding: '14px 16px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--card)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#F5A623' : i === 1 ? '#9B9B9B' : i === 2 ? '#CD7F32' : 'var(--border)',
                    color: i < 3 ? '#fff' : 'var(--ink-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--charcoal)', fontSize: '0.95rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.nickname}
                  </span>
                  <span style={{ fontWeight: 700, color: Number(row.total_seconds) > 0 ? 'var(--brand)' : 'var(--ink-soft)', flexShrink: 0, fontSize: '0.95rem' }}>
                    {fmtHours(row.total_seconds)}
                  </span>
                </div>
                <CssBar value={row.total_seconds} max={maxLbSec} color={i === 0 ? '#F5A623' : 'var(--brand)'} />
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: '6px' }}>
                  {row.entry_count} session{row.entry_count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task breakdown */}
      <div>
        <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: 'var(--charcoal)', fontWeight: 600 }}>
          Time per task — this week
        </h3>
        {tasks.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem' }}>No entries logged this week.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map((row) => (
              <div key={row.task_label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                    {row.task_label}
                  </span>
                  <div style={{ display: 'flex', gap: '12px', flexShrink: 0, marginLeft: '8px' }}>
                    <span style={{ color: 'var(--ink-soft)', fontSize: '0.78rem' }}>
                      {row.contributor_count} contributor{row.contributor_count !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
                      {fmtHours(row.total_seconds)}
                    </span>
                  </div>
                </div>
                <CssBar value={row.total_seconds} max={maxTaskSec} color="var(--leaf)" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
