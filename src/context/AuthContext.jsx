import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Restore existing session (also handles the email-confirmation redirect:
    // supabase-js parses the URL hash before this promise resolves).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async ({ email, password, captchaToken }) => {
    if (!supabase) return { error: new Error('Auth not configured') }
    return supabase.auth.signUp({
      email,
      password,
      options: {
        // Works for both localhost/dev and GitHub Pages production.
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        // undefined is ignored by Supabase — slot for captcha widget later.
        captchaToken,
      },
    })
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    if (!supabase) return { error: new Error('Auth not configured') }
    return supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    return supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
