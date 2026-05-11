export const fmtDate = (date) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date)

export const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : ''

export const nowISO = () => new Date().toISOString()

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const msToHMS = (ms) => {
  if (ms == null || ms < 0) return ''

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export const durationBetween = (startISO, endISO, nowMs = Date.now()) => {
  if (!startISO) return ''

  const startMs = new Date(startISO).getTime()
  const endMs = endISO ? new Date(endISO).getTime() : nowMs

  return msToHMS(endMs - startMs)
}
