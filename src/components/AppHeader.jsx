import logo from '../assets/logo.png'
import { useAuth } from '../context/AuthContext'
import { fmtDate } from '../utils/time'
import { AuthButton } from './auth/AuthButton'

export function AppHeader({ view, onViewChange }) {
  const { user } = useAuth()

  return (
    <header>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <img className="brand-logo" src={logo} alt="PomoLog" title="PomoLog" />
        {user && (
          <nav style={{ display: 'flex', gap: '4px' }}>
            <button
              className={view === 'timer' ? '' : 'ghost'}
              style={{ padding: '4px 12px', fontSize: '0.875rem' }}
              onClick={() => onViewChange('timer')}
            >
              Timer
            </button>
            <button
              className={view === 'groups' ? '' : 'ghost'}
              style={{ padding: '4px 12px', fontSize: '0.875rem' }}
              onClick={() => onViewChange('groups')}
            >
              Groups
            </button>
          </nav>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="date">{fmtDate(new Date())}</div>
        <AuthButton />
      </div>
    </header>
  )
}
