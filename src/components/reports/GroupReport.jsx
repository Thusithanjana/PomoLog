import { useEffect, useState } from 'react'
import { fetchGroupLeaderboard, fetchGroupTaskBreakdown } from '../../lib/reports'
import { fetchGroupEntries } from '../../lib/groups'
import { exportGroupToExcel, exportGroupToPdf } from '../../utils/export'
import { useGroups } from '../../hooks/useGroups'

function fmtHours(seconds) {
  return (Number(seconds) / 3600).toFixed(1) + 'h'
}

function fmtDateTime(isoStr) {
  return new Date(isoStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const LABEL = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px',
  textTransform: 'uppercase', color: 'var(--ink-soft)',
}

const MEDAL = ['#F5A623', '#9B9B9B', '#CD7F32']

const PERIODS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: '30d', label: 'Last 30 Days' },
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
  }
  return d.toISOString()
}

function CssBar({ value, max, color = 'var(--brand)' }) {
  const pct = max > 0 ? Math.round((Number(value) / max) * 100) : 0
  return (
    <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '5px' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
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
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
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

export function GroupReport({ groupId }) {
  const { groups } = useGroups()
  const groupName = groups.find((g) => g.id === groupId)?.name ?? ''

  const [period, setPeriod] = useState('week')

  // Leaderboard + task breakdown — re-fetched when groupId changes
  // These use RPCs that are period-aware internally (this week / all-time)
  const [leaderboard, setLeaderboard] = useState([])
  const [tasks, setTasks] = useState([])
  const [lbLoading, setLbLoading] = useState(false)

  // Recent entries — re-fetched when groupId or period changes
  const [entries, setEntries] = useState([])
  const [entriesLoading, setEntriesLoading] = useState(false)

  useEffect(() => {
    if (!groupId) return
    setLbLoading(true)
    Promise.all([fetchGroupLeaderboard(groupId), fetchGroupTaskBreakdown(groupId)]).then(([lb, tb]) => {
      setLeaderboard(lb)
      setTasks(tb)
      setLbLoading(false)
    })
  }, [groupId])

  useEffect(() => {
    if (!groupId) return
    setEntriesLoading(true)
    fetchGroupEntries(groupId, periodToStartISO(period)).then((data) => {
      setEntries(data)
      setEntriesLoading(false)
    })
  }, [groupId, period])

  if (!groupId) return (
    <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>Select a group to see its report.</p>
  )

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? period

  const maxLbSec = Math.max(...leaderboard.map((r) => Number(r.total_seconds)), 1)
  const maxTaskSec = Math.max(...tasks.map((r) => Number(r.total_seconds)), 1)
  const maxEntrySec = Math.max(...entries.map((e) => Number(e.duration_seconds)), 1)

  // Build leaderboard rows compatible with the export format
  const lbRows = leaderboard.map((r) => ({ ...r, entry_count: r.entry_count ?? 0 }))
  const tbRows = tasks.map((r) => ({ ...r, contributor_count: r.contributor_count ?? 0 }))

  const handleExcel = () => exportGroupToExcel({ groupName, periodLabel, leaderboardRows: lbRows, taskRows: tbRows })
  const handlePdf = () => exportGroupToPdf({ groupName, periodLabel, leaderboardRows: lbRows, taskRows: tbRows })

  return (
    <div style={{ display: 'grid', gap: '24px' }}>

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

      {lbLoading ? <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>Loading group stats…</p> : (
        <>
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
        </>
      )}

      {/* Recent activity feed — period-sensitive */}
      <div>
        <div style={{ ...LABEL, marginBottom: '10px' }}>Recent activity — {periodLabel}</div>
        {entriesLoading ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>Loading…</p>
        ) : entries.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>No activity in this period.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 60px',
              padding: '8px 12px', background: 'var(--brand-tint)',
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.5px', color: 'var(--ink-soft)',
            }}>
              <span>Task</span>
              <span style={{ textAlign: 'right' }}>When</span>
              <span style={{ textAlign: 'right' }}>Hours</span>
            </div>
            {entries.slice(0, 50).map((entry, i) => (
              <div key={entry.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 60px',
                padding: '9px 12px', alignItems: 'center',
                borderTop: '1px solid var(--border)',
                background: i % 2 === 0 ? 'var(--bg)' : 'transparent',
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.task_label}
                  </div>
                  <div style={{ marginTop: '3px' }}>
                    <CssBar value={entry.duration_seconds} max={maxEntrySec} color="var(--leaf)" />
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ink-soft)', textAlign: 'right' }}>
                  {fmtDateTime(entry.started_at)}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--leaf)', textAlign: 'right' }}>
                  {fmtHours(entry.duration_seconds)}
                </div>
              </div>
            ))}
            {entries.length > 50 && (
              <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--ink-soft)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                Showing 50 of {entries.length} entries
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
