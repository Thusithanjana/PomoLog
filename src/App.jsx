import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { AppHeader } from './components/AppHeader'
import { BreakModal } from './components/BreakModal'
import { BreakFinishedModal } from './components/BreakFinishedModal'
import { ConcurrentTaskWarning } from './components/ConcurrentTaskWarning'
import { ControlsPanel } from './components/ControlsPanel'
import { EditTaskDialog } from './components/EditTaskDialog'
import { PomodoroTimerDisplay } from './components/PomodoroTimerDisplay'
import { TaskTable } from './components/TaskTable'
import { MigrationModal } from './components/auth/MigrationModal'
import { GroupDashboard } from './components/groups/GroupDashboard'
import { ReportsDashboard } from './components/reports/ReportsDashboard'
import { useAuth } from './context/AuthContext'
import { useNowTicker } from './hooks/useNowTicker'
import { usePomodoroTimer } from './hooks/usePomodoroTimer'
import { useTaskTimer } from './hooks/useTaskTimer'
import { clearLocal, hasLocalDataToday, migrateLocalToRemote } from './lib/storage'
import { writeTimeEntry } from './lib/groups'
import { downloadCsv } from './utils/csv'
import { notifyTimerComplete } from './utils/notification'
import { msToMMSS } from './utils/pomodoro'

