import { motion } from 'framer-motion'
import { achievementMeta, useStore } from '../store'
import { fadeUp } from '../components/ui'
import type { AchievementType } from '../types'

const ALL = Object.keys(achievementMeta) as AchievementType[]

export default function Achievements() {
  const achievements = useStore((s) => s.achievements)
  const partners = useStore((s) => s.settings.partners)

  const holdersOf = (t: AchievementType) =>
    achievements.filter((a) => a.type === t)

  return (
    <div className="screen">
      <motion.h1 {...fadeUp} className="screen-title">Достижения</motion.h1>
      <p className="screen-sub">Открыто {achievements.length} из {ALL.length}+ бейджей</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {ALL.map((t, i) => {
          const meta = achievementMeta[t]
          const holders = holdersOf(t)
          const unlocked = holders.length > 0
          return (
            <motion.div
              key={t}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="card center"
              style={{ padding: 16, opacity: unlocked ? 1 : 0.45 }}
            >
              <div style={{ fontSize: 40, marginBottom: 8, filter: unlocked ? 'none' : 'grayscale(1)' }}>
                {meta.emoji}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{meta.title}</div>
              <div className="faint" style={{ fontSize: 11, marginTop: 4, minHeight: 28 }}>{meta.desc}</div>
              {unlocked && (
                <div className="row gap8" style={{ justifyContent: 'center', marginTop: 8 }}>
                  {holders.map((h) => (
                    <span key={h.id} className="chip" style={{ fontSize: 10, padding: '3px 8px' }}>
                      {h.key === 'team' ? '🤝 Пара' : partners[h.key].name}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
