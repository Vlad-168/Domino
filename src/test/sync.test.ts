import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../store'
import { generateCode } from '../lib/sync'
import { isConfigValid } from '../lib/firebase'

beforeEach(() => {
  localStorage.clear()
  useStore.getState().resetAll()
})

describe('household code', () => {
  it('generates a 6-char code from a safe alphabet', () => {
    const c = generateCode()
    expect(c).toHaveLength(6)
    expect(c).toMatch(/^[A-Z2-9]+$/)
  })

  it('stores and clears the household code', () => {
    useStore.getState().setHouseholdCode('LOVE24')
    expect(useStore.getState().householdCode).toBe('LOVE24')
    useStore.getState().setHouseholdCode(null)
    expect(useStore.getState().householdCode).toBeNull()
  })
})

describe('log tombstones for sync', () => {
  it('records a tombstone when an entry is undone', () => {
    const chore = useStore.getState().chores[0]
    useStore.getState().logChore(chore.id, 'A')
    const id = useStore.getState().log[0].id
    useStore.getState().undoEntry(id)
    expect(useStore.getState().deletedLogIds).toContain(id)
  })
})

describe('firebase config validation', () => {
  it('accepts a complete config', () => {
    expect(
      isConfigValid({ apiKey: 'a', authDomain: 'b', projectId: 'c', appId: 'd' })
    ).toBe(true)
  })
  it('rejects an incomplete config', () => {
    expect(isConfigValid({ apiKey: 'a' })).toBe(false)
    expect(isConfigValid(null)).toBe(false)
  })
})
