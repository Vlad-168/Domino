import { describe, expect, it } from 'vitest'
import {
  buildSnapshot,
  entriesInRange,
  mvpChore,
  perChoreBreakdown,
  personalTargets,
  streakFor,
  teamTotal,
  totalsFor,
  winnerOf,
} from '../lib/scoring'
import { startOfWeek, weekIdFor, sameDay, dayKey } from '../lib/week'
import type { LogEntry, Settings } from '../types'

const baseSettings: Settings = {
  partners: {
    A: { key: 'A', name: 'Аня', emoji: '💜' },
    B: { key: 'B', name: 'Боря', emoji: '💚' },
  },
  weeklyTeamGoal: 100,
  handicap: { A: 1, B: 1 },
  checkpointTime: '21:00',
  checkpointDay: 0,
  notificationsEnabled: false,
}

function entry(byKey: 'A' | 'B', points: number, ts: number, title = 'Дело'): LogEntry {
  return { id: Math.random().toString(36), choreId: 'c', choreTitle: title, byKey, points, ts }
}

describe('totals & team', () => {
  it('sums per partner', () => {
    const e = [entry('A', 3, 1), entry('A', 2, 2), entry('B', 5, 3)]
    const t = totalsFor(e)
    expect(t).toEqual({ A: 5, B: 5 })
    expect(teamTotal(t)).toBe(10)
  })
})

describe('personalTargets handicap', () => {
  it('splits equally with handicap 1/1', () => {
    expect(personalTargets(baseSettings)).toEqual({ A: 50, B: 50 })
  })
  it('splits proportionally with handicap', () => {
    const s = { ...baseSettings, handicap: { A: 1.5, B: 1 } }
    const t = personalTargets(s)
    expect(t.A).toBe(60)
    expect(t.B).toBe(40)
  })
})

describe('winnerOf with fairness', () => {
  it('ties when equal', () => {
    expect(winnerOf({ A: 50, B: 50 }, baseSettings)).toBe('tie')
  })
  it('A wins on raw points when targets equal', () => {
    expect(winnerOf({ A: 60, B: 40 }, baseSettings)).toBe('A')
  })
  it('handicap can flip the winner', () => {
    // A has higher target (1.5), so equal raw points -> B wins by ratio
    const s = { ...baseSettings, handicap: { A: 1.5, B: 1 } }
    expect(winnerOf({ A: 50, B: 50 }, s)).toBe('B')
  })
})

describe('streakFor', () => {
  it('counts consecutive days ending today', () => {
    const now = Date.now()
    const day = 86400000
    const e = [entry('A', 1, now), entry('A', 1, now - day), entry('A', 1, now - 2 * day)]
    expect(streakFor(e, 'A', now)).toBe(3)
  })
  it('breaks on a gap', () => {
    const now = Date.now()
    const day = 86400000
    const e = [entry('A', 1, now), entry('A', 1, now - 2 * day)]
    expect(streakFor(e, 'A', now)).toBe(1)
  })
  it('is zero with no recent entries', () => {
    const now = Date.now()
    const e = [entry('A', 1, now - 5 * 86400000)]
    expect(streakFor(e, 'A', now)).toBe(0)
  })
})

describe('mvp & breakdown', () => {
  it('finds most frequent chore', () => {
    const e = [entry('A', 3, 1, 'Посуда'), entry('B', 3, 2, 'Посуда'), entry('A', 5, 3, 'Ужин')]
    expect(mvpChore(e)).toEqual({ title: 'Посуда', count: 2 })
  })
  it('breaks down and sorts by points', () => {
    const e = [entry('A', 3, 1, 'Посуда'), entry('B', 10, 2, 'Туалет')]
    const b = perChoreBreakdown(e)
    expect(b[0].title).toBe('Туалет')
    expect(b[0].points).toBe(10)
  })
})

describe('entriesInRange', () => {
  it('filters by [start,end)', () => {
    const e = [entry('A', 1, 100), entry('A', 1, 200), entry('A', 1, 300)]
    expect(entriesInRange(e, 150, 300)).toHaveLength(1)
  })
})

describe('week helpers', () => {
  it('startOfWeek lands on Monday 00:00', () => {
    const s = startOfWeek(new Date('2026-06-24T15:00:00').getTime()) // Wednesday
    const d = new Date(s)
    expect(d.getDay()).toBe(1)
    expect(d.getHours()).toBe(0)
  })
  it('weekIdFor is stable within a week', () => {
    const a = weekIdFor(new Date('2026-06-22T00:00:00').getTime())
    const b = weekIdFor(new Date('2026-06-24T00:00:00').getTime())
    expect(a).toBe(b)
  })
  it('sameDay & dayKey', () => {
    const t = Date.now()
    expect(sameDay(t, t + 1000)).toBe(true)
    expect(dayKey(t)).toBe(dayKey(t + 1000))
  })
})

describe('buildSnapshot', () => {
  it('produces a complete weekly snapshot', () => {
    const ws = startOfWeek(Date.now())
    const e = [
      entry('A', 60, ws + 1000, 'Посуда'),
      entry('B', 50, ws + 2000, 'Ужин'),
    ]
    const snap = buildSnapshot(e, baseSettings, ws, null)
    expect(snap.totals).toEqual({ A: 60, B: 50 })
    expect(snap.teamTotal).toBe(110)
    expect(snap.teamGoalMet).toBe(true)
    expect(snap.winner).toBe('A')
    expect(snap.mvpChore?.count).toBe(1)
    expect(snap.perChore).toHaveLength(2)
  })
  it('computes trend vs previous snapshot', () => {
    const ws = startOfWeek(Date.now())
    const prev = buildSnapshot([entry('A', 20, ws + 1000)], baseSettings, ws, null)
    const cur = buildSnapshot([entry('A', 50, ws + 1000)], baseSettings, ws, prev)
    expect(cur.trend.A).toBe(30)
  })
})
