import { useEffect, useMemo, useState } from 'react'
import {
  fetchPersonalEntries,
  fetchPersonalMonthly,
  fetchPersonalStreak,
  fetchPersonalWeekly,
} from '../../lib/reports'
import { exportPersonalToExcel, exportPersonalToPdf } from '../../utils/export'

// ── helpers ───────────────────────────────────────────────────────────────

function fmtHours(seconds) {
  return (Number(seconds) / 3600).toFixed(1) + 'h'
}

function fmtMonth(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function fmtWeek(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtDay(isoStr) {
  return new Date(isoStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

const PERIODS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'all', label: 'All Time' },
]

function periodToStartISO(period) {
  const now = new Date()
  const d = new Date(now)
  if (period === 'week') {
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
  } else if (period === 'month') {
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
  } else if (period === '30d') {
    d.setDate(d.getDate() - 30)
    d.setHours(0, 0, 0, 0)
  } else {
    return '2000-01-01T00:00:00.000Z'
  }
  return d.toISOString()
}

// ── sub-components ────────────────────────────────────────────────────────

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

function StatCard({ label, value }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: '8px',
      border: '1px solid var(--border)', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', gap: '2px',
    }}>
      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-soft)' }}>{label}</span>
      <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brand)' }}>{value}</span>
    </div>
  )
}

