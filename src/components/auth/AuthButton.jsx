import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AuthModal } from './AuthModal'

export function AuthButton() {
  const { user, loading, signOut } = useAuth()
  const [showModal, setShowModal] = useState(false)

  // Hide during the brief session-restore check to avoid a flash of "Sign In"
  // for users who are already logged in.
  if (loading) return null

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{
          fontSize: '12px',
          color: 'var(--ink-soft)',
          maxWidth: '160px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {user.email}
        </span>
        <button type="button" className="ghost" onClick={signOut}
          style={{ fontSize: '12px', padding: '5px 10px', flexShrink: 0 }}>
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <>
      <button type="button" className="ghost" onClick={() => setShowModal(true)}
        style={{ fontSize: '13px', padding: '6px 14px', flexShrink: 0 }}>
        Sign In
      </button>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  )
}
