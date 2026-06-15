import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useGroups } from '../../hooks/useGroups'
import { PersonalReport } from './PersonalReport'
import { GroupReport } from './GroupReport'

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
      <div style={{ padding: '20px', display: 'grid', gap: '20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--charcoal)' }}>Reports</h2>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['personal', 'group'].map((t) => {
              const active = tab === t
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={active ? '' : 'ghost'}
                  style={{ padding: '5px 16px', fontSize: '13px' }}
                >
                  {t === 'personal' ? 'Personal' : 'Group'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Group selector — only in group tab */}
        {tab === 'group' && groups.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '0' }}>
            {groups.map((g) => {
              const active = g.id === activeGroupId
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={active ? '' : 'ghost'}
                  style={{ padding: '4px 14px', fontSize: '13px', borderRadius: '20px', fontWeight: active ? 600 : 400 }}
                >
                  {g.name}
                </button>
              )
            })}
          </div>
        )}

        {tab === 'personal' && <PersonalReport />}
        {tab === 'group' && <GroupReport groupId={activeGroupId} />}
      </div>
    </section>
  )
}
