import { useEffect, useState } from 'react'

export function EditTaskDialog({ task, onCancel, onSave }) {
  const [value, setValue] = useState(task?.description ?? '')

  useEffect(() => {
    setValue(task?.description ?? '')
  }, [task])

  if (!task) return null

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="edit-title">Edit description</h2>
        <textarea
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Update task description"
        />

        <div className="dialog-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={() => onSave(value)}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
