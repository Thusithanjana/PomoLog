import logo from '../assets/logo.png'
import { fmtDate } from '../utils/time'

export function AppHeader() {
  return (
    <header>
      <div className="brand">
        <img className="brand-logo" src={logo} alt="PromoLog logo" />
        <h1>
          <span className="pill">PromoLog</span>
        </h1>
      </div>
      <div className="date">{fmtDate(new Date())}</div>
    </header>
  )
}
