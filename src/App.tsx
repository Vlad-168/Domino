import { AnimatePresence, motion } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import { useStore } from './store'
import Onboarding from './screens/Onboarding'
import Home from './screens/Home'
import Chores from './screens/Chores'
import Log from './screens/Log'
import Rewards from './screens/Rewards'
import Profile from './screens/Profile'
import Report from './screens/Report'
import Achievements from './screens/Achievements'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/chores" element={<Chores />} />
          <Route path="/log" element={<Log />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/report" element={<Report />} />
          <Route path="/achievements" element={<Achievements />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  const onboarded = useStore((s) => s.onboarded)

  if (!onboarded) {
    return (
      <div className="app-shell">
        <Onboarding />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <AnimatedRoutes />
      <NavBar />
    </div>
  )
}