function ExportMenu({ onExcel, onPdf }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="ghost"
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: '13px', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        Export
        <span style={{ fontSize: '10px' }}>▾</span>
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          />
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: '4px',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 20, minWidth: '140px', overflow: 'hidden',
          }}>
            {[
              { label: 'Excel (.xlsx)', action: () => { onExcel(); setOpen(false) } },
              { label: 'PDF (.pdf)', action: () => { onPdf(); setOpen(false) } },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                className="ghost"
                style={{
                  width: '100%', textAlign: 'left', borderRadius: 0,
                  padding: '9px 14px', fontSize: '13px', border: 'none',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────

export function PersonalReport() {
  const [period, setPeriod] = useState('week')

  // Static data — fetched once
  const [streak, setStreak] = useState(null)
  const [weekly, setWeekly] = useState([])
  const [monthly, setMonthly] = useState([])
  const [staticLoading, setStaticLoading] = useState(true)

  // Period-sensitive data — re-fetched when period changes
  const [entries, setEntries] = useState([])
  const [entriesLoading, setEntriesLoading] = useState(true)

  useEffect(() => {
    setStaticLoading(true)
    Promise.all([fetchPersonalStreak(), fetchPersonalWeekly(), fetchPersonalMonthly()]).then(([s, w, m]) => {
      setStreak(s)
      setWeekly(w)
      setMonthly(m)
      setStaticLoading(false)
    })
  }, [])

  useEffect(() => {
    setEntriesLoading(true)
    fetchPersonalEntries(periodToStartISO(period)).then((data) => {
      setEntries(data)
      setEntriesLoading(false)
    })
  }, [period])

  // ── derived stats from entries ──────────────────────────────────────────
  const { summary, dailyRows, topTaskRows } = useMemo(() => {
    if (!entries.length) {
      return {
        summary: { totalSeconds: 0, sessions: 0, uniqueTasks: 0, avgDaySeconds: 0 },
        dailyRows: [],
        topTaskRows: [],
      }
    }

    const totalSeconds = entries.reduce((s, e) => s + Number(e.duration_seconds), 0)
    const sessions = entries.length
    const uniqueTasks = new Set(entries.map((e) => e.task_label)).size

    // Group by calendar date
    const byDay = {}
    for (const e of entries) {
      const day = e.started_at.slice(0, 10)
      if (!byDay[day]) byDay[day] = { totalSeconds: 0, sessions: 0, tasks: new Set() }
      byDay[day].totalSeconds += Number(e.duration_seconds)
      byDay[day].sessions += 1
      byDay[day].tasks.add(e.task_label)
    }
    const activeDays = Object.keys(byDay).length
    const avgDaySeconds = activeDays > 0 ? totalSeconds / activeDays : 0

    const dailyRows = Object.entries(byDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, v]) => ({
        date: fmtDay(day + 'T12:00:00'),
        totalSeconds: v.totalSeconds,
        sessions: v.sessions,
        tasks: [...v.tasks],
      }))

    // Group by task label
    const byTask = {}
    for (const e of entries) {
      if (!byTask[e.task_label]) byTask[e.task_label] = { total_seconds: 0, sessions: 0 }
      byTask[e.task_label].total_seconds += Number(e.duration_seconds)
      byTask[e.task_label].sessions += 1
    }
    const topTaskRows = Object.entries(byTask)
      .map(([label, v]) => ({ task_label: label, ...v }))
      .sort((a, b) => b.total_seconds - a.total_seconds)
      .slice(0, 10)

    return { summary: { totalSeconds, sessions, uniqueTasks, avgDaySeconds }, dailyRows, topTaskRows }
  }, [entries])

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? period

  const handleExcel = () => exportPersonalToExcel({ periodLabel, summary, dailyRows, topTaskRows })
  const handlePdf = () => exportPersonalToPdf({ periodLabel, summary, dailyRows, topTaskRows })

  const maxWeekSec = Math.max(...weekly.map((r) => Number(r.total_seconds)), 1)
  const maxMonthSec = Math.max(...monthly.map((r) => Number(r.total_seconds)), 1)
  const maxTaskSec = Math.max(...topTaskRows.map((r) => r.total_seconds), 1)

  if (staticLoading) return <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>Loading your stats…</p>

  return (
    <div style={{ display: 'grid', gap: '24px' }}>

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

      {/* Period filter + export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={period === key ? '' : 'ghost'}
              style={{ padding: '5px 14px', fontSize: '13px', borderRadius: '20px' }}
            >
              {label}
            </button>
          ))}
        </div>
        <ExportMenu onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      {entriesLoading ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>Loading…</p>
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
            <StatCard label="Total hours" value={fmtHours(summary.totalSeconds)} />
            <StatCard label="Sessions" value={summary.sessions} />
            <StatCard label="Unique tasks" value={summary.uniqueTasks} />
            <StatCard label="Avg / active day" value={fmtHours(summary.avgDaySeconds)} />
          </div>

          {/* Top tasks */}
          <div>
            <div style={{ ...LABEL, marginBottom: '10px' }}>Top tasks — {periodLabel}</div>
            {topTaskRows.length === 0 ? (
              <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>No sessions logged in this period.</p>
            ) : (
              <div style={{ display: 'grid', gap: '6px' }}>
                {topTaskRows.map((row, i) => (
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
                      <span style={{ fontSize: '11px', color: 'var(--ink-soft)', flexShrink: 0, marginRight: '8px' }}>
                        {row.sessions} session{row.sessions !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brand)', flexShrink: 0 }}>
                        {fmtHours(row.total_seconds)}
                      </span>
                    </div>
                    <div style={{ paddingLeft: '28px', marginTop: '0' }}>
                      <CssBar value={row.total_seconds} max={maxTaskSec} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily breakdown */}
          <div>
            <div style={{ ...LABEL, marginBottom: '10px' }}>Daily breakdown — {periodLabel}</div>
            {dailyRows.length === 0 ? (
              <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>No sessions logged in this period.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                {/* header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 70px 60px',
                  padding: '8px 12px', background: 'var(--brand-tint)',
                  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.5px', color: 'var(--ink-soft)',
                }}>
                  <span>Day / Tasks</span>
                  <span style={{ textAlign: 'right' }}>Hours</span>
                  <span style={{ textAlign: 'right' }}>Sessions</span>
                </div>
                {dailyRows.map((row, i) => (
                  <div key={row.date} style={{
                    display: 'grid', gridTemplateColumns: '1fr 70px 60px',
                    padding: '10px 12px', alignItems: 'start',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    background: i % 2 === 0 ? 'var(--bg)' : 'transparent',
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--charcoal)' }}>{row.date}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.tasks.slice(0, 3).join(' · ')}{row.tasks.length > 3 ? ` +${row.tasks.length - 3} more` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brand)', textAlign: 'right', paddingTop: '1px' }}>
                      {fmtHours(row.totalSeconds)}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--ink-soft)', textAlign: 'right', paddingTop: '1px' }}>
                      {row.sessions}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

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

    </div>
  )
}
