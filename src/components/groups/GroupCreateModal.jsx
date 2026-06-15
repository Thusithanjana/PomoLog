import { useState } from 'react'

export function GroupCreateModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    const { error: err, data } = await onCreate(trimmed)
    setSaving(false)
    if (err) { setError(err); return }
    setInviteCode(data.invite_code)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (inviteCode) {
    return (
      <div className="dialog-backdrop" role="presentation" onClick={onClose}>
        <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <h2>Group created!</h2>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '4px' }}>
            Share this invite code with your team:
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '16px 0' }}>
            <code style={{
              flex: 1, padding: '10px 14px',
              background: 'var(--muted)', borderRadius: '8px',
              fontFamily: 'monospace', fontSize: '1.15rem', letterSpacing: '0.1em',
              color: 'var(--charcoal)',
            }}>
              {inviteCode}
            </code>
            <button onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          <div className="dialog-actions">
            <button onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Create a group</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="group-name" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
              Group name
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              maxLength={80}
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '8px' }}>{error}</p>
          )}
          <div className="dialog-actions">
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
