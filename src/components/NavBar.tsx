import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

const items = [
  { to: '/', icon: '🏠', label: 'Главная', end: true },
  { to: '/chores', icon: '📋', label: 'Дела' },
  { to: '/log', icon: '🕑', label: 'Лог' },
  { to: '/rewards', icon: '🎁', label: 'Награды' },
  { to: '/profile', icon: '⚙️', label: 'Профиль' },
]

export default function NavBar() {
  return (
    <nav className="nav" aria-label="Основная навигация">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className="nav-item">
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span layoutId="nav-dot" className="nav-dot" />
              )}
              <span className="nav-icon">{it.icon}</span>
              <span>{it.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
