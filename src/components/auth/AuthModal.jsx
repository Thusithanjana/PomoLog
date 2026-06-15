import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

// ── CAPTCHA INTEGRATION GUIDE ──────────────────────────────────────────────
// When ready to enable bot protection:
//
// 1. Install your chosen widget:
//      npm install @hcaptcha/react-hcaptcha        (hCaptcha)
//      npm install @marsidev/react-turnstile       (Cloudflare Turnstile)
//
// 2. Add your public site key to .env.local:
//      VITE_HCAPTCHA_SITE_KEY=your-site-key
//      (or VITE_TURNSTILE_SITE_KEY=your-site-key)
//
// 3. Replace the CAPTCHA_SLOT comment block below with the widget:
//
//    hCaptcha:
//      import HCaptcha from '@hcaptcha/react-hcaptcha'
//      <HCaptcha sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
//                onVerify={(token) => setCaptchaToken(token)} />
//
//    Turnstile:
//      import { Turnstile } from '@marsidev/react-turnstile'
//      <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
//                 onSuccess={(token) => setCaptchaToken(token)} />
//
// 4. Enable the matching provider in Supabase Dashboard →
//    Authentication → Settings → Bot and Abuse Protection.
//
// The captchaToken state is already wired through signUp() — no further
// changes needed in AuthContext or storage.js.
// ──────────────────────────────────────────────────────────────────────────

const inputStyle = {
  display: 'block',
  width: '100%',
  marginTop: '6px',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  fontSize: '14px',
  fontFamily: 'inherit',
  background: 'var(--bg)',
  color: 'var(--ink)',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  outline: 'none',
}

const linkBtnStyle = {
  padding: '2px 4px',
  fontSize: '13px',
  border: 'none',
  color: 'var(--brand)',
  background: 'none',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontFamily: 'inherit',
}

export function AuthModal({ onClose }) {
  const { signUp, signIn } = useAuth()

  const [view, setView]               = useState('login') // 'login' | 'signup' | 'confirm_email'
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [error, setError]             = useState(null)
  const [submitting, setSubmitting]   = useState(false)
  // Populated by the captcha widget once wired — Supabase ignores undefined.
  const [captchaToken, setCaptchaToken] = useState(undefined) // eslint-disable-line no-unused-vars

  const switchView = (next) => { setError(null); setView(next) }

  // ── confirm_email ────────────────────────────────────────────────────────
  if (view === 'confirm_email') {
    return (
      <div className="dialog-backdrop" role="presentation" onClick={onClose}>
        <div className="dialog" role="dialog" aria-modal="true"
             aria-labelledby="auth-title" onClick={(e) => e.stopPropagation()}>
          <h2 id="auth-title">Check your email</h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px' }}>
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account, then come back here and sign in.
          </p>
          <div className="dialog-actions">
            <button type="button" className="ghost" onClick={() => switchView('login')}>
              Back to Sign In
            </button>
            <button type="button" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  // ── login / signup ───────────────────────────────────────────────────────
  const isSignup = view === 'signup'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (isSignup) {
      const { data, error } = await signUp({ email, password, captchaToken })
      setSubmitting(false)
      if (error) { setError(error.message); return }
      // session is null when email confirmation is required
      if (!data.session) { setView('confirm_email'); return }
      onClose()
    } else {
      const { error } = await signIn({ email, password })
      setSubmitting(false)
      if (error) { setError(error.message); return }
      onClose()
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true"
           aria-labelledby="auth-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="auth-title">{isSignup ? 'Create account' : 'Sign in'}</h2>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px', marginTop: '4px' }}>
          <div>
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              style={inputStyle} />
          </div>

          <div>
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" required minLength={8}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              style={inputStyle} />
          </div>

          {/* CAPTCHA_SLOT — replace this comment with your widget (see guide above) */}

          {error && (
            <p role="alert" style={{ color: 'var(--danger)', fontSize: '13px', margin: 0 }}>
              {error}
            </p>
          )}

          <div className="dialog-actions" style={{ marginTop: 0 }}>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            </button>
          </div>
        </form>

        <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--ink-soft)' }}>
          {isSignup ? (
            <>Already have an account?{' '}
              <button type="button" style={linkBtnStyle} onClick={() => switchView('login')}>Sign in</button>
            </>
          ) : (
            <>No account?{' '}
              <button type="button" style={linkBtnStyle} onClick={() => switchView('signup')}>Sign up</button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
