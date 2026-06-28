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
    .select('tasks, running_id, running_call_id, version')
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
    version: data.version ?? 0,
  }
}

/**
 * Saves state to Supabase with optimistic locking.
 * Returns { conflict: true } if another device saved first (version mismatch).
 * Returns { conflict: false } on success.
 */
export async function saveRemote(userId, { tasks, runningId, runningCallId, version }) {
  if (!supabase) return { conflict: false }

  const today = localToday()
  const nextVersion = (version ?? 0) + 1

  if (version == null) {
    // First save for this session — plain upsert is safe (no prior version to check).
    const { error } = await supabase.from('task_logs').upsert(
      {
        user_id: userId,
        date: today,
        tasks,
        running_id: runningId,
        running_call_id: runningCallId,
        version: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' },
    )
    if (error) console.error('[PomoLog] saveRemote upsert failed:', error.message)
    return { conflict: false }
  }

  // Conditional update: only succeeds if the row still has the version we loaded.
  const { data, error } = await supabase
    .from('task_logs')
    .update({
      tasks,
      running_id: runningId,
      running_call_id: runningCallId,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('date', today)
    .eq('version', version)
    .select('version')

  if (error) {
    console.error('[PomoLog] saveRemote update failed:', error.message)
    return { conflict: false }
  }

  // 0 rows updated = version mismatch — another device saved first.
  if (!data || data.length === 0) return { conflict: true }

  return { conflict: false }
}

// ── Normalized per-task operations (tasks table) ──────────────────────────

function taskToRow(userId, task) {
  return {
    id: task.id,
    user_id: userId,
    date: localToday(),
    description: task.description ?? '',
    start_iso: task.startISO,
    end_iso: task.endISO ?? null,
    use_pomodo: task.usePomodo ?? false,
    focus_minutes: task.pomodoroFocusMinutes ?? null,
    pomodoro_sessions: task.pomodoroSessions ?? [],
    total_break_ms: task.totalBreakTime ?? 0,
    is_call: task.description === 'Call -',
    deleted_at: task.deletedAt ?? null,
    updated_at: new Date().toISOString(),
  }
}

function rowToTask(row) {
  return {
    id: row.id,
    description: row.description,
    startISO: row.start_iso,
    endISO: row.end_iso ?? null,
    usePomodo: row.use_pomodo,
    pomodoroFocusMinutes: row.focus_minutes ?? 25,
    pomodoroSessions: row.pomodoro_sessions ?? [],
    totalBreakTime: row.total_break_ms ?? 0,
    deletedAt: row.deleted_at ?? null,
  }
}

/** Load all tasks for today from the normalized tasks table (including soft-deleted). */
export async function loadTasksRemote(userId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', localToday())
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[PomoLog] loadTasksRemote failed:', error.message)
    return null
  }
  return (data ?? []).map(rowToTask)
}

/**
 * Upsert a full task row. Handles both new tasks and updates to existing ones,
 * including tasks that existed only in task_logs before the Phase 2 migration.
 */
export async function syncTaskRemote(userId, task) {
  if (!supabase) return
  const { error } = await supabase
    .from('tasks')
    .upsert(taskToRow(userId, task), { onConflict: 'id' })
  if (error) console.error('[PomoLog] syncTaskRemote failed:', error.message)
}

/** Soft-delete a task by setting deleted_at. */
export async function softDeleteTaskRemote(userId, taskId) {
  if (!supabase) return
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', userId)
  if (error) console.error('[PomoLog] softDeleteTaskRemote failed:', error.message)
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
