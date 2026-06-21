import { supabase } from './supabase'

export async function fetchPersonalWeekly() {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('personal_weekly_summary')
  if (error) { console.error('[PomoLog] personal_weekly_summary:', error.message); return [] }
  return data ?? []
}

export async function fetchPersonalMonthly() {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('personal_monthly_summary')
  if (error) { console.error('[PomoLog] personal_monthly_summary:', error.message); return [] }
  return data ?? []
}

export async function fetchPersonalStreak() {
  if (!supabase) return 0
  const { data, error } = await supabase.rpc('personal_current_streak')
  if (error) { console.error('[PomoLog] personal_current_streak:', error.message); return 0 }
  return data ?? 0
}

export async function fetchPersonalTopTasks(limit = 10) {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('personal_top_tasks', { p_limit: limit })
  if (error) { console.error('[PomoLog] personal_top_tasks:', error.message); return [] }
  return data ?? []
}

export async function fetchGroupLeaderboard(groupId) {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('group_leaderboard', { p_group_id: groupId })
  if (error) { console.error('[PomoLog] group_leaderboard:', error.message); return [] }
  return data ?? []
}

export async function fetchGroupTaskBreakdown(groupId) {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('group_task_breakdown', { p_group_id: groupId })
  if (error) { console.error('[PomoLog] group_task_breakdown:', error.message); return [] }
  return data ?? []
}

/**
 * Fetches the current user's personal time_entries since startISO.
 * RLS ensures only the calling user's rows are returned — no user_id filter needed.
 * Returns [{ task_label, started_at, duration_seconds }] sorted newest-first.
 */
export async function fetchPersonalEntries(startISO) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('time_entries')
    .select('task_label, started_at, duration_seconds')
    .gte('started_at', startISO)
    .order('started_at', { ascending: false })
    .limit(2000)
  if (error) { console.error('[PomoLog] fetchPersonalEntries:', error.message); return [] }
  return data ?? []
}
