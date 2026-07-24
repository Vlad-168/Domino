/**
 * Domino — серверный авточекпоинт (ТЗ §6).
 *
 * Cloud Scheduler триггерит эту функцию вс 21:00. Она читает logEntries за
 * неделю, считает итоги/победителя/общую цель/стрики, пишет снапшот в
 * weeks/{weekId}, обновляет сезонный зачёт, обнуляет неделю (новый weekId)
 * и шлёт пуш обоим партнёрам через FCM.
 *
 * Деплой:
 *   firebase deploy --only functions,firestore:rules
 */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

initializeApp()
const db = getFirestore()

const APP_URL = 'https://vlad-168.github.io/Domino/'

function pluralPoints(n) {
  const abs = Math.abs(n) % 100
  const d = abs % 10
  if (abs > 10 && abs < 20) return 'баллов'
  if (d === 1) return 'балл'
  if (d >= 2 && d <= 4) return 'балла'
  return 'баллов'
}

const CHEERS = ['Не отставай! 💪', 'Твой ход! 🔥', 'Догоняй счёт! 🏁', 'Соревнование в разгаре! 🏆']

/**
 * Push a motivational notification to the PARTNER whenever a chore is logged —
 * even when their app is fully closed. The household doc holds the whole shared
 * state (incl. the `log` array); we diff old vs new to find fresh entries, then
 * send to every registered device except the one that made the write.
 */
export const onChoreLogged = onDocumentUpdated('households/{code}', async (event) => {
  const before = event.data?.before.data() || {}
  const after = event.data?.after.data() || {}
  const beforeIds = new Set((before.log || []).map((e) => e.id))
  const tomb = new Set(after.deletedLogIds || [])
  const now = Date.now()
  const fresh = (after.log || []).filter(
    (e) => !beforeIds.has(e.id) && !tomb.has(e.id) && now - (e.ts || 0) < 10 * 60 * 1000
  )
  if (!fresh.length) return

  const code = event.params.code
  const writer = after.writerId
  const tokSnap = await db.collection('households').doc(code).collection('pushTokens').get()
  const targets = tokSnap.docs.filter((d) => d.id !== writer)
  const tokens = targets.map((d) => d.data().token).filter(Boolean)
  if (!tokens.length) return

  const settings = after.settings || {}
  const last = fresh[fresh.length - 1]
  const name = settings.partners?.[last.byKey]?.name || 'Партнёр'
  const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)]
  const title = `🔥 ${name} набирает очки!`
  const body =
    fresh.length === 1
      ? `${name}: ${last.choreTitle} +${last.points} ${pluralPoints(last.points)}. ${cheer}`
      : `${name} отметил(а) ${fresh.length} дел(а) подряд. ${cheer}`

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      notification: { icon: `${APP_URL}icons/icon-192.png`, badge: `${APP_URL}icons/icon-192.png` },
      fcmOptions: { link: APP_URL },
    },
  })

  // Prune tokens that are no longer valid.
  const stale = []
  res.responses.forEach((r, i) => {
    const code = r.error?.code
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
      stale.push(targets[i].ref.delete())
    }
  })
  if (stale.length) await Promise.all(stale)
})

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function startOfWeek(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.getTime()
}

function weekId(ts) {
  const start = startOfWeek(ts)
  const d = new Date(start)
  const onejan = new Date(d.getFullYear(), 0, 1).getTime()
  const week = Math.ceil(((start - onejan) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

async function checkpointHousehold(hhRef, hh) {
  const now = Date.now()
  const weekStart = startOfWeek(now)
  const weekEnd = weekStart + WEEK_MS
  const settings = hh.settings || {}
  const goal = settings.weeklyTeamGoal ?? 120
  const handicap = settings.handicap ?? { A: 1, B: 1 }

  const snap = await hhRef
    .collection('logEntries')
    .where('ts', '>=', weekStart)
    .where('ts', '<', weekEnd)
    .get()

  const totals = { A: 0, B: 0 }
  const choreCount = {}
  for (const doc of snap.docs) {
    const e = doc.data()
    const key = e.byUid === hh.members?.[0] ? 'A' : 'B'
    totals[key] += e.points || 0
    choreCount[e.choreTitle] = (choreCount[e.choreTitle] || 0) + 1
  }

  const team = totals.A + totals.B
  const tA = (goal * handicap.A) / (handicap.A + handicap.B)
  const tB = (goal * handicap.B) / (handicap.A + handicap.B)
  const ratioA = totals.A / (tA || 1)
  const ratioB = totals.B / (tB || 1)
  const winner = Math.abs(ratioA - ratioB) < 1e-9 ? 'tie' : ratioA > ratioB ? 'A' : 'B'

  let mvp = null
  for (const [title, count] of Object.entries(choreCount)) {
    if (!mvp || count > mvp.count) mvp = { title, count }
  }

  const id = weekId(weekStart)
  await hhRef.collection('weeks').doc(id).set({
    weekId: id,
    startTs: weekStart,
    endTs: weekEnd,
    totals,
    winner,
    teamTotal: team,
    teamGoal: goal,
    teamGoalMet: team >= goal,
    mvpChore: mvp,
    closedAt: now,
  })

  await hhRef.set(
    {
      season: {
        wins: {
          A: FieldValue.increment(winner === 'A' ? 1 : 0),
          B: FieldValue.increment(winner === 'B' ? 1 : 0),
        },
        ties: FieldValue.increment(winner === 'tie' ? 1 : 0),
      },
    },
    { merge: true }
  )

  // Пуш обоим (ТЗ §6.5). Токены хранятся в households/{id}.fcmTokens.
  const tokens = (hh.fcmTokens || []).filter(Boolean)
  if (tokens.length) {
    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Недельный отчёт Domino готов 🏁',
        body:
          winner === 'tie'
            ? `Ничья! Команда: ${team} баллов.`
            : `Победитель недели — ${winner}. Загляни за деталями.`,
      },
    })
  }
}

export const weeklyCheckpoint = onSchedule(
  { schedule: 'every sunday 21:00', timeZone: 'Europe/Belgrade' },
  async () => {
    const households = await db.collection('households').get()
    await Promise.all(
      households.docs.map((doc) => checkpointHousehold(doc.ref, doc.data()))
    )
  }
)
