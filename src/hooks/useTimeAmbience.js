import { useState, useEffect } from 'react'

/**
 * Time-based ambient themes for Mission Control
 * Provides subtle visual shifts through the day while maintaining terminal aesthetic
 */

// Time periods for ambient themes
const TIME_PERIODS = {
  EARLY_MORNING: { start: 5, end: 7, name: 'early-morning' },    // 5AM-7AM: Cool blues
  MORNING: { start: 7, end: 10, name: 'morning' },              // 7AM-10AM: Soft morning light
  DAY: { start: 10, end: 17, name: 'day' },                     // 10AM-5PM: Neutral/default
  EVENING: { start: 17, end: 21, name: 'evening' },             // 5PM-9PM: Warm amber/orange
  NIGHT: { start: 21, end: 24, name: 'night' },                 // 9PM-12AM: Deep purple/red
  LATE_NIGHT: { start: 0, end: 5, name: 'late-night' }          // 12AM-5AM: Minimal, dark
}

// Theme configurations for each time period
const THEME_CONFIG = {
  'early-morning': {
    // Cool morning blues - calm, awakening
    primary: 'rgba(59, 130, 246, 0.7)',      // Blue-500 
    secondary: 'rgba(147, 197, 253, 0.5)',   // Blue-300
    accent: 'rgba(34, 211, 238, 0.6)',       // Cyan-400
    glow: 'rgba(56, 189, 248, 0.3)',         // Sky-400
    statusGreen: 'rgba(34, 197, 94, 0.8)',
    statusWarning: 'rgba(251, 191, 36, 0.7)',
    statusAlert: 'rgba(239, 68, 68, 0.8)',
    background: 'from-slate-950 via-blue-950 to-slate-900',
    description: 'Cool morning awakening'
  },
  'morning': {
    // Soft morning light - fresh, energetic
    primary: 'rgba(34, 211, 238, 0.7)',      // Cyan-400
    secondary: 'rgba(125, 211, 252, 0.5)',   // Sky-300  
    accent: 'rgba(59, 130, 246, 0.6)',       // Blue-500
    glow: 'rgba(34, 211, 238, 0.4)',         // Cyan-400
    statusGreen: 'rgba(34, 197, 94, 0.9)',
    statusWarning: 'rgba(251, 191, 36, 0.8)',
    statusAlert: 'rgba(239, 68, 68, 0.8)',
    background: 'from-slate-900 via-cyan-950 to-blue-900',
    description: 'Fresh morning energy'
  },
  'day': {
    // Default neutral theme - focused, operational
    primary: 'rgba(34, 211, 238, 0.7)',      // Cyan-400 (original)
    secondary: 'rgba(56, 189, 248, 0.5)',    // Sky-400
    accent: 'rgba(20, 184, 166, 0.6)',       // Teal-500
    glow: 'rgba(34, 211, 238, 0.3)',         // Cyan-400
    statusGreen: 'rgba(34, 197, 94, 0.8)',
    statusWarning: 'rgba(251, 191, 36, 0.8)',
    statusAlert: 'rgba(239, 68, 68, 0.8)',
    background: 'from-slate-900 via-slate-800 to-blue-900', // Original
    description: 'Operational focus'
  },
  'evening': {
    // Warm evening amber/orange - productive, winding down
    primary: 'rgba(251, 191, 36, 0.7)',      // Amber-400
    secondary: 'rgba(252, 211, 77, 0.5)',    // Amber-300
    accent: 'rgba(245, 158, 11, 0.6)',       // Amber-500
    glow: 'rgba(251, 191, 36, 0.4)',         // Amber-400
    statusGreen: 'rgba(34, 197, 94, 0.8)',
    statusWarning: 'rgba(251, 191, 36, 0.9)',
    statusAlert: 'rgba(239, 68, 68, 0.8)',
    background: 'from-slate-900 via-orange-950 to-amber-950',
    description: 'Evening warmth'
  },
  'night': {
    // Deep purple/red - calm, rest mode
    primary: 'rgba(168, 85, 247, 0.7)',      // Purple-500
    secondary: 'rgba(196, 181, 253, 0.5)',   // Purple-300
    accent: 'rgba(239, 68, 68, 0.6)',        // Red-500
    glow: 'rgba(168, 85, 247, 0.3)',         // Purple-500
    statusGreen: 'rgba(34, 197, 94, 0.7)',
    statusWarning: 'rgba(251, 191, 36, 0.7)',
    statusAlert: 'rgba(239, 68, 68, 0.9)',
    background: 'from-slate-950 via-purple-950 to-red-950',
    description: 'Night rest mode'
  },
  'late-night': {
    // Minimal dark - very low contrast, sleep-friendly
    primary: 'rgba(107, 114, 128, 0.6)',     // Gray-500 (dim)
    secondary: 'rgba(156, 163, 175, 0.4)',   // Gray-400 (dim)
    accent: 'rgba(75, 85, 99, 0.5)',         // Gray-600 (dim)
    glow: 'rgba(107, 114, 128, 0.2)',        // Gray-500 (very dim)
    statusGreen: 'rgba(34, 197, 94, 0.6)',
    statusWarning: 'rgba(251, 191, 36, 0.6)',
    statusAlert: 'rgba(239, 68, 68, 0.7)',
    background: 'from-slate-950 via-gray-950 to-slate-950',
    description: 'Minimal night mode'
  }
}

