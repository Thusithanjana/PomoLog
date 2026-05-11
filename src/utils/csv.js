import { durationBetween, fmtTime } from './time'

const escapeCsvField = (value) => {
  const stringValue = String(value ?? '')
  const needsEscape = /[\",\n]/.test(stringValue)
  const escaped = stringValue.replace(/"/g, '""')
  return needsEscape ? `"${escaped}"` : stringValue
}

export const buildCsv = (tasks) => {
  const header = ['No', 'Description', 'Start Time', 'End Time', 'Duration']
  const rows = [...tasks].reverse()

  const data = rows.map((task, index) => [
    rows.length - index,
    (task.description || '').replace(/\s+/g, ' ').trim(),
    fmtTime(task.startISO),
    fmtTime(task.endISO),
    durationBetween(task.startISO, task.endISO),
  ])

  const lines = [header, ...data].map((row) =>
    row.map((cell) => escapeCsvField(cell)).join(','),
  )

  return '\uFEFF' + lines.join('\n') + '\n'
}

export const downloadCsv = (tasks, fileName = 'tasks.csv') => {
  const csv = buildCsv(tasks)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()

  URL.revokeObjectURL(url)
}
