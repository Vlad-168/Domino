import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppState,
  Achievement,
  AchievementType,
  Chore,
  LogEntry,
  PartnerKey,
  Reward,
  Settings,
} from './types'
import { buildSnapshot, entriesInRange, streakFor, totalsFor } from './lib/scoring'
import { startOfWeek } from './lib/week'

const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36))

const defaultSettings: Settings = {
  partners: {
    A: { key: 'A', name: 'Партнёр A', emoji: '💜' },
    B: { key: 'B', name: 'Партнёр B', emoji: '💚' },
  },
  weeklyTeamGoal: 120,
  handicap: { A: 1, B: 1 },
  checkpointTime: '21:00',
  checkpointDay: 0,
  notificationsEnabled: false,
}

const seedChores = (): Chore[] => {
  const now = Date.now()
  const mk = (
    title: string,
    points: number,
    category: Chore['category'],
    frequency: Chore['frequency'],
    multiplier = false
  ): Chore => ({
    id: uid(),
    title,
    points,
    category,
    frequency,
    multiplier,
    archived: false,
    createdAt: now,
  })
  return [
    mk('Помыть посуду', 3, 'kitchen', 'repeat'),
    mk('Приготовить ужин', 5, 'kitchen', 'repeat'),
    mk('Пропылесосить', 4, 'cleaning', 'repeat'),
    mk('Вынести мусор', 2, 'cleaning', 'repeat'),
    mk('Помыть туалет', 6, 'cleaning', 'repeat', true),
    mk('Закупка продуктов', 5, 'shopping', 'repeat'),
    mk('Постирать и развесить', 4, 'cleaning', 'repeat'),
    mk('Помыть полы', 5, 'cleaning', 'repeat'),
  ]
}

const seedRewards = (): Reward[] => [
  { id: uid(), title: 'Заказать суши', cost: 200, emoji: '🍣', redeemedBy: null, redeemedAt: null },
  { id: uid(), title: 'Киновечер по выбору победителя', cost: 80, emoji: '🎬', redeemedBy: null, redeemedAt: null },
  { id: uid(), title: 'Выходной без уборки', cost: 150, emoji: '🛋️', redeemedBy: null, redeemedAt: null },
  { id: uid(), title: 'Проигравший готовит ужин', cost: 60, emoji: '🍳', redeemedBy: null, redeemedAt: null },
]

interface Store extends AppState {
  // sync
  householdCode: string | null
  deletedLogIds: string[]
  setHouseholdCode: (code: string | null) => void
  // onboarding
  completeOnboarding: (a: string, b: string) => void
  // chores
  addChore: (c: Omit<Chore, 'id' | 'createdAt' | 'archived'>) => void
  updateChore: (id: string, patch: Partial<Chore>) => void
  archiveChore: (id: string, archived: boolean) => void
  // log
  logChore: (choreId: string, byKey: PartnerKey) => void
  undoEntry: (entryId: string) => void
  // rewards
  addReward: (r: Omit<Reward, 'id' | 'redeemedBy' | 'redeemedAt'>) => void
  redeemReward: (id: string, by: PartnerKey | 'team') => void
  // settings
  updateSettings: (patch: Partial<Settings>) => void
  setPartnerName: (key: PartnerKey, name: string) => void
  // week
  closeWeek: () => void
  reopenWeek: () => void
  // derived helpers (non-reactive)
  currentEntries: () => LogEntry[]
  resetAll: () => void
}

const ACHIEVEMENT_META: Record<AchievementType, { title: string; emoji: string; desc: string }> = {
  first_chore: { title: 'Первое дело', emoji: '🎉', desc: 'Отметить первое выполненное дело' },
  streak_7: { title: 'Неделя в строю', emoji: '🔥', desc: 'Стрик 7 дней подряд' },
  week_100: { title: 'Сотка', emoji: '💯', desc: '100 баллов за неделю' },
  team_goal: { title: 'Команда мечты', emoji: '🤝', desc: 'Достигнута общая недельная цель' },
  night_owl: { title: 'Полуночник', emoji: '🦉', desc: 'Дело после полуночи' },
  season_win: { title: 'Чемпион сезона', emoji: '🏆', desc: 'Победа в недельном зачёте' },
}

export const achievementMeta = ACHIEVEMENT_META

