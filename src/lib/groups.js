import { supabase } from './supabase'

export async function fetchMyGroups() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('groups')
    .select(`
      id, name, invite_code, owner_id, created_at,
      group_members ( user_id, role, joined_at, nickname )
    `)
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return [] }
  return data ?? []
}

/** Returns a { [userId]: displayName } map for the given user IDs. */
export async function fetchProfiles(userIds) {
  if (!supabase || !userIds.length) return {}
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', userIds)
  if (error) { console.error(error); return {} }
  return Object.fromEntries((data ?? []).map((p) => [p.user_id, p.display_name]))
}

export async function createGroup(name, nickname) {
  if (!supabase) return { data: null, error: new Error('Auth not configured') }
  return supabase.rpc('create_group', { p_name: name, p_nickname: nickname || null })
}

export async function joinGroup(inviteCode, nickname) {
  if (!supabase) return { data: null, error: new Error('Auth not configured') }
  return supabase.rpc('join_group_by_invite_code', { p_invite_code: inviteCode.trim(), p_nickname: nickname || null })
}

export async function leaveGroup(groupId, userId) {
  if (!supabase) return
  return supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
}

/** Called when a logged-in user stops a task. groupId may be null for personal entries. */
export async function writeTimeEntry(userId, { taskLabel, startedAt, durationSeconds, groupId }) {
  if (!supabase) return
  const { error } = await supabase.from('time_entries').insert({
    user_id: userId,
    task_label: taskLabel || '(untitled)',
    started_at: startedAt,
    duration_seconds: durationSeconds,
    group_id: groupId ?? null,
  })
  if (error) console.error('[PomoLog] writeTimeEntry failed:', error.message, error)
}

export async function fetchGroupEntries(groupId, sinceISO) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('time_entries')
    .select('id, user_id, task_label, duration_seconds, started_at')
    .eq('group_id', groupId)
    .gte('started_at', sinceISO)
    .order('started_at', { ascending: false })
    .limit(500)
  if (error) { console.error(error); return [] }
  return data ?? []
}
