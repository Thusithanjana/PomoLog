import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useGroups } from '../../hooks/useGroups'
import { fetchGroupEntries, fetchProfiles } from '../../lib/groups'
import { supabase } from '../../lib/supabase'
import { GroupCreateModal } from './GroupCreateModal'
import { GroupJoinModal } from './GroupJoinModal'
import { GroupMemberBreakdown } from './GroupMemberBreakdown'

function startOfWeekISO() {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + daysToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

function aggregateEntries(entries, members, profiles) {
  const result = {}

  for (const m of members) {
    result[m.user_id] = {
      displayName: profiles[m.user_id] || m.user_id.slice(0, 8),
      totalSeconds: 0,
      byTask: {},
    }
  }

  for (const e of entries) {
    if (!result[e.user_id]) {
      result[e.user_id] = {
        displayName: profiles[e.user_id] || e.user_id.slice(0, 8),
        totalSeconds: 0,
        byTask: {},
      }
    }
    result[e.user_id].totalSeconds += e.duration_seconds
    const label = e.task_label || '(untitled)'
    result[e.user_id].byTask[label] = (result[e.user_id].byTask[label] ?? 0) + e.duration_seconds
  }

  return Object.values(result).sort((a, b) => b.totalSeconds - a.totalSeconds)
}

export function GroupDashboard() {
  const { user } = useAuth()
  const { groups, loading, createGroup, joinGroup, leaveGroup } = useGroups()

  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [entries, setEntries] = useState([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [profiles, setProfiles] = useState({})
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [copied, setCopied] = useState(false)

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

  // Collect all unique member user_ids across all groups, then fetch their profiles.
  const allMemberIds = useMemo(() => {
    const ids = new Set()
    groups.forEach((g) => g.group_members?.forEach((m) => ids.add(m.user_id)))
    return [...ids]
  }, [groups])

  useEffect(() => {
    if (allMemberIds.length === 0) return
    fetchProfiles(allMemberIds).then(setProfiles)
  }, [allMemberIds])

  // Auto-select first group when list loads
  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) setSelectedGroupId(groups[0].id)
    if (groups.length === 0) setSelectedGroupId(null)
  }, [groups, selectedGroupId])

  // Reload entries when selected group changes
  useEffect(() => {
    if (!selectedGroupId) { setEntries([]); return }
    setEntriesLoading(true)
    fetchGroupEntries(selectedGroupId, startOfWeekISO()).then((data) => {
      setEntries(data)
      setEntriesLoading(false)
    })
  }, [selectedGroupId])

  // Realtime: stream inserts/updates for the active group
  useEffect(() => {
    if (!selectedGroupId || !supabase) return
    const channel = supabase
      .channel(`group-entries:${selectedGroupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'time_entries', filter: `group_id=eq.${selectedGroupId}` },
        (payload) => {
          // Only include entries that fall within the current week window
          if (payload.new.started_at >= startOfWeekISO()) {
            setEntries((prev) =>
              prev.some((e) => e.id === payload.new.id) ? prev : [payload.new, ...prev]
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'time_entries', filter: `group_id=eq.${selectedGroupId}` },
        (payload) => {
          setEntries((prev) => prev.map((e) => (e.id === payload.new.id ? payload.new : e)))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedGroupId])

  if (!user) return null

  const members = aggregateEntries(entries, selectedGroup?.group_members ?? [], profiles)
  const totalGroupSeconds = members.reduce((s, m) => s + m.totalSeconds, 0)

  const handleCopyInvite = () => {
    if (!selectedGroup) return
    navigator.clipboard.writeText(selectedGroup.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="panel">
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--charcoal)' }}>Groups</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="ghost" onClick={() => setShowJoin(true)}>Join</button>
          <button onClick={() => setShowCreate(true)}>+ Create</button>
        </div>
      </div>

      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {!loading && groups.length === 0 && (
        <p style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: '48px 0' }}>
          No groups yet. Create one or join with an invite code.
        </p>
      )}

      {groups.length > 0 && (
        <>
          {/* Group selector tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            {groups.map((g) => {
              const active = g.id === selectedGroupId
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  style={{
                    padding: '6px 18px', borderRadius: '20px', cursor: 'pointer',
                    border: active ? 'none' : '1px solid var(--border)',
                    fontSize: '0.9rem', fontWeight: active ? 600 : 400,
                    background: active ? 'var(--brand)' : 'var(--card)',
                    color: active ? '#fff' : 'var(--ink-soft)',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {g.name}
                </button>
              )
            })}
          </div>

          {selectedGroup && (
            <>
              {/* Summary row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 2px' }}>
                <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                  {selectedGroup.group_members?.length ?? 0} members &middot; this week
                </span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--charcoal)' }}>
                  {(totalGroupSeconds / 3600).toFixed(1)}h total
                </span>
              </div>

              {entriesLoading && <p style={{ color: 'var(--ink-soft)' }}>Loading entries…</p>}

              {!entriesLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {members.map((m) => (
                    <GroupMemberBreakdown
                      key={m.displayName}
                      displayName={m.displayName}
                      totalSeconds={m.totalSeconds}
                      byTask={m.byTask}
                    />
                  ))}
                </div>
              )}

              {/* Invite code strip */}
              <div style={{
                marginTop: '28px', padding: '12px 16px',
                background: 'var(--muted)', borderRadius: '10px',
                display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
              }}>
                <span style={{ color: 'var(--ink-soft)', fontSize: '0.82rem' }}>Invite code</span>
                <code style={{
                  fontFamily: 'monospace', color: 'var(--charcoal)',
                  letterSpacing: '0.1em', fontSize: '0.95rem', fontWeight: 600,
                }}>
                  {selectedGroup.invite_code}
                </code>
                <button
                  className="ghost"
                  style={{ padding: '3px 12px', fontSize: '0.8rem' }}
                  onClick={handleCopyInvite}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                {selectedGroup.owner_id !== user.id && (
                  <button
                    className="ghost"
                    style={{ padding: '3px 12px', fontSize: '0.8rem', color: 'var(--danger)', marginLeft: 'auto' }}
                    onClick={() => leaveGroup(selectedGroup.id)}
                  >
                    Leave group
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {showCreate && (
        <GroupCreateModal onClose={() => setShowCreate(false)} onCreate={createGroup} />
      )}
      {showJoin && (
        <GroupJoinModal onClose={() => setShowJoin(false)} onJoin={joinGroup} />
      )}
    </section>
  )
}
