import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (import.meta.env.DEV && (!url || !key)) {
  console.warn('[PomoLog] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — auth and sync disabled.')
}

export const supabase = url && key ? createClient(url, key) : null
