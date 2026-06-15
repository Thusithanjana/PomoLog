import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useGroups } from '../../hooks/useGroups'
import { PersonalReport } from './PersonalReport'
import { GroupReport } from './GroupReport'

function SubTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 20px', borderRadius: '20px', cursor: 'pointer',
        border: active ? 'none' : '1px solid var(--border)',
        fontSize: '0.9rem', fontWeight: active ? 600 : 400,
        background: active ? 'var(--brand)' : 'var(--card)',
        color: active ? '#fff' : 'var(--ink-soft)',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </button>
  )
}

export function ReportsDashboard() {
  const { user } = useAuth()
  const { groups } = useGroups()
  const [tab, setTab] = useState('personal')
  const [selectedGroupId, setSelectedGroupId] = useState(null)

  if (!user) return null

  const firstGroupId = groups[0]?.id ?? null
  const activeGroupId = selectedGroupId ?? firstGroupId

  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--charcoal)' }}>Reports</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <SubTab label="Personal" active={tab === 'personal'} onClick={() => setTab('personal')} />
          <SubTab label="Group" active={tab === 'group'} onClick={() => setTab('group')} />
        </div>
      </div>

      {/* Group selector — only shown in group tab */}
      {tab === 'group' && groups.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          {groups.map((g) => {
            const active = g.id === activeGroupId
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                style={{
                  padding: '5px 16px', borderRadius: '20px', cursor: 'pointer',
                  border: active ? 'none' : '1px solid var(--border)',
                  fontSize: '0.85rem', fontWeight: active ? 600 : 400,
                  background: active ? 'var(--charcoal)' : 'var(--card)',
                  color: active ? '#fff' : 'var(--ink-soft)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {g.name}
              </button>
            )
          })}
        </div>
      )}

      {tab === 'personal' && <PersonalReport />}
      {tab === 'group' && <GroupReport groupId={activeGroupId} />}
    </section>
  )
}
