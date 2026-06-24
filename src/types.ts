export type PartnerKey = 'A' | 'B'

export interface Partner {
  key: PartnerKey
  name: string
  emoji: string
}

export type Category = 'kitchen' | 'cleaning' | 'shopping' | 'other'
export type Frequency = 'once' | 'repeat'

export interface Chore {
  id: string
  title: string
  points: number // 1..10
  category: Category
  frequency: Frequency
  multiplier: boolean // "nobody wants to do this" -> x2
  archived: boolean
  createdAt: number
}

export interface LogEntry {
  id: string
  choreId: string
  choreTitle: string
  byKey: PartnerKey
  points: number // points actually awarded (incl. multiplier)
  ts: number
}

export interface Reward {
  id: string
  title: string
  cost: number
  emoji: string
  redeemedBy: PartnerKey | 'team' | null
  redeemedAt: number | null
}

export type AchievementType =
  | 'first_chore'
  | 'streak_7'
  | 'week_100'
  | 'team_goal'
  | 'night_owl'
  | 'season_win'

export interface Achievement {
  id: string
  type: AchievementType
  key: PartnerKey | 'team'
  unlockedAt: number
}

export interface WeekSnapshot {
  weekId: string
  startTs: number
  endTs: number
  totals: Record<PartnerKey, number>
  winner: PartnerKey | 'tie'
  teamTotal: number
  teamGoal: number
  teamGoalMet: boolean
  streaks: Record<PartnerKey, number>
  mvpChore: { title: string; count: number } | null
  trend: Record<PartnerKey, number> // delta vs previous week
  perChore: { title: string; count: number; points: number }[]
  closedAt: number
}

export interface Settings {
  partners: Record<PartnerKey, Partner>
  weeklyTeamGoal: number
  // handicap: relative target weight per partner. 1 = equal.
  handicap: Record<PartnerKey, number>
  checkpointTime: string // "21:00"
  checkpointDay: number // 0=Sunday
  notificationsEnabled: boolean
}

export interface Season {
  wins: Record<PartnerKey, number>
  ties: number
}

export interface AppState {
  onboarded: boolean
  settings: Settings
  chores: Chore[]
  log: LogEntry[]
  rewards: Reward[]
  achievements: Achievement[]
  weeks: WeekSnapshot[]
  season: Season
  currentWeekStart: number
}