function grant(
  list: Achievement[],
  type: AchievementType,
  key: PartnerKey | 'team'
): Achievement[] {
  if (list.some((a) => a.type === type && a.key === key)) return list
  return [...list, { id: uid(), type, key, unlockedAt: Date.now() }]
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      onboarded: false,
      settings: defaultSettings,
      chores: seedChores(),
      log: [],
      rewards: seedRewards(),
      achievements: [],
      weeks: [],
      season: { wins: { A: 0, B: 0 }, ties: 0 },
      currentWeekStart: startOfWeek(Date.now()),
      householdCode: null,
      deletedLogIds: [],

      setHouseholdCode: (code) => set(() => ({ householdCode: code })),

      completeOnboarding: (a, b) =>
        set((s) => ({
          onboarded: true,
          settings: {
            ...s.settings,
            partners: {
              A: { ...s.settings.partners.A, name: a.trim() || 'Партнёр A' },
              B: { ...s.settings.partners.B, name: b.trim() || 'Партнёр B' },
            },
          },
        })),

      addChore: (c) =>
        set((s) => ({
          chores: [
            ...s.chores,
            { ...c, id: uid(), createdAt: Date.now(), archived: false },
          ],
        })),

      updateChore: (id, patch) =>
        set((s) => ({
          chores: s.chores.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      archiveChore: (id, archived) =>
        set((s) => ({
          chores: s.chores.map((c) => (c.id === id ? { ...c, archived } : c)),
        })),

      logChore: (choreId, byKey) =>
        set((s) => {
          const chore = s.chores.find((c) => c.id === choreId)
          if (!chore) return s
          const points = chore.points * (chore.multiplier ? 2 : 1)
          const entry: LogEntry = {
            id: uid(),
            choreId,
            choreTitle: chore.title,
            byKey,
            points,
            ts: Date.now(),
          }
          const log = [entry, ...s.log]

          // achievements
          let ach = grant(s.achievements, 'first_chore', byKey)
          const hour = new Date(entry.ts).getHours()
          if (hour >= 0 && hour < 5) ach = grant(ach, 'night_owl', byKey)
          if (streakFor(log, byKey) >= 7) ach = grant(ach, 'streak_7', byKey)
          const wkEntries = entriesInRange(log, s.currentWeekStart, s.currentWeekStart + 7 * 86400000)
          const totals = totalsFor(wkEntries)
          if (totals[byKey] >= 100) ach = grant(ach, 'week_100', byKey)
          if (totals.A + totals.B >= s.settings.weeklyTeamGoal) ach = grant(ach, 'team_goal', 'team')

          return { log, achievements: ach }
        }),

      undoEntry: (entryId) =>
        set((s) => ({
          log: s.log.filter((e) => e.id !== entryId),
          deletedLogIds: s.deletedLogIds.includes(entryId)
            ? s.deletedLogIds
            : [...s.deletedLogIds, entryId],
        })),

      addReward: (r) =>
        set((s) => ({
          rewards: [
            ...s.rewards,
            { ...r, id: uid(), redeemedBy: null, redeemedAt: null },
          ],
        })),

      redeemReward: (id, by) =>
        set((s) => ({
          rewards: s.rewards.map((r) =>
            r.id === id ? { ...r, redeemedBy: by, redeemedAt: Date.now() } : r
          ),
        })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      setPartnerName: (key, name) =>
        set((s) => ({
          settings: {
            ...s.settings,
            partners: {
              ...s.settings.partners,
              [key]: { ...s.settings.partners[key], name },
            },
          },
        })),

      closeWeek: () =>
        set((s) => {
          const prev = s.weeks[0] ?? null
          const snap = buildSnapshot(s.log, s.settings, s.currentWeekStart, prev)
          const season = { ...s.season, wins: { ...s.season.wins } }
          if (snap.winner === 'tie') season.ties += 1
          else season.wins[snap.winner] += 1
          let ach = s.achievements
          if (snap.winner !== 'tie') ach = grant(ach, 'season_win', snap.winner)
          if (snap.teamGoalMet) ach = grant(ach, 'team_goal', 'team')
          return {
            weeks: [snap, ...s.weeks],
            season,
            achievements: ach,
            currentWeekStart: startOfWeek(Date.now()) === s.currentWeekStart
              ? s.currentWeekStart + 7 * 86400000
              : startOfWeek(Date.now()),
          }
        }),

      reopenWeek: () =>
        set((s) => {
          const [last, ...rest] = s.weeks
          if (!last) return s
          // Revert the season tally applied when this week was closed.
          const season = { ...s.season, wins: { ...s.season.wins } }
          if (last.winner === 'tie') season.ties = Math.max(0, season.ties - 1)
          else season.wins[last.winner] = Math.max(0, season.wins[last.winner] - 1)
          return {
            weeks: rest,
            season,
            // Return to the week that was closed so the live tally is restored.
            currentWeekStart: last.startTs,
          }
        }),

      currentEntries: () => {
        const s = get()
        return entriesInRange(s.log, s.currentWeekStart, s.currentWeekStart + 7 * 86400000)
      },

      resetAll: () =>
        set(() => ({
          onboarded: false,
          settings: defaultSettings,
          chores: seedChores(),
          log: [],
          rewards: seedRewards(),
          achievements: [],
          weeks: [],
          season: { wins: { A: 0, B: 0 }, ties: 0 },
          currentWeekStart: startOfWeek(Date.now()),
          householdCode: null,
          deletedLogIds: [],
        })),
    }),
    {
      name: 'domino-store-v1',
      version: 1,
    }
  )
)
