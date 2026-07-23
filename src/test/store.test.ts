import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../store'

function reset() {
  localStorage.clear()
  useStore.getState().resetAll()
}

describe('store: chores CRUD', () => {
  beforeEach(reset)

  it('seeds a default catalog', () => {
    expect(useStore.getState().chores.length).toBeGreaterThan(0)
  })

  it('adds, updates and archives a chore', () => {
    const s = useStore.getState()
    s.addChore({ title: 'Тест', points: 4, category: 'other', frequency: 'once', multiplier: false })
    const added = useStore.getState().chores.find((c) => c.title === 'Тест')!
    expect(added).toBeTruthy()

    useStore.getState().updateChore(added.id, { points: 8 })
    expect(useStore.getState().chores.find((c) => c.id === added.id)!.points).toBe(8)

    useStore.getState().archiveChore(added.id, true)
    expect(useStore.getState().chores.find((c) => c.id === added.id)!.archived).toBe(true)
  })
})

describe('store: logging & points', () => {
  beforeEach(reset)

  it('logs a chore and awards points with multiplier x2', () => {
    const s = useStore.getState()
    s.addChore({ title: 'Туалет', points: 5, category: 'cleaning', frequency: 'repeat', multiplier: true })
    const chore = useStore.getState().chores.find((c) => c.title === 'Туалет')!
    s.logChore(chore.id, 'A')
    const entry = useStore.getState().log[0]
    expect(entry.points).toBe(10) // 5 * 2
    expect(entry.byKey).toBe('A')
  })

  it('grants first_chore achievement on first log', () => {
    const s = useStore.getState()
    const chore = useStore.getState().chores[0]
    s.logChore(chore.id, 'B')
    expect(useStore.getState().achievements.some((a) => a.type === 'first_chore' && a.key === 'B')).toBe(true)
  })

  it('undoes an entry', () => {
    const s = useStore.getState()
    const chore = useStore.getState().chores[0]
    s.logChore(chore.id, 'A')
    const id = useStore.getState().log[0].id
    useStore.getState().undoEntry(id)
    expect(useStore.getState().log.find((e) => e.id === id)).toBeUndefined()
  })
})

describe('store: rewards', () => {
  beforeEach(reset)

  it('redeems a reward', () => {
    const r = useStore.getState().rewards[0]
    useStore.getState().redeemReward(r.id, 'team')
    const updated = useStore.getState().rewards.find((x) => x.id === r.id)!
    expect(updated.redeemedBy).toBe('team')
    expect(updated.redeemedAt).toBeTruthy()
  })

  it('adds a custom reward', () => {
    useStore.getState().addReward({ title: 'Массаж', cost: 90, emoji: '💆' })
    expect(useStore.getState().rewards.some((r) => r.title === 'Массаж')).toBe(true)
  })
})

describe('store: close week', () => {
  beforeEach(reset)

  it('creates a snapshot and increments the season', () => {
    const s = useStore.getState()
    const chore = useStore.getState().chores[0]
    s.logChore(chore.id, 'A')
    s.logChore(chore.id, 'A')
    useStore.getState().closeWeek()
    const st = useStore.getState()
    expect(st.weeks.length).toBe(1)
    expect(st.season.wins.A + st.season.wins.B + st.season.ties).toBe(1)
  })

  it('reopens the last week, restoring the tally and season', () => {
    const s = useStore.getState()
    const chore = useStore.getState().chores[0]
    s.logChore(chore.id, 'A')
    const startBefore = useStore.getState().currentWeekStart
    useStore.getState().closeWeek()
    expect(useStore.getState().weeks.length).toBe(1)

    useStore.getState().reopenWeek()
    const st = useStore.getState()
    expect(st.weeks.length).toBe(0)
    expect(st.currentWeekStart).toBe(startBefore)
    expect(st.season.wins.A + st.season.wins.B + st.season.ties).toBe(0)
  })
})

describe('store: onboarding', () => {
  beforeEach(reset)

  it('completes onboarding with names', () => {
    useStore.getState().completeOnboarding('Аня', 'Боря')
    const st = useStore.getState()
    expect(st.onboarded).toBe(true)
    expect(st.settings.partners.A.name).toBe('Аня')
    expect(st.settings.partners.B.name).toBe('Боря')
  })
})
