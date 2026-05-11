import logo from '../assets/logo.png'
import { fmtDate } from '../utils/time'

export function AppHeader() {
  return (
    <header>
      <img className="brand-logo" src={logo} alt="PromoLog" title="PromoLog" />
      <div className="date">{fmtDate(new Date())}</div>
    </header>
  )
}
