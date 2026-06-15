import { useEffect, useState } from 'react'
import {
  fetchPersonalMonthly,
  fetchPersonalStreak,
  fetchPersonalTopTasks,
  fetchPersonalWeekly,
} from '../../lib/reports'

function fmtHours(seconds) {
  return (Number(seconds) / 3600).toFixed(1) + 'h'
}

function fmtMonth(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function fmtWeek(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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

  if (loading) return <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>Loading your stats…</p>

  const maxWeekSec = Math.max(...weekly.map((r) => Number(r.total_seconds)), 1)
  const maxMonthSec = Math.max(...monthly.map((r) => Number(r.total_seconds)), 1)
  const maxTaskSec = Math.max(...topTasks.map((r) => Number(r.total_seconds)), 1)

  return (
    <div style={{ display: 'grid', gap: '20px' }}>

      {/* Streak */}
      <div>
        <div style={{ ...LABEL, marginBottom: '8px' }}>Current streak</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '10px 16px', borderRadius: '8px',
          background: streak > 0 ? 'var(--brand-tint)' : 'var(--muted)',
          border: `1px solid ${streak > 0 ? '#f9b8be' : 'var(--border)'}`,
        }}>
          {streak > 0 && <span style={{ fontSize: '16px', lineHeight: 1 }}>🔥</span>}
          <span style={{ fontSize: '14px', fontWeight: 700, color: streak > 0 ? 'var(--brand)' : 'var(--ink-soft)' }}>
            {streak} day{streak !== 1 ? 's' : ''} in a row
          </span>
        </div>
      </div>

      {/* Weekly trend */}
      <div>
        <div style={{ ...LABEL, marginBottom: '10px' }}>Weekly trend — last 12 weeks</div>
        {weekly.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>No data yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {weekly.map((row) => (
              <div key={row.week_start}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--ink-soft)' }}>w/c {fmtWeek(row.week_start)}</span>
                  <span style={{ fontWeight: 600, color: Number(row.total_seconds) > 0 ? 'var(--brand)' : 'var(--ink-soft)' }}>
                    {fmtHours(row.total_seconds)}
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
        <div style={{ ...LABEL, marginBottom: '10px' }}>Monthly trend — last 12 months</div>
        {monthly.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>No data yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {monthly.map((row) => (
              <div key={row.month_start}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--ink-soft)' }}>{fmtMonth(row.month_start)}</span>
                  <span style={{ fontWeight: 600, color: Number(row.total_seconds) > 0 ? 'var(--leaf)' : 'var(--ink-soft)' }}>
                    {fmtHours(row.total_seconds)}
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
        <div style={{ ...LABEL, marginBottom: '10px' }}>Top tasks — all time</div>
        {topTasks.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>No data yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '6px' }}>
            {topTasks.map((row, i) => (
              <div key={row.task_label} style={{
                padding: '10px 12px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    background: i < 3 ? 'var(--brand)' : 'var(--border)',
                    color: i < 3 ? '#fff' : 'var(--ink-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--ink)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.task_label}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brand)', flexShrink: 0 }}>
                    {fmtHours(row.total_seconds)}
                  </span>
                </div>
                <div style={{ paddingLeft: '28px', marginTop: '0' }}>
                  <CssBar value={Number(row.total_seconds)} max={maxTaskSec} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
