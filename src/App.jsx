import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { AppHeader } from './components/AppHeader'
import { BreakModal } from './components/BreakModal'
import { ConcurrentTaskWarning } from './components/ConcurrentTaskWarning'
import { ControlsPanel } from './components/ControlsPanel'
import { EditTaskDialog } from './components/EditTaskDialog'
import { PomodoroTimerDisplay } from './components/PomodoroTimerDisplay'
import { TaskTable } from './components/TaskTable'
import { useNowTicker } from './hooks/useNowTicker'
import { usePomodoroTimer } from './hooks/usePomodoroTimer'
import { useTaskTimer } from './hooks/useTaskTimer'
import { downloadCsv } from './utils/csv'
import { notifyTimerComplete } from './utils/notification'
import { msToMMSS } from './utils/pomodoro'

function App() {
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
  } = useTaskTimer()

  const [editingTaskId, setEditingTaskId] = useState(null)
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [showConcurrentWarning, setShowConcurrentWarning] = useState(false)

  const nowMs = useNowTicker(isAnyRunning)

  const runningTask = useMemo(
    () => tasks.find((task) => task.id === runningId),
    [tasks, runningId],
  )

  const editingTask = useMemo(
    () => tasks.find((task) => task.id === editingTaskId) ?? null,
    [tasks, editingTaskId],
  )

  const pomodoroTimer = usePomodoroTimer(
    isTaskRunning && runningTask?.usePomodo,
    useCallback(() => {
      if (isTaskRunning && runningTask?.usePomodo) {
        notifyTimerComplete(runningTask?.description)
        setShowBreakModal(true)
      }
    }, [isTaskRunning, runningTask]),
    runningTask?.pomodoroFocusMinutes ?? pomodoroFocusMinutes,
  )

  useEffect(() => {
    const baseTitle = 'PromoLog'

    if (isTaskRunning && runningTask?.usePomodo) {
      const phase = pomodoroTimer.isBreakTime ? 'Break' : 'Focus'
      document.title = `${msToMMSS(pomodoroTimer.timeRemaining)} ${phase} | ${baseTitle}`
      return
    }

    document.title = baseTitle
  }, [
    isTaskRunning,
    runningTask,
    pomodoroTimer.isBreakTime,
    pomodoroTimer.timeRemaining,
  ])

  const handleToggleTask = useCallback(() => {
    if (isTaskRunning) {
      stopTask()
      return
    }

    startTask()
  }, [isTaskRunning, startTask, stopTask])

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

    addBreakToSession('short', 5 * 60 * 1000)
    stopTask()
    setShowBreakModal(false)
    pomodoroTimer.selectBreak('short')

    // After break, task stays paused until user manually resumes
    setStatus('Short break started. Resume task when ready.')
  }

  const handleBreakLong = () => {
    if (!runningTask) return

    addBreakToSession('long', 45 * 60 * 1000)
    stopTask()
    setShowBreakModal(false)
    pomodoroTimer.selectBreak('long')

    setStatus('Long break started. Resume task when ready.')
  }

  const handleBreakSkip = () => {
    if (!runningTask) return

    stopTask()
    setShowBreakModal(false)
    pomodoroTimer.skipBreak()
    startNewPomodoroSession()

    setStatus('Starting another Pomodoro session...')
  }

  const handleBreakContinue = () => {
    setShowBreakModal(false)
    pomodoroTimer.resetTimer()
    setStatus('Task resumed without break.')
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
      <AppHeader />

      <section className="panel">
        <ControlsPanel
          description={description}
          onDescriptionChange={setDescription}
          onToggleTask={handleToggleTask}
          onToggleCall={handleToggleCall}
          onSaveCsv={handleSaveCsv}
          isTaskRunning={isTaskRunning}
          isCallRunning={isCallRunning}
          usePomodo={usePomodo}
          onTogglePomodo={setUsePomodo}
          pomodoroFocusMinutes={pomodoroFocusMinutes}
          onPomodoroFocusMinutesChange={handleFocusMinutesChange}
        />

        {isTaskRunning && runningTask?.usePomodo && (
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
          tasks={tasks}
        />

        <div className="footer-actions">
          <div className="hint">{status}</div>
          <div className="hint">Tip: Click "Edit" to change any description.</div>
        </div>
      </section>

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
    </div>
  )
}

export default App
