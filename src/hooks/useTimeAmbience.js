import { useState, useEffect } from 'react'

// Default theme data
const DEFAULT_THEME = {
  primary: 'rgba(20, 184, 166, 0.8)',      // Teal
  accent: 'rgba(56, 189, 248, 0.6)',       // Sky
  secondary: 'rgba(148, 163, 184, 0.5)',   // Slate
  glow: 'rgba(20, 184, 166, 0.4)',         // Teal glow
  background: 'from-slate-900 to-slate-800',
  statusGreen: 'rgba(34, 197, 94, 0.8)',
  statusWarning: 'rgba(251, 191, 36, 0.8)',
  statusAlert: 'rgba(239, 68, 68, 0.8)',
  description: 'Default theme'
}

// Time-based themes
const TIME_THEMES = {
  night: {
    ...DEFAULT_THEME,
    primary: 'rgba(99, 102, 241, 0.8)',      // Indigo
    accent: 'rgba(139, 92, 246, 0.6)',       // Purple
    glow: 'rgba(99, 102, 241, 0.3)',
    background: 'from-slate-950 to-indigo-950',
    description: 'Night mode'
  },
  morning: {
    ...DEFAULT_THEME,
    primary: 'rgba(251, 191, 36, 0.8)',      // Amber
    accent: 'rgba(251, 146, 60, 0.6)',       // Orange
    glow: 'rgba(251, 191, 36, 0.3)',
    background: 'from-slate-900 to-amber-950',
    description: 'Morning warmth'
  },
  day: {
    ...DEFAULT_THEME,
    description: 'Daytime'
  },
  evening: {
    ...DEFAULT_THEME,
    primary: 'rgba(244, 114, 182, 0.8)',     // Pink
    accent: 'rgba(236, 72, 153, 0.6)',       // Pink deeper
    glow: 'rgba(244, 114, 182, 0.3)',
    background: 'from-slate-900 to-pink-950',
    description: 'Evening twilight'
  }
}

function getTimeOfDay(hour) {
  if (hour >= 22 || hour < 6) return 'night'
  if (hour >= 6 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 17) return 'day'
  return 'evening'
}

export function useTimeAmbience() {
  const [currentTheme, setCurrentTheme] = useState('day')
  const [themeData, setThemeData] = useState(DEFAULT_THEME)
  
  useEffect(() => {
    function updateTheme() {
      const hour = new Date().getHours()
      const timeOfDay = getTimeOfDay(hour)
      setCurrentTheme(timeOfDay)
      setThemeData(TIME_THEMES[timeOfDay] || DEFAULT_THEME)
    }
    
    // Update immediately
    updateTheme()
    
    // Update every minute to catch theme transitions
    const interval = setInterval(updateTheme, 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  return {
    currentTheme,
    themeData
  }
}

export default useTimeAmbience
