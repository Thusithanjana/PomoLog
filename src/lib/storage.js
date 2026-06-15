import { supabase } from './supabase'

export const STORAGE_KEY = 'taskTimerApp.v1'

function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// ── Local (anonymous) ──────────────────────────────────────────────────────

export function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { date, tasks = [], runningId = null, runningCallId = null } = JSON.parse(raw)
    if (date !== localToday()) return null
    return { tasks, runningId, runningCallId }
  } catch {
    return null
  }
}

export function saveLocal({ tasks, runningId, runningCallId }) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ date: localToday(), tasks, runningId, runningCallId }),
  )
}

export function clearLocal() {
  localStorage.removeItem(STORAGE_KEY)
}

/** Returns true if localStorage has task data for today (used for migration check). */
export function hasLocalDataToday() {
  const data = loadLocal()
  return Boolean(data && data.tasks.length > 0)
}

// ── Remote (authenticated) ─────────────────────────────────────────────────

export async function loadRemote(userId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('task_logs')
    .select('tasks, running_id, running_call_id')
    .eq('user_id', userId)
    .eq('date', localToday())
    .maybeSingle()
  if (error) {
    console.error('[PomoLog] loadRemote failed:', error.message, error)
    return null
  }
  if (!data) return null
  return {
    tasks: data.tasks ?? [],
    runningId: data.running_id ?? null,
    runningCallId: data.running_call_id ?? null,
  }
}

export async function saveRemote(userId, { tasks, runningId, runningCallId }) {
  if (!supabase) return
  const { error } = await supabase.from('task_logs').upsert(
    {
      user_id: userId,
      date: localToday(),
      tasks,
      running_id: runningId,
      running_call_id: runningCallId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' },
  )
  if (error) console.error('[PomoLog] saveRemote failed:', error.message, error)
}

// ── Migration ──────────────────────────────────────────────────────────────

/**
 * Copies today's localStorage data to Supabase, then clears localStorage.
 * Returns false if there was nothing to migrate.
 */
export async function migrateLocalToRemote(userId) {
  const local = loadLocal()
  if (!local || local.tasks.length === 0) return false
  await saveRemote(userId, local)
  clearLocal()
  return true
}
