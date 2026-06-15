import { useEffect, useState } from 'react'
import { fetchGroupLeaderboard, fetchGroupTaskBreakdown } from '../../lib/reports'

function fmtHours(seconds) {
  return (Number(seconds) / 3600).toFixed(1) + 'h'
}

const LABEL = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px',
  textTransform: 'uppercase', color: 'var(--ink-soft)',
}

function CssBar({ value, max, color = 'var(--brand)' }) {
  const pct = max > 0 ? Math.round((Number(value) / max) * 100) : 0
  return (
    <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '5px' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
    </div>
  )
}

const MEDAL = ['#F5A623', '#9B9B9B', '#CD7F32']

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
    <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>Select a group to see its report.</p>
  )

  if (loading) return <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>Loading group stats…</p>

  const maxLbSec = Math.max(...leaderboard.map((r) => Number(r.total_seconds)), 1)
  const maxTaskSec = Math.max(...tasks.map((r) => Number(r.total_seconds)), 1)

  return (
    <div style={{ display: 'grid', gap: '20px' }}>

      {/* Leaderboard */}
      <div>
        <div style={{ ...LABEL, marginBottom: '10px' }}>Leaderboard — this week</div>
        {leaderboard.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>No entries logged this week.</p>
        ) : (
          <div style={{ display: 'grid', gap: '6px' }}>
            {leaderboard.map((row, i) => (
              <div key={row.user_id} style={{
                padding: '10px 12px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    background: MEDAL[i] ?? 'var(--border)',
                    color: i < 3 ? '#fff' : 'var(--ink-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.nickname}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: Number(row.total_seconds) > 0 ? 'var(--brand)' : 'var(--ink-soft)', flexShrink: 0 }}>
                    {fmtHours(row.total_seconds)}
                  </span>
                </div>
                <div style={{ paddingLeft: '28px' }}>
                  <CssBar value={row.total_seconds} max={maxLbSec} color={MEDAL[i] ?? 'var(--brand)'} />
                  <span style={{ fontSize: '11px', color: 'var(--ink-soft)', display: 'block', marginTop: '4px' }}>
                    {row.entry_count} session{row.entry_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task breakdown */}
      <div>
        <div style={{ ...LABEL, marginBottom: '10px' }}>Time per task — this week</div>
        {tasks.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>No entries logged this week.</p>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {tasks.map((row) => (
              <div key={row.task_label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'baseline' }}>
                  <span style={{ color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                    {row.task_label}
                  </span>
                  <div style={{ display: 'flex', gap: '12px', flexShrink: 0, marginLeft: '8px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 500 }}>
                      {row.contributor_count} contributor{row.contributor_count !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--leaf)' }}>
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
