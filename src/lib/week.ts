// Week helpers. Week starts Monday 00:00 local time.

export function startOfWeek(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 Sun .. 6 Sat
  const diff = (day === 0 ? 6 : day - 1) // days since Monday
  d.setDate(d.getDate() - diff)
  return d.getTime()
}

export function endOfWeek(weekStart: number): number {
  return weekStart + 7 * 24 * 60 * 60 * 1000
}

export function weekIdFor(ts: number): string {
  const start = startOfWeek(ts)
  const d = new Date(start)
  // ISO-ish week id: YYYY-Www
  const onejan = new Date(d.getFullYear(), 0, 1).getTime()
  const week = Math.ceil(((start - onejan) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export function formatRange(start: number, end: number): string {
  const f = (t: number) =>
    new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  return `${f(start)} – ${f(end - 1)}`
}

export function sameDay(a: number, b: number): boolean {
  const da = new Date(a), db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
