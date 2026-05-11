import { useMemo, useState } from 'react'
import './App.css'
import { AppHeader } from './components/AppHeader'
import { ControlsPanel } from './components/ControlsPanel'
import { EditTaskDialog } from './components/EditTaskDialog'
import { TaskTable } from './components/TaskTable'
import { useNowTicker } from './hooks/useNowTicker'
import { useTaskTimer } from './hooks/useTaskTimer'
import { downloadCsv } from './utils/csv'

function App() {
  const {
    tasks,
    rows,
    runningId,
    runningCallId,
    description,
    status,
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
  } = useTaskTimer()

  const [editingTaskId, setEditingTaskId] = useState(null)
  const nowMs = useNowTicker(isAnyRunning)

  const editingTask = useMemo(
    () => tasks.find((task) => task.id === editingTaskId) ?? null,
    [tasks, editingTaskId],
  )

  const handleToggleTask = () => {
    if (isTaskRunning) {
      stopTask()
      return
    }

    startTask()
  }

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
        />

        <TaskTable
          rows={rows}
          totalCount={tasks.length}
          runningId={runningId}
          runningCallId={runningCallId}
          nowMs={nowMs}
          onEdit={handleEditOpen}
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
    </div>
  )
}

export default App