function App() {
  const { user } = useAuth()

  const {
    tasks,
    rows,
    runningId,
    runningCallId,
    description,
    status,
    usePomodo,
    pomodoroFocusMinutes,
    isTaskRunning,
    isCallRunning,
    isAnyRunning,
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
  } = useTaskTimer()

  // ── Migration: offer to move local data on first login ───────────────────
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const prevUserRef = useRef(undefined)

  useEffect(() => {
    const prevUser = prevUserRef.current
    prevUserRef.current = user

    // Only trigger when the user transitions from not-logged-in to logged-in.
    if (user && !prevUser) {
      if (hasLocalDataToday()) {
        setShowMigrationModal(true)
      } else {
        reload()
      }
    }
  }, [user, reload])

  const handleMigrate = async () => {
    setMigrating(true)
    await migrateLocalToRemote(user.id)
    await reload()
    setMigrating(false)
    setShowMigrationModal(false)
  }

  const handleDiscardLocal = async () => {
    clearLocal()
    await reload()
    setShowMigrationModal(false)
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── View + group selection (Pro / logged-in only) ─────────────────────────
  const [view, setView] = useState('timer')
  const [selectedGroupId, setSelectedGroupId] = useState(null)

  // Reset group-related state when user logs out.
  useEffect(() => {
    if (!user) {
      setView('timer')
      setSelectedGroupId(null)
    }
  }, [user])

  const [editingTaskId, setEditingTaskId] = useState(null)
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [breakModalMode, setBreakModalMode] = useState('auto')
  const [showBreakFinishedModal, setShowBreakFinishedModal] = useState(false)
  const [showConcurrentWarning, setShowConcurrentWarning] = useState(false)
  const [breakTaskId, setBreakTaskId] = useState(null)

  const nowMs = useNowTicker(isAnyRunning)

  const runningTask = useMemo(
    () => tasks.find((task) => task.id === runningId),
    [tasks, runningId],
  )

  // When a task stops and a group was selected, write a time_entry to Supabase.
  // Anonymous users never have selectedGroupId set, so this block never runs for them.
  const prevRunningRef = useRef({ id: null, task: null, groupId: null })
  useEffect(() => {
    const prev = prevRunningRef.current
    prevRunningRef.current = {
      id: runningId,
      task: runningTask ? { ...runningTask } : null,
      groupId: selectedGroupId,
    }

    if (prev.id && !runningId && user && prev.task) {
      const wallMs = Date.now() - new Date(prev.task.startISO).getTime()
      const netMs = wallMs - (prev.task.totalBreakTime || 0)
      const durationSeconds = Math.round(netMs / 1000)
      if (durationSeconds > 0 && durationSeconds < 86400) {
        writeTimeEntry(user.id, {
          taskLabel: prev.task.description,
          startedAt: prev.task.startISO,
          durationSeconds,
          groupId: prev.groupId,
        })
      }
    }
  }, [runningId, runningTask, user, selectedGroupId])

  const editingTask = useMemo(
    () => tasks.find((task) => task.id === editingTaskId) ?? null,
    [tasks, editingTaskId],
  )

  const breakTask = useMemo(
    () => tasks.find((task) => task.id === breakTaskId) ?? null,
    [tasks, breakTaskId],
  )

  const activeFocusMinutes =
    runningTask?.pomodoroFocusMinutes ??
    breakTask?.pomodoroFocusMinutes ??
    pomodoroFocusMinutes

  const pomodoroTimer = usePomodoroTimer(
    isTaskRunning && runningTask?.usePomodo,
    useCallback((wasBreakTime) => {
      if (wasBreakTime && breakTaskId) {
        notifyTimerComplete(breakTask?.description)
        setShowBreakFinishedModal(true)
        setStatus('Break finished. Resume your task.')
        return
      }

      if (isTaskRunning && runningTask?.usePomodo) {
        notifyTimerComplete(runningTask?.description)
        setBreakModalMode('auto')
        setShowBreakModal(true)
      }
    }, [isTaskRunning, runningTask, breakTaskId, breakTask, setStatus]),
    activeFocusMinutes,
  )

  const handleTakeBreak = useCallback(() => {
    if (!isTaskRunning || !runningTask?.usePomodo) return
    setBreakModalMode('manual')
    setShowBreakModal(true)
  }, [isTaskRunning, runningTask])

  useEffect(() => {
    const baseTitle = 'PomoLog'

    if (pomodoroTimer.isBreakTime && breakTaskId) {
      document.title = `${msToMMSS(pomodoroTimer.timeRemaining)} Break | ${baseTitle}`
      return
    }

    if (isTaskRunning && runningTask?.usePomodo) {
      const phase = pomodoroTimer.isBreakTime ? 'Break' : 'Focus'
      document.title = `${msToMMSS(pomodoroTimer.timeRemaining)} ${phase} | ${baseTitle}`
      return
    }

    document.title = baseTitle
  }, [
    isTaskRunning,
    runningTask,
    breakTaskId,
    pomodoroTimer.isBreakTime,
    pomodoroTimer.timeRemaining,
  ])

  const finalizeBreakDuration = useCallback(() => {
    if (!breakTaskId || !pomodoroTimer.breakDuration) return

    const planned = pomodoroTimer.breakDuration.ms || 0
    const elapsed = Math.max(0, planned - pomodoroTimer.timeRemaining)
    const normalizedElapsed = Math.min(planned, elapsed)

    updateLastBreakDuration(breakTaskId, normalizedElapsed)
  }, [
    breakTaskId,
    pomodoroTimer.breakDuration,
    pomodoroTimer.timeRemaining,
    updateLastBreakDuration,
  ])

  const resumeBreakTaskNow = useCallback(() => {
    if (!breakTaskId) return

    finalizeBreakDuration()
    resumeTask(breakTaskId)
    setBreakTaskId(null)
    pomodoroTimer.resetTimer()
    setShowBreakFinishedModal(false)
    setStatus('Task resumed after break.')
  }, [
    breakTaskId,
    finalizeBreakDuration,
    resumeTask,
    pomodoroTimer,
    setStatus,
  ])

  const handleToggleTask = useCallback(() => {
    if (isTaskRunning) {
      stopTask()
      return
    }

    if (breakTaskId && pomodoroTimer.isBreakTime) {
      resumeBreakTaskNow()
      return
    }

    startTask()
  }, [
    isTaskRunning,
    breakTaskId,
    pomodoroTimer.isBreakTime,
    resumeBreakTaskNow,
    startTask,
    stopTask,
  ])

  const handleFocusMinutesChange = useCallback(
    (value) => {
      const parsed = Number.parseInt(value, 10)
      if (Number.isNaN(parsed)) return
      const clamped = Math.min(180, Math.max(1, parsed))
      setPomodoroFocusMinutes(clamped)
    },
    [setPomodoroFocusMinutes],
  )

  const handleToggleCall = () => {
    if (isCallRunning) {
      stopCall()
      return
    }

    startCall()
  }

  const handleSaveCsv = () => {
    downloadCsv(tasks)
    setStatus('Tasks saved to CSV.')
  }

  const handleEditOpen = (taskId) => {
    setEditingTaskId(taskId)
  }

  const handleEditCancel = () => {
    setEditingTaskId(null)
  }

  const handleEditSave = (newDescription) => {
    if (!editingTask) return

    updateTaskDescription(editingTask.id, newDescription)
    setEditingTaskId(null)
  }

  const handleBreakShort = () => {
    if (!runningTask) return

    setBreakTaskId(runningTask.id)
    addBreakToSession('short', 5 * 60 * 1000)
    stopTask()
    setShowBreakModal(false)
    pomodoroTimer.selectBreak('short')

    // After break, task stays paused until user manually resumes
    setStatus('Short break started. Resume task when ready.')
  }

  const handleBreakLong = () => {
    if (!runningTask) return

    setBreakTaskId(runningTask.id)
    addBreakToSession('long', 45 * 60 * 1000)
    stopTask()
    setShowBreakModal(false)
    pomodoroTimer.selectBreak('long')

    setStatus('Long break started. Resume task when ready.')
  }

  const handleBreakSkip = () => {
    if (breakModalMode === 'manual') {
      setShowBreakModal(false)
      setStatus('Continuing current task.')
      return
    }

    if (!runningTask) return

    setBreakTaskId(null)
    stopTask()
    setShowBreakModal(false)
    pomodoroTimer.skipBreak()
    startNewPomodoroSession()

    setStatus('Starting another Pomodoro session...')
  }

  const handleBreakContinue = () => {
    if (breakModalMode === 'manual') {
      setShowBreakModal(false)
      setStatus('Continuing current task.')
      return
    }

    setBreakTaskId(null)
    setShowBreakModal(false)
    pomodoroTimer.resetTimer()
    setStatus('Task resumed without break.')
  }

  const handleBreakResumeNow = () => {
    resumeBreakTaskNow()
  }

  const handleResumeDuringBreak = () => {
    resumeBreakTaskNow()
  }

  const handleBreakResumeLater = () => {
    setShowBreakFinishedModal(false)
    setStatus('Break finished. Resume task when ready.')
  }

  const handleConcurrentPause = () => {
    stopTask()
    setShowConcurrentWarning(false)
    startTask()
  }

  const handleConcurrentStop = () => {
    stopTask()
    setShowConcurrentWarning(false)
    startTask()
  }

  const handleConcurrentCancel = () => {
    setShowConcurrentWarning(false)
  }

  return (
    <div className="app">
      <AppHeader view={view} onViewChange={setView} />

      {view === 'reports' ? <ReportsDashboard /> : view === 'groups' ? <GroupDashboard /> : <section className="panel">
        <ControlsPanel
          description={description}
          onDescriptionChange={setDescription}
          onToggleTask={handleToggleTask}
          onTakeBreak={handleTakeBreak}
          onResumeDuringBreak={handleResumeDuringBreak}
          onToggleCall={handleToggleCall}
          onSaveCsv={handleSaveCsv}
          isTaskRunning={isTaskRunning}
          isCallRunning={isCallRunning}
          canTakeBreak={isTaskRunning && runningTask?.usePomodo && !pomodoroTimer.isBreakTime}
          canResumeDuringBreak={!isTaskRunning && pomodoroTimer.isBreakTime && Boolean(breakTaskId)}
          usePomodo={usePomodo}
          onTogglePomodo={setUsePomodo}
          pomodoroFocusMinutes={pomodoroFocusMinutes}
          onPomodoroFocusMinutesChange={handleFocusMinutesChange}
          selectedGroupId={selectedGroupId}
          onGroupChange={setSelectedGroupId}
        />

        {isTaskRunning && runningTask?.usePomodo && (
          <PomodoroTimerDisplay
            timeRemaining={pomodoroTimer.timeRemaining}
            isBreakTime={pomodoroTimer.isBreakTime}
          />
        )}

        {!isTaskRunning && pomodoroTimer.isBreakTime && breakTask && (
          <PomodoroTimerDisplay
            timeRemaining={pomodoroTimer.timeRemaining}
            isBreakTime={pomodoroTimer.isBreakTime}
          />
        )}

        <TaskTable
          rows={rows}
          totalCount={tasks.length}
          runningId={runningId}
          runningCallId={runningCallId}
          nowMs={nowMs}
          onEdit={handleEditOpen}
          breakTaskId={breakTaskId}
          isBreakTime={pomodoroTimer.isBreakTime}
          breakTimeRemaining={pomodoroTimer.timeRemaining}
        />

        <div className="footer-actions">
          <div className="hint">{status}</div>
          <div className="hint">Tip: Click "Edit" to change any description.</div>
        </div>
      </section>}

      <EditTaskDialog
        task={editingTask}
        onCancel={handleEditCancel}
        onSave={handleEditSave}
      />

      {showBreakModal && (
        <BreakModal
          onShortBreak={handleBreakShort}
          onLongBreak={handleBreakLong}
          onSkip={handleBreakSkip}
          onContinue={handleBreakContinue}
          focusMinutes={runningTask?.pomodoroFocusMinutes ?? pomodoroFocusMinutes}
          mode={breakModalMode}
        />
      )}

      {showBreakFinishedModal && (
        <BreakFinishedModal
          onResumeNow={handleBreakResumeNow}
          onResumeLater={handleBreakResumeLater}
        />
      )}

      {showConcurrentWarning && (
        <ConcurrentTaskWarning
          runningTaskDescription={runningTask?.description}
          onPauseAndStart={handleConcurrentPause}
          onStopAndStart={handleConcurrentStop}
          onCancel={handleConcurrentCancel}
        />
      )}

      {showMigrationModal && (
        <MigrationModal
          onMigrate={handleMigrate}
          onDiscard={handleDiscardLocal}
          migrating={migrating}
        />
      )}
    </div>
  )
}

export default App
