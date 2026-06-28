import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { deleteTimeEntry } from '../lib/groups'
import {
  loadLocal,
  loadRemote,
  loadTasksRemote,
  saveLocal,
  saveRemote,
  softDeleteTaskRemote,
  syncTaskRemote,
} from '../lib/storage'
import { nowISO, uid } from '../utils/time'

const initialState = {
  tasks: [],
  runningId: null,
  runningCallId: null,
  description: '',
  status: 'Ready',
  usePomodo: true,
  pomodoroFocusMinutes: 25,
}

function reducer(state, action) {
  switch (action.type) {
    case 'RESTORE': {
      return {
        ...state,
        tasks: action.payload.tasks,
        runningId: action.payload.runningId,
        runningCallId: action.payload.runningCallId,
      }
    }

    case 'SET_DESCRIPTION': {
      return { ...state, description: action.payload }
    }

    case 'START_TASK': {
      const task = {
        id: action.payload.id,
        description: action.payload.description,
        startISO: action.payload.startISO,
        endISO: null,
        usePomodo: action.payload.usePomodo ?? false,
        pomodoroFocusMinutes: action.payload.pomodoroFocusMinutes ?? 25,
        pomodoroSessions: action.payload.usePomodo ? [{ startISO: action.payload.startISO, endISO: null, breaks: [] }] : [],
        totalBreakTime: 0,
      }

      return {
        ...state,
        tasks: [...state.tasks, task],
        runningId: task.id,
        status: 'Task started.',
      }
    }

    case 'STOP_TASK': {
      const updatedTasks = state.tasks.map((task) =>
        task.id === state.runningId
          ? { ...task, endISO: action.payload.endISO }
          : task,
      )

      return {
        ...state,
        tasks: updatedTasks,
        runningId: null,
        description: '',
        status: 'Task stopped and input cleared.',
      }
    }

    case 'RESUME_TASK': {
      const updatedTasks = state.tasks.map((task) => {
        if (task.id !== action.payload.taskId) return task

        if (!task.usePomodo) {
          return { ...task, endISO: null }
        }

        return {
          ...task,
          endISO: null,
          pomodoroSessions: [
            ...(task.pomodoroSessions || []),
            {
              startISO: action.payload.startISO,
              endISO: null,
              breaks: [],
            },
          ],
        }
      })

      return {
        ...state,
        tasks: updatedTasks,
        runningId: action.payload.taskId,
        status: 'Task resumed.',
      }
    }

    case 'START_CALL': {
      const call = {
        id: action.payload.id,
        description: 'Call -',
        startISO: action.payload.startISO,
        endISO: null,
      }

      return {
        ...state,
        tasks: [...state.tasks, call],
        runningCallId: call.id,
        status: 'Call started.',
      }
    }

    case 'STOP_CALL': {
      const updatedTasks = state.tasks.map((task) =>
        task.id === state.runningCallId
          ? { ...task, endISO: action.payload.endISO }
          : task,
      )

      return {
        ...state,
        tasks: updatedTasks,
        runningCallId: null,
        status: 'Call ended.',
      }
    }

    case 'UPDATE_TASK_DESCRIPTION': {
      const updatedTasks = state.tasks.map((task) =>
        task.id === action.payload.id
          ? { ...task, description: action.payload.description }
          : task,
      )

      return {
        ...state,
        tasks: updatedTasks,
        status: 'Description updated.',
      }
    }

    case 'ADD_BREAK_TO_SESSION': {
      const updatedTasks = state.tasks.map((task) => {
        if (task.id !== state.runningId) return task

        const sessions = [...(task.pomodoroSessions || [])]
        if (sessions.length > 0) {
          const lastSession = sessions[sessions.length - 1]
          sessions[sessions.length - 1] = {
            ...lastSession,
            breaks: [
              ...lastSession.breaks,
              {
                type: action.payload.breakType,
                duration: action.payload.duration,
                startISO: action.payload.startISO,
              },
            ],
          }
        }

        return {
          ...task,
          pomodoroSessions: sessions,
          totalBreakTime: (task.totalBreakTime || 0) + action.payload.duration,
        }
      })

      return {
        ...state,
        tasks: updatedTasks,
      }
    }

    case 'UPDATE_LAST_BREAK_DURATION': {
      const updatedTasks = state.tasks.map((task) => {
        if (task.id !== action.payload.taskId) return task

        const sessions = [...(task.pomodoroSessions || [])]
        if (sessions.length === 0) return task

        const lastSessionIndex = sessions.length - 1
        const lastSession = sessions[lastSessionIndex]
        const breaks = [...(lastSession.breaks || [])]
        if (breaks.length === 0) return task

        const lastBreakIndex = breaks.length - 1
        const previousDuration = breaks[lastBreakIndex].duration || 0
        breaks[lastBreakIndex] = {
          ...breaks[lastBreakIndex],
          duration: action.payload.duration,
        }

        sessions[lastSessionIndex] = {
          ...lastSession,
          breaks,
        }

        return {
          ...task,
          pomodoroSessions: sessions,
          totalBreakTime:
            (task.totalBreakTime || 0) - previousDuration + action.payload.duration,
        }
      })

      return {
        ...state,
        tasks: updatedTasks,
      }
    }

    case 'START_NEW_POMODORO_SESSION': {
      const updatedTasks = state.tasks.map((task) => {
        if (task.id !== state.runningId) return task

        return {
          ...task,
          pomodoroSessions: [
            ...(task.pomodoroSessions || []),
            {
              startISO: action.payload.startISO,
              endISO: null,
              breaks: [],
            },
          ],
        }
      })

      return {
        ...state,
        tasks: updatedTasks,
      }
    }

    case 'SET_STATUS': {
      return { ...state, status: action.payload }
    }

    case 'SET_USE_POMODO': {
      return { ...state, usePomodo: action.payload }
    }

    case 'SET_POMODORO_FOCUS_MINUTES': {
      return { ...state, pomodoroFocusMinutes: action.payload }
    }

    case 'DELETE_TASK': {
      const updatedTasks = state.tasks.map((task) =>
        task.id === action.payload.taskId
          ? { ...task, deletedAt: action.payload.deletedAt }
          : task,
      )
      const wasRunning = state.runningId === action.payload.taskId
      return {
        ...state,
        tasks: updatedTasks,
        runningId: wasRunning ? null : state.runningId,
      }
    }

    default:
      return state
  }
}

