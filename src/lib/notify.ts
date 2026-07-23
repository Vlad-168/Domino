// Local notifications that motivate the partner when the other logs a chore.
// On iOS these only fire when the app is installed to the Home Screen (PWA)
// and notification permission has been granted.
import type { LogEntry, Settings } from '../types'

const CHEERS = [
  'Не отставай! 💪',
  'Твой ход! 🔥',
  'Догоняй счёт! 🏁',
  'Пора и тебе набрать баллов! ⚡️',
  'Соревнование в разгаре! 🏆',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function canNotify(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

/** Fire a motivational notification about a chore the partner just logged. */
export async function notifyChoreLogged(entry: LogEntry, settings: Settings) {
  if (!canNotify()) return
  const name = settings.partners[entry.byKey]?.name ?? 'Партнёр'
  const title = `🔥 ${name} набирает очки!`
  const body = `${name}: ${entry.choreTitle} +${entry.points} ${pluralPoints(entry.points)}. ${pick(CHEERS)}`
  const options: NotificationOptions = {
    body,
    tag: `chore-${entry.id}`, // dedupe if fired twice
    icon: '/Domino/icons/icon-192.png',
    badge: '/Domino/icons/icon-192.png',
    data: { url: '/Domino/' },
  }
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    try {
      new Notification(title, options)
    } catch {
      /* ignore */
    }
  }
}

function pluralPoints(n: number): string {
  const abs = Math.abs(n) % 100
  const d = abs % 10
  if (abs > 10 && abs < 20) return 'баллов'
  if (d === 1) return 'балл'
  if (d >= 2 && d <= 4) return 'балла'
  return 'баллов'
}