// Get current time period based on hour
function getCurrentPeriod() {
  const hour = new Date().getHours()
  
  for (const [key, period] of Object.entries(TIME_PERIODS)) {
    if (key === 'LATE_NIGHT') {
      // Special case for late night (spans midnight)
      if (hour >= period.start || hour < period.end) {
        return period.name
      }
    } else if (hour >= period.start && hour < period.end) {
      return period.name
    }
  }
  
  return 'day' // Fallback
}

// Get theme transition progress (0-1) within current period
function getTransitionProgress() {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const currentMinutes = hour * 60 + minute
  
  const period = getCurrentPeriod()
  const config = Object.values(TIME_PERIODS).find(p => p.name === period)
  
  if (!config) return 0
  
  let startMinutes, endMinutes
  
  if (config.name === 'late-night') {
    // Handle late night period that spans midnight
    if (hour < config.end) {
      startMinutes = 0
      endMinutes = config.end * 60
      return Math.min(1, currentMinutes / endMinutes)
    } else {
      startMinutes = config.start * 60
      endMinutes = 24 * 60
      return Math.min(1, (currentMinutes - startMinutes) / (endMinutes - startMinutes))
    }
  } else {
    startMinutes = config.start * 60
    endMinutes = config.end * 60
    const progress = (currentMinutes - startMinutes) / (endMinutes - startMinutes)
    return Math.max(0, Math.min(1, progress))
  }
}

export function useTimeAmbience() {
  const [currentTheme, setCurrentTheme] = useState('day')
  const [themeData, setThemeData] = useState(THEME_CONFIG.day)
  const [transitionProgress, setTransitionProgress] = useState(0)
  
  useEffect(() => {
    function updateTheme() {
      const newTheme = getCurrentPeriod()
      const progress = getTransitionProgress()
      
      if (newTheme !== currentTheme) {
        setCurrentTheme(newTheme)
      }
      
      setThemeData(THEME_CONFIG[newTheme])
      setTransitionProgress(progress)
    }
    
    // Update immediately
    updateTheme()
    
    // Update every minute to catch theme transitions
    const interval = setInterval(updateTheme, 60000)
    
    return () => clearInterval(interval)
  }, [currentTheme])
  
  return {
    currentTheme,
    themeData,
    transitionProgress,
    availableThemes: Object.keys(THEME_CONFIG),
    themeConfig: THEME_CONFIG
  }
}

export default useTimeAmbience