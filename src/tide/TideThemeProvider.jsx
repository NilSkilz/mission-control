import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSunTimes, isDaylight } from './sun'

const TideThemeContext = createContext(null)

const STORAGE_KEY = 'tide-theme-mode' // 'auto' | 'day' | 'night'
const DEFAULT_MODE = 'night' // dark by default; users can switch to auto (follow sun) or day

function greetingWord(now, phase) {
  const h = now.getHours()
  if (phase === 'night') return 'night'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export function TideThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(STORAGE_KEY) || DEFAULT_MODE)
  const [now, setNow] = useState(() => new Date())

  // recompute the clock every minute so the crossfade fires at sunrise/sunset
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const sunPhase = isDaylight(now) ? 'day' : 'night'
  const phase = mode === 'auto' ? sunPhase : mode

  // paint the theme onto the document root so tokens + crossfade apply everywhere
  useEffect(() => {
    document.documentElement.setAttribute('data-tide-theme', phase)
    document.documentElement.style.colorScheme = phase === 'day' ? 'light' : 'dark'
  }, [phase])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  // tap cycles auto -> day -> night -> auto
  const cycleMode = useCallback(() => {
    setMode((m) => (m === 'auto' ? 'day' : m === 'day' ? 'night' : 'auto'))
  }, [])

  const { sunrise, sunset } = getSunTimes(now)

  const value = {
    phase,
    mode,
    setMode,
    cycleMode,
    sunrise,
    sunset,
    isAuto: mode === 'auto',
    greeting: greetingWord(now, phase),
    now,
  }

  return <TideThemeContext.Provider value={value}>{children}</TideThemeContext.Provider>
}

export function useTideTheme() {
  const ctx = useContext(TideThemeContext)
  if (!ctx) throw new Error('useTideTheme must be used within TideThemeProvider')
  return ctx
}
