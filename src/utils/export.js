// ── helpers ───────────────────────────────────────────────────────────────

function fmtHours(seconds) {
  return (Number(seconds) / 3600).toFixed(1) + 'h'
}

function fmtDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Excel export ──────────────────────────────────────────────────────────

export async function exportPersonalToExcel({ periodLabel, summary, dailyRows, topTaskRows }) {
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()

  const summaryData = [
    { Metric: 'Period', Value: periodLabel },
    { Metric: 'Total hours', Value: fmtHours(summary.totalSeconds) },
    { Metric: 'Sessions', Value: summary.sessions },
    { Metric: 'Unique tasks', Value: summary.uniqueTasks },
    { Metric: 'Avg hours / active day', Value: fmtHours(summary.avgDaySeconds) },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Summary')

  const dailyData = dailyRows.map((r) => ({
    Date: r.date,
    Hours: fmtHours(r.totalSeconds),
    Sessions: r.sessions,
    Tasks: r.tasks.join(', '),
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyData.length ? dailyData : [{ Date: 'No data', Hours: '', Sessions: '', Tasks: '' }]), 'Daily Breakdown')

  const taskData = topTaskRows.map((r, i) => ({
    Rank: i + 1,
    Task: r.task_label,
    'Total hours': fmtHours(r.total_seconds),
    Sessions: r.sessions,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskData.length ? taskData : [{ Rank: '', Task: 'No data', 'Total hours': '', Sessions: '' }]), 'Top Tasks')

  XLSX.writeFile(wb, `pomolog-personal-${periodLabel.toLowerCase().replace(/\s+/g, '-')}.xlsx`)
}

export async function exportGroupToExcel({ groupName, periodLabel, leaderboardRows, taskRows }) {
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()

  const lbData = leaderboardRows.map((r, i) => ({
    Rank: i + 1,
    Member: r.nickname,
    'Total hours': fmtHours(r.total_seconds),
    Sessions: r.entry_count,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lbData.length ? lbData : [{ Rank: '', Member: 'No data', 'Total hours': '', Sessions: '' }]), 'Leaderboard')

  const tbData = taskRows.map((r) => ({
    Task: r.task_label,
    'Total hours': fmtHours(r.total_seconds),
    Contributors: r.contributor_count,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tbData.length ? tbData : [{ Task: 'No data', 'Total hours': '', Contributors: '' }]), 'Task Breakdown')

  const safe = (groupName || 'group').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  XLSX.writeFile(wb, `pomolog-${safe}-${periodLabel.toLowerCase().replace(/\s+/g, '-')}.xlsx`)
}

// ── PDF export ────────────────────────────────────────────────────────────

const BRAND = [252, 7, 25]
const CHARCOAL = [37, 38, 41]

function pdfHeader(doc, title, periodLabel) {
  doc.setFontSize(18)
  doc.setTextColor(...BRAND)
  doc.text('PomoLog', 14, 18)
  doc.setFontSize(12)
  doc.setTextColor(...CHARCOAL)
  doc.text(title, 14, 27)
  doc.setFontSize(10)
  doc.setTextColor(90, 92, 99)
  doc.text(`Period: ${periodLabel}`, 14, 34)
  doc.text(`Exported: ${fmtDate(new Date().toISOString())}`, 14, 40)
  return 48
}

export async function exportPersonalToPdf({ periodLabel, summary, dailyRows, topTaskRows }) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  let y = pdfHeader(doc, 'Personal Report', periodLabel)

  doc.setFontSize(11)
  doc.setTextColor(...CHARCOAL)
  doc.text('Summary', 14, y)
  y += 4
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Total hours', fmtHours(summary.totalSeconds)],
      ['Sessions', String(summary.sessions)],
      ['Unique tasks', String(summary.uniqueTasks)],
      ['Avg hours / active day', fmtHours(summary.avgDaySeconds)],
    ],
    headStyles: { fillColor: BRAND },
    theme: 'striped',
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 10

  doc.setFontSize(11)
  doc.setTextColor(...CHARCOAL)
  doc.text('Daily Breakdown', 14, y)
  y += 4
  autoTable(doc, {
    startY: y,
    head: [['Date', 'Hours', 'Sessions', 'Tasks']],
    body: dailyRows.length
      ? dailyRows.map((r) => [r.date, fmtHours(r.totalSeconds), String(r.sessions), r.tasks.slice(0, 3).join(', ') + (r.tasks.length > 3 ? '…' : '')])
      : [['No data', '', '', '']],
    headStyles: { fillColor: BRAND },
    theme: 'striped',
    margin: { left: 14, right: 14 },
    columnStyles: { 3: { cellWidth: 70 } },
  })
  y = doc.lastAutoTable.finalY + 10

  doc.setFontSize(11)
  doc.setTextColor(...CHARCOAL)
  doc.text('Top Tasks', 14, y)
  y += 4
  autoTable(doc, {
    startY: y,
    head: [['Rank', 'Task', 'Total hours', 'Sessions']],
    body: topTaskRows.length
      ? topTaskRows.map((r, i) => [String(i + 1), r.task_label, fmtHours(r.total_seconds), String(r.sessions)])
      : [['', 'No data', '', '']],
    headStyles: { fillColor: BRAND },
    theme: 'striped',
    margin: { left: 14, right: 14 },
  })

  doc.save(`pomolog-personal-${periodLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}

export async function exportGroupToPdf({ groupName, periodLabel, leaderboardRows, taskRows }) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  let y = pdfHeader(doc, `Group Report — ${groupName || ''}`, periodLabel)

  doc.setFontSize(11)
  doc.setTextColor(...CHARCOAL)
  doc.text('Leaderboard', 14, y)
  y += 4
  autoTable(doc, {
    startY: y,
    head: [['Rank', 'Member', 'Total hours', 'Sessions']],
    body: leaderboardRows.length
      ? leaderboardRows.map((r, i) => [String(i + 1), r.nickname, fmtHours(r.total_seconds), String(r.entry_count)])
      : [['', 'No data', '', '']],
    headStyles: { fillColor: BRAND },
    theme: 'striped',
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 10

  doc.setFontSize(11)
  doc.setTextColor(...CHARCOAL)
  doc.text('Task Breakdown', 14, y)
  y += 4
  autoTable(doc, {
    startY: y,
    head: [['Task', 'Total hours', 'Contributors']],
    body: taskRows.length
      ? taskRows.map((r) => [r.task_label, fmtHours(r.total_seconds), String(r.contributor_count)])
      : [['No data', '', '']],
    headStyles: { fillColor: BRAND },
    theme: 'striped',
    margin: { left: 14, right: 14 },
  })

  const safe = (groupName || 'group').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  doc.save(`pomolog-${safe}-${periodLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
