import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { loadLocal, loadRemote, saveLocal, saveRemote } from '../lib/storage'
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

    default:
      return state
  }
}

function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function loadInitialState() {
  // Always start from localStorage for the synchronous initializer.
  // When a logged-in session is restored, useEffect below overwrites this
  // with the remote data via RESTORE.
  const local = loadLocal()
  if (local) return { ...initialState, ...local }
  return initialState
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
        loadRemote(user.id).then((remote) => {
          dispatch({ type: 'RESTORE', payload: remote ?? { tasks: [], runningId: null, runningCallId: null } })
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
      saveRemote(user.id, payload)
    } else {
      saveLocal(payload)
    }
  }, [user, remoteReady, state.tasks, state.runningId, state.runningCallId])

  // ── reload — called by App.jsx after migration decision ───────────────────
  const reload = useCallback(async () => {
    remoteReadyRef.current = false
    setRemoteReady(false)
    if (user) {
      const remote = await loadRemote(user.id)
      dispatch({ type: 'RESTORE', payload: remote ?? { tasks: [], runningId: null, runningCallId: null } })
    } else {
      const local = loadLocal()
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
    dispatch({
      type: 'START_TASK',
      payload: {
        id: uid(),
        description: state.description.trim(),
        startISO: nowISO(),
        usePomodo: state.usePomodo ?? false,
        pomodoroFocusMinutes: state.pomodoroFocusMinutes,
      },
    })
  }, [state.description, state.usePomodo, state.pomodoroFocusMinutes])

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
    dispatch({
      type: 'START_CALL',
      payload: {
        id: uid(),
        startISO: nowISO(),
      },
    })
  }, [])

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

  const isTaskRunning = Boolean(state.runningId)
  const isCallRunning = Boolean(state.runningCallId)

  const rows = useMemo(() => [...state.tasks].reverse(), [state.tasks])

  return {
    ...state,
    rows,
    isTaskRunning,
    isCallRunning,
    isAnyRunning: isTaskRunning || isCallRunning,
    reload,
    setDescription,
    startTask,
    stopTask,
    resumeTask,
    startCall,
    stopCall,
    updateTaskDescription,
    setStatus,
    setUsePomodo,
    setPomodoroFocusMinutes,
    addBreakToSession,
    startNewPomodoroSession,
    updateLastBreakDuration,
  }
}