function loadInitialState() {
  // Always start from localStorage for the synchronous initializer.
  // When a logged-in session is restored, useEffect below overwrites this
  // with the remote data via RESTORE.
  const local = loadLocal()
  if (local) return { ...initialState, ...local }
  return initialState
}

/**
 * Loads today's state from the normalized tasks table (Phase 2) with fallback
 * to the legacy task_logs blob (Phase 1 / migration path).
 */
async function fetchRemoteState(userId) {
  const [normalizedTasks, legacy] = await Promise.all([
    loadTasksRemote(userId),
    loadRemote(userId),
  ])

  // Prefer the normalized table when it has data.
  if (normalizedTasks && normalizedTasks.length > 0) {
    return {
      payload: {
        tasks: normalizedTasks,
        runningId: legacy?.runningId ?? null,
        runningCallId: legacy?.runningCallId ?? null,
      },
      version: legacy?.version ?? null,
    }
  }

  return {
    payload: legacy ?? { tasks: [], runningId: null, runningCallId: null },
    version: legacy?.version ?? null,
  }
}

export function useTaskTimer() {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState)

  // false while we're waiting for a remote load to complete; true otherwise.
  // Starts false when already logged in (need to fetch before saving), true when anonymous.
  const [remoteReady, setRemoteReady] = useState(!user)

  // Ref mirrors remoteReady but updates synchronously within the same render commit.
  // This prevents the save effect (defined after the auth effect) from calling saveRemote
  // with empty state in the same render cycle where the auth effect sets remoteReady=false.
  // useState updates are batched and only visible in the next render; useRef is immediate.
  const remoteReadyRef = useRef(!user)

  // Tracks the version number of the last snapshot we loaded from Supabase.
  // Passed to saveRemote for optimistic locking; null until first remote load.
  const remoteVersionRef = useRef(null)

  // Serialized snapshot of each task by ID; used to detect which tasks changed
  // so we can fire targeted syncTaskRemote calls instead of full-blob upserts.
  const prevTasksRef = useRef(new Map())

  // Track previous user so we can detect login / logout transitions.
  const prevUserRef = useRef(undefined)

  // ── Remote load on auth transitions ──────────────────────────────────────
  useEffect(() => {
    const prevUser = prevUserRef.current
    prevUserRef.current = user

    // Skip the very first render (prevUser is undefined, not null).
    if (prevUser === undefined) {
      // On first render: if already logged in, load from Supabase.
      if (user) {
        remoteReadyRef.current = false
        setRemoteReady(false)
        fetchRemoteState(user.id).then(({ payload, version }) => {
          remoteVersionRef.current = version
          prevTasksRef.current = new Map()
          dispatch({ type: 'RESTORE', payload })
          remoteReadyRef.current = true
          setRemoteReady(true)
        })
      }
      return
    }

    if (user && !prevUser) {
      // Just logged in — block saves until App.jsx calls reload() after handling
      // the migration offer (or calling reload() directly when no local data).
      // Set the ref synchronously so the save effect below (same render commit) sees it.
      remoteReadyRef.current = false
      setRemoteReady(false)
      return
    }

    if (!user && prevUser) {
      // Just logged out — fall back to whatever is in localStorage (likely empty).
      const local = loadLocal()
      prevTasksRef.current = new Map()
      dispatch({ type: 'RESTORE', payload: local ?? { tasks: [], runningId: null, runningCallId: null } })
      remoteReadyRef.current = true
      setRemoteReady(true)
    }
  }, [user])

  // ── Persistence save ──────────────────────────────────────────────────────
  useEffect(() => {
    // Use the ref (not state) so we catch the synchronous block set by the auth
    // effect above even when both effects fire in the same render commit.
    if (!remoteReadyRef.current) return

    const payload = {
      tasks: state.tasks,
      runningId: state.runningId,
      runningCallId: state.runningCallId,
    }

    if (user) {
      saveRemote(user.id, { ...payload, version: remoteVersionRef.current }).then(({ conflict }) => {
        if (conflict) {
          // Another device saved a newer version — reload from the latest state.
          fetchRemoteState(user.id).then(({ payload: fresh, version }) => {
            remoteVersionRef.current = version
            prevTasksRef.current = new Map()
            dispatch({ type: 'RESTORE', payload: fresh })
          })
        } else {
          remoteVersionRef.current = (remoteVersionRef.current ?? 0) + 1
        }
      })
    } else {
      saveLocal(payload)
    }
  }, [user, remoteReady, state.tasks, state.runningId, state.runningCallId])

  // ── Per-task sync to normalized tasks table ───────────────────────────────
  // Fires after any state.tasks change. Compares against prevTasksRef to find
  // only the tasks that actually changed, then upserts each one individually.
  // New tasks (id not in prevTasksRef) are skipped here — syncTaskRemote is
  // called immediately in startTask/startCall for those.
  // Soft-deleted tasks are also skipped — softDeleteTaskRemote handles those.
  useEffect(() => {
    if (!user || !remoteReadyRef.current) return

    const prevMap = prevTasksRef.current
    const changed = []

    for (const task of state.tasks) {
      const prevStr = prevMap.get(task.id)
      if (prevStr === undefined) continue // new task — handled by startTask/startCall
      if (task.deletedAt && !JSON.parse(prevStr).deletedAt) continue // handled by deleteTask
      if (prevStr !== JSON.stringify(task)) changed.push(task)
    }

    prevTasksRef.current = new Map(state.tasks.map((t) => [t.id, JSON.stringify(t)]))

    for (const task of changed) {
      syncTaskRemote(user.id, task)
    }
  }, [state.tasks, user])

  // ── reload — called by App.jsx after migration decision ───────────────────
  const reload = useCallback(async () => {
    remoteReadyRef.current = false
    setRemoteReady(false)
    if (user) {
      const { payload, version } = await fetchRemoteState(user.id)
      remoteVersionRef.current = version
      prevTasksRef.current = new Map()
      dispatch({ type: 'RESTORE', payload })
    } else {
      const local = loadLocal()
      prevTasksRef.current = new Map()
      dispatch({ type: 'RESTORE', payload: local ?? { tasks: [], runningId: null, runningCallId: null } })
    }
    remoteReadyRef.current = true
    setRemoteReady(true)
  }, [user])

  // ── Action dispatchers ────────────────────────────────────────────────────
  const setDescription = useCallback((value) => {
    dispatch({ type: 'SET_DESCRIPTION', payload: value })
  }, [])

  const startTask = useCallback(() => {
    const startISO = nowISO()
    const task = {
      id: uid(),
      description: state.description.trim(),
      startISO,
      endISO: null,
      usePomodo: state.usePomodo ?? false,
      pomodoroFocusMinutes: state.pomodoroFocusMinutes,
      pomodoroSessions: state.usePomodo ? [{ startISO, endISO: null, breaks: [] }] : [],
      totalBreakTime: 0,
    }
    dispatch({ type: 'START_TASK', payload: task })
    if (user) syncTaskRemote(user.id, task)
  }, [state.description, state.usePomodo, state.pomodoroFocusMinutes, user])

  const stopTask = useCallback(() => {
    dispatch({ type: 'STOP_TASK', payload: { endISO: nowISO() } })
  }, [])

  const resumeTask = useCallback((taskId) => {
    dispatch({
      type: 'RESUME_TASK',
      payload: {
        taskId,
        startISO: nowISO(),
      },
    })
  }, [])

  const startCall = useCallback(() => {
    const call = { id: uid(), description: 'Call -', startISO: nowISO(), endISO: null }
    dispatch({ type: 'START_CALL', payload: call })
    if (user) syncTaskRemote(user.id, call)
  }, [user])

  const stopCall = useCallback(() => {
    dispatch({ type: 'STOP_CALL', payload: { endISO: nowISO() } })
  }, [])

  const updateTaskDescription = useCallback((taskId, description) => {
    dispatch({
      type: 'UPDATE_TASK_DESCRIPTION',
      payload: { id: taskId, description: description.trim() },
    })
  }, [])

  const setStatus = useCallback((value) => {
    dispatch({ type: 'SET_STATUS', payload: value })
  }, [])

  const setUsePomodo = useCallback((value) => {
    dispatch({ type: 'SET_USE_POMODO', payload: value })
  }, [])

  const setPomodoroFocusMinutes = useCallback((value) => {
    dispatch({ type: 'SET_POMODORO_FOCUS_MINUTES', payload: value })
  }, [])

  const addBreakToSession = useCallback((breakType, duration) => {
    dispatch({
      type: 'ADD_BREAK_TO_SESSION',
      payload: {
        breakType,
        duration,
        startISO: nowISO(),
      },
    })
  }, [])

  const startNewPomodoroSession = useCallback(() => {
    dispatch({
      type: 'START_NEW_POMODORO_SESSION',
      payload: { startISO: nowISO() },
    })
  }, [])

  const updateLastBreakDuration = useCallback((taskId, duration) => {
    dispatch({
      type: 'UPDATE_LAST_BREAK_DURATION',
      payload: {
        taskId,
        duration,
      },
    })
  }, [])

  const deleteTask = useCallback((taskId) => {
    const task = state.tasks.find((t) => t.id === taskId)
    dispatch({ type: 'DELETE_TASK', payload: { taskId, deletedAt: nowISO() } })
    if (user) {
      softDeleteTaskRemote(user.id, taskId)
      if (task?.startISO) deleteTimeEntry(user.id, task.startISO)
    }
  }, [user, state.tasks])

  const isTaskRunning = Boolean(state.runningId)
  const isCallRunning = Boolean(state.runningCallId)

  const rows = useMemo(
    () => [...state.tasks].filter((t) => !t.deletedAt).reverse(),
    [state.tasks],
  )

  return {
    ...state,
    rows,
    isTaskRunning,
    isCallRunning,
    isAnyRunning: isTaskRunning || isCallRunning,
    remoteReady,
    reload,
    setDescription,
    startTask,
    stopTask,
    resumeTask,
    startCall,
    stopCall,
    updateTaskDescription,
    deleteTask,
    setStatus,
    setUsePomodo,
    setPomodoroFocusMinutes,
    addBreakToSession,
    startNewPomodoroSession,
    updateLastBreakDuration,
  }
}
