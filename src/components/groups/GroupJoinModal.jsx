import { useState } from 'react'

export function GroupJoinModal({ onClose, onJoin }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    setJoining(true)
    const err = await onJoin(trimmed)
    setJoining(false)
    if (err) { setError(err); return }
    onClose()
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Join a group</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="invite-code" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
              Invite code
            </label>
            <input
              id="invite-code"
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError('') }}
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '0.05em' }}
            />
          </div>
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '8px' }}>{error}</p>
          )}
          <div className="dialog-actions">
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={joining || !code.trim()}>
              {joining ? 'Joining…' : 'Join group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
