import { useEffect, useState } from 'react'
import {
  fetchPersonalMonthly,
  fetchPersonalStreak,
  fetchPersonalTopTasks,
  fetchPersonalWeekly,
} from '../../lib/reports'

function fmtHours(seconds) {
  return (seconds / 3600).toFixed(1) + 'h'
}

function fmtMonth(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function fmtWeek(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function CssBar({ value, max, color = 'var(--brand)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', marginTop: '4px' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
    </div>
  )
}

export function PersonalReport() {
  const [streak, setStreak] = useState(null)
  const [weekly, setWeekly] = useState([])
  const [monthly, setMonthly] = useState([])
  const [topTasks, setTopTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchPersonalStreak(),
      fetchPersonalWeekly(),
      fetchPersonalMonthly(),
      fetchPersonalTopTasks(10),
    ]).then(([s, w, m, t]) => {
      setStreak(s)
      setWeekly(w)
      setMonthly(m)
      setTopTasks(t)
      setLoading(false)
    })
  }, [])

  if (loading) return <p style={{ color: 'var(--ink-soft)', padding: '32px 0' }}>Loading your stats…</p>

  const maxWeekSec = Math.max(...weekly.map((r) => Number(r.total_seconds)), 1)
  const maxMonthSec = Math.max(...monthly.map((r) => Number(r.total_seconds)), 1)
  const maxTaskSec = Math.max(...topTasks.map((r) => Number(r.total_seconds)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Streak badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '10px',
        padding: '14px 20px', borderRadius: '12px',
        background: streak > 0 ? 'var(--brand-tint)' : 'var(--muted)',
        border: `1px solid ${streak > 0 ? '#f9b8be' : 'var(--border)'}`,
        alignSelf: 'flex-start',
      }}>
        <span style={{ fontSize: '1.5rem' }}>{streak > 0 ? '🔥' : '—'}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.3rem', color: streak > 0 ? 'var(--brand)' : 'var(--ink-soft)' }}>
            {streak} day{streak !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>current streak</div>
        </div>
      </div>

      {/* Weekly trend */}
      <div>
        <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: 'var(--charcoal)', fontWeight: 600 }}>
          Weekly trend (last 12 weeks)
        </h3>
        {weekly.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem' }}>No data yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weekly.map((row) => (
              <div key={row.week_start}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--ink-soft)' }}>w/c {fmtWeek(row.week_start)}</span>
                  <span style={{ color: Number(row.total_seconds) > 0 ? 'var(--brand)' : 'var(--ink-soft)', fontWeight: 600 }}>
                    {fmtHours(Number(row.total_seconds))}
                  </span>
                </div>
                <CssBar value={Number(row.total_seconds)} max={maxWeekSec} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly trend */}
      <div>
        <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: 'var(--charcoal)', fontWeight: 600 }}>
          Monthly trend (last 12 months)
        </h3>
        {monthly.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem' }}>No data yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {monthly.map((row) => (
              <div key={row.month_start}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--ink-soft)' }}>{fmtMonth(row.month_start)}</span>
                  <span style={{ color: Number(row.total_seconds) > 0 ? 'var(--brand)' : 'var(--ink-soft)', fontWeight: 600 }}>
                    {fmtHours(Number(row.total_seconds))}
                  </span>
                </div>
                <CssBar value={Number(row.total_seconds)} max={maxMonthSec} color="var(--leaf)" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top tasks */}
      <div>
        <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: 'var(--charcoal)', fontWeight: 600 }}>
          Top tasks (all time)
        </h3>
        {topTasks.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem' }}>No data yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topTasks.map((row, i) => (
              <div key={row.task_label} style={{
                padding: '12px 14px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--card)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: i < 3 ? 'var(--brand)' : 'var(--border)',
                      color: i < 3 ? '#fff' : 'var(--ink-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.task_label}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--brand)', flexShrink: 0, marginLeft: '8px' }}>
                    {fmtHours(Number(row.total_seconds))}
                  </span>
                </div>
                <CssBar value={Number(row.total_seconds)} max={maxTaskSec} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
