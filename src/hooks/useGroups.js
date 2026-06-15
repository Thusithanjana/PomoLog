import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { createGroup, fetchMyGroups, joinGroup, leaveGroup } from '../lib/groups'

export function useGroups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) { setGroups([]); return }
    setLoading(true)
    const data = await fetchMyGroups()
    setGroups(data)
    setLoading(false)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const handleCreate = useCallback(async (name, nickname) => {
    const { data, error } = await createGroup(name, nickname)
    if (error) return { error: error.message, data: null }
    await refresh()
    return { error: null, data }
  }, [refresh])

  const handleJoin = useCallback(async (inviteCode, nickname) => {
    const { data, error } = await joinGroup(inviteCode, nickname)
    if (error) return error.message
    await refresh()
    return null
  }, [refresh])

  const handleLeave = useCallback(async (groupId) => {
    if (!user) return
    await leaveGroup(groupId, user.id)
    await refresh()
  }, [user, refresh])

  return {
    groups,
    loading,
    refresh,
    createGroup: handleCreate,
    joinGroup: handleJoin,
    leaveGroup: handleLeave,
  }
}
