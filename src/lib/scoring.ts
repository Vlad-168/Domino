import type { LogEntry, PartnerKey, Settings, WeekSnapshot } from '../types'
import { dayKey, startOfWeek } from './week'

export function entriesInRange(log: LogEntry[], start: number, end: number): LogEntry[] {
  return log.filter((e) => e.ts >= start && e.ts < end)
}

export function totalsFor(entries: LogEntry[]): Record<PartnerKey, number> {
  const t: Record<PartnerKey, number> = { A: 0, B: 0 }
  for (const e of entries) t[e.byKey] += e.points
  return t
}

export function teamTotal(totals: Record<PartnerKey, number>): number {
  return totals.A + totals.B
}

// Personal target with handicap. Goal is split by handicap weights.
export function personalTargets(
  settings: Settings
): Record<PartnerKey, number> {
  const wA = settings.handicap.A
  const wB = settings.handicap.B
  const sum = wA + wB || 1
  const goal = settings.weeklyTeamGoal
  return {
    A: Math.round((goal * wA) / sum),
    B: Math.round((goal * wB) / sum),
  }
}

export function winnerOf(
  totals: Record<PartnerKey, number>,
  settings: Settings
): PartnerKey | 'tie' {
  // Compare against personal handicapped targets -> fairness layer.
  const targets = personalTargets(settings)
  const ratioA = totals.A / (targets.A || 1)
  const ratioB = totals.B / (targets.B || 1)
  if (Math.abs(ratioA - ratioB) < 1e-9) return 'tie'
  return ratioA > ratioB ? 'A' : 'B'
}

// Streak = consecutive days (ending today or yesterday) with >=1 entry by partner.
export function streakFor(log: LogEntry[], key: PartnerKey, now = Date.now()): number {
  const days = new Set(log.filter((e) => e.byKey === key).map((e) => dayKey(e.ts)))
  let streak = 0
  const cursor = new Date(now)
  cursor.setHours(0, 0, 0, 0)
  // allow today missing but yesterday present to still count from yesterday
  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(dayKey(cursor.getTime()))) return 0
  }
  while (days.has(dayKey(cursor.getTime()))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function mvpChore(entries: LogEntry[]): { title: string; count: number } | null {
  const counts = new Map<string, number>()
  for (const e of entries) counts.set(e.choreTitle, (counts.get(e.choreTitle) ?? 0) + 1)
  let best: { title: string; count: number } | null = null
  for (const [title, count] of counts) {
    if (!best || count > best.count) best = { title, count }
  }
  return best
}

export function perChoreBreakdown(entries: LogEntry[]) {
  const map = new Map<string, { count: number; points: number }>()
  for (const e of entries) {
    const cur = map.get(e.choreTitle) ?? { count: 0, points: 0 }
    cur.count++
    cur.points += e.points
    map.set(e.choreTitle, cur)
  }
  return [...map.entries()]
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.points - a.points)
}

// Build a snapshot for the week containing `weekStart`.
export function buildSnapshot(
  log: LogEntry[],
  settings: Settings,
  weekStart: number,
  prevSnapshot: WeekSnapshot | null
): WeekSnapshot {
  const end = weekStart + 7 * 86400000
  const entries = entriesInRange(log, weekStart, end)
  const totals = totalsFor(entries)
  const team = teamTotal(totals)
  const winner = winnerOf(totals, settings)
  const prevTotals = prevSnapshot?.totals ?? { A: 0, B: 0 }
  const weekId = isoWeekId(weekStart)
  return {
    weekId,
    startTs: weekStart,
    endTs: end,
    totals,
    winner,
    teamTotal: team,
    teamGoal: settings.weeklyTeamGoal,
    teamGoalMet: team >= settings.weeklyTeamGoal,
    streaks: {
      A: streakFor(entries, 'A', end - 1),
      B: streakFor(entries, 'B', end - 1),
    },
    mvpChore: mvpChore(entries),
    trend: { A: totals.A - prevTotals.A, B: totals.B - prevTotals.B },
    perChore: perChoreBreakdown(entries),
    closedAt: Date.now(),
  }
}

function isoWeekId(weekStart: number): string {
  const start = startOfWeek(weekStart)
  const d = new Date(start)
  const onejan = new Date(d.getFullYear(), 0, 1).getTime()
  const week = Math.ceil(((start - onejan) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}
