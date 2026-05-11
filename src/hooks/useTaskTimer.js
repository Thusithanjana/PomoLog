import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { STORAGE_KEY } from '../constants/storage'
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

export function useTaskTimer() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return

    try {
      const {
        tasks = [],
        runningId = null,
        runningCallId = null,
      } = JSON.parse(raw)

      dispatch({
        type: 'RESTORE',
        payload: { tasks, runningId, runningCallId },
      })
    } catch {
      dispatch({
        type: 'SET_STATUS',
        payload: 'Could not restore previous session data.',
      })
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tasks: state.tasks,
        runningId: state.runningId,
        runningCallId: state.runningCallId,
      }),
    )
  }, [state.tasks, state.runningId, state.runningCallId])

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

  const isTaskRunning = Boolean(state.runningId)
  const isCallRunning = Boolean(state.runningCallId)

  const rows = useMemo(() => [...state.tasks].reverse(), [state.tasks])

  return {
    ...state,
    rows,
    isTaskRunning,
    isCallRunning,
    isAnyRunning: isTaskRunning || isCallRunning,
    setDescription,
    startTask,
    stopTask,
    startCall,
    stopCall,
    updateTaskDescription,
    setStatus,
    setUsePomodo,
    setPomodoroFocusMinutes,
    addBreakToSession,
    startNewPomodoroSession,
  }
}
