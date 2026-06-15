import logo from '../assets/logo.png'
import { fmtDate } from '../utils/time'
import { AuthButton } from './auth/AuthButton'

export function AppHeader() {
  return (
    <header>
      <img className="brand-logo" src={logo} alt="PomoLog" title="PomoLog" />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="date">{fmtDate(new Date())}</div>
        <AuthButton />
      </div>
    </header>
  )
}
