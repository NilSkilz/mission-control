import { useState, useEffect } from 'react'
import { detectEventContext } from '../lib/eventDetection'
import { useTimeAmbience } from './useTimeAmbience'

/**
 * Enhanced ambient theming with seasonal and event awareness
 * Extends time-based theming with contextual intelligence
 */

// Seasonal theme modifications
const SEASONAL_THEMES = {
  spring: {
    // Fresh greens and blooming energy
    modifiers: {
      accent: 'rgba(34, 197, 94, 0.6)',        // Green-500
      secondary: 'rgba(125, 211, 252, 0.5)',   // Sky-300
      glow: 'rgba(52, 211, 153, 0.4)',         // Emerald-400
      background: 'from-slate-900 via-emerald-950 to-green-900'
    },
    description: 'Spring renewal'
  },
  
  summer: {
    // Bright, energetic warmth
    modifiers: {
      accent: 'rgba(251, 191, 36, 0.7)',       // Amber-400
      secondary: 'rgba(252, 211, 77, 0.6)',    // Amber-300
      glow: 'rgba(251, 146, 60, 0.4)',         // Orange-400
      background: 'from-slate-900 via-amber-950 to-orange-900'
    },
    description: 'Summer energy'
  },
  
  autumn: {
    // Warm oranges and reds
    modifiers: {
      accent: 'rgba(245, 101, 101, 0.6)',      // Red-400
      secondary: 'rgba(251, 146, 60, 0.6)',    // Orange-400
      glow: 'rgba(245, 158, 11, 0.4)',         // Amber-500
      background: 'from-slate-900 via-orange-950 to-red-900'
    },
    description: 'Autumn warmth'
  },
  
  winter: {
    // Cool blues and icy whites
    modifiers: {
      accent: 'rgba(147, 197, 253, 0.6)',      // Blue-300
      secondary: 'rgba(186, 230, 253, 0.5)',   // Sky-200
      glow: 'rgba(125, 211, 252, 0.4)',        // Sky-300
      background: 'from-slate-900 via-blue-950 to-indigo-900'
    },
    description: 'Winter frost'
  }
}

// Event-specific theme modifications
const EVENT_THEMES = {
  // Christmas themes
  christmas: {
    modifiers: {
      primary: 'rgba(239, 68, 68, 0.7)',       // Red-500
      accent: 'rgba(34, 197, 94, 0.6)',        // Green-500
      secondary: 'rgba(251, 191, 36, 0.5)',    // Amber-400 (gold)
      glow: 'rgba(239, 68, 68, 0.4)',          // Red-500
      background: 'from-slate-900 via-red-950 to-green-950'
    },
    description: 'Christmas spirit',
    priority: 10
  },
  
  christmas_season: {
    modifiers: {
      accent: 'rgba(239, 68, 68, 0.5)',        // Subtle red
      secondary: 'rgba(34, 197, 94, 0.4)',     // Subtle green
      glow: 'rgba(251, 191, 36, 0.3)',         // Golden glow
    },
    description: 'Holiday season',
    priority: 8
  },
  
  // Halloween/spooky themes
  spooky: {
    modifiers: {
      primary: 'rgba(245, 101, 101, 0.7)',     // Red-400
      accent: 'rgba(251, 146, 60, 0.6)',       // Orange-400
      secondary: 'rgba(168, 85, 247, 0.5)',    // Purple-500
      glow: 'rgba(245, 101, 101, 0.4)',        // Red glow
      background: 'from-slate-950 via-orange-950 to-purple-950'
    },
    description: 'Spooky vibes',
    priority: 9
  },
  
  spooky_season: {
    modifiers: {
      accent: 'rgba(251, 146, 60, 0.5)',       // Orange tint
      glow: 'rgba(168, 85, 247, 0.3)',         // Purple glow
    },
    description: 'October vibes',
    priority: 7
  },
  
  // Valentine's themes
  romance: {
    modifiers: {
      primary: 'rgba(236, 72, 153, 0.7)',      // Pink-500
      accent: 'rgba(244, 114, 182, 0.6)',      // Pink-400
      secondary: 'rgba(251, 207, 232, 0.5)',   // Pink-200
      glow: 'rgba(236, 72, 153, 0.4)',         // Pink glow
      background: 'from-slate-900 via-pink-950 to-rose-900'
    },
    description: 'Valentine warmth',
    priority: 9
  },
  
  // Birthday themes
  birthday: {
    modifiers: {
      accent: 'rgba(251, 191, 36, 0.7)',       // Gold/amber
      secondary: 'rgba(168, 85, 247, 0.6)',    // Purple
      glow: 'rgba(34, 211, 238, 0.5)',         // Cyan celebration
      background: 'from-slate-900 via-purple-950 to-amber-950'
    },
    description: 'Birthday celebration',
    priority: 10
  },
  
  // Family event themes
  family: {
    modifiers: {
      accent: 'rgba(34, 197, 94, 0.6)',        // Warm green
      glow: 'rgba(251, 191, 36, 0.4)',         // Golden warmth
    },
    description: 'Family gathering',
    priority: 6
  },
  
  // General celebration
  celebration: {
    modifiers: {
      accent: 'rgba(251, 191, 36, 0.6)',       // Gold
      glow: 'rgba(34, 211, 238, 0.4)',         // Cyan sparkle
    },
    description: 'Time to celebrate',
    priority: 8
  }
}

// Combine base theme with seasonal/event modifiers
function applyThemeModifiers(baseTheme, modifiers) {
  return {
    ...baseTheme,
    ...modifiers,
    // Keep status colors unless specifically overridden
    statusGreen: modifiers.statusGreen || baseTheme.statusGreen,
    statusWarning: modifiers.statusWarning || baseTheme.statusWarning,
    statusAlert: modifiers.statusAlert || baseTheme.statusAlert
  }
}

// Determine the dominant theme based on event priorities
function selectDominantEventTheme(eventContext) {
  let dominantTheme = null
  let highestPriority = 0
  
  // Check special periods
  if (eventContext.specialPeriod?.type) {
    const theme = EVENT_THEMES[eventContext.specialPeriod.type]
    if (theme && theme.priority > highestPriority) {
      dominantTheme = theme
      highestPriority = theme.priority
    }
  }
  
  // Check active holidays
  for (const holiday of eventContext.holidays) {
    const theme = EVENT_THEMES[holiday.type]
    if (theme && theme.priority > highestPriority) {
      dominantTheme = theme
      highestPriority = theme.priority
    }
  }
  
  // Check upcoming birthdays (today or tomorrow)
  const nearBirthdays = eventContext.birthdays.filter(b => b.daysAway <= 1)
  if (nearBirthdays.length > 0) {
    const theme = EVENT_THEMES.birthday
    if (theme && theme.priority > highestPriority) {
      dominantTheme = theme
      highestPriority = theme.priority
    }
  }
  
  // Check family events (today)
  const todayFamilyEvents = eventContext.familyEvents.filter(e => e.daysAway === 0)
  if (todayFamilyEvents.length > 0) {
    const theme = EVENT_THEMES.family
    if (theme && theme.priority >= highestPriority) {
      dominantTheme = theme
      highestPriority = theme.priority
    }
  }
  
  return dominantTheme
}

export function useSeasonalAmbience(calendarEvents = null) {
  const timeAmbience = useTimeAmbience()
  const [eventContext, setEventContext] = useState(null)
  const [seasonalTheme, setSeasonalTheme] = useState(null)
  
  useEffect(() => {
    function updateEventContext() {
      const context = detectEventContext(new Date(), calendarEvents)
      setEventContext(context)
      
      // Get base theme from time ambience
      const baseTheme = timeAmbience.themeData
      
      // Apply seasonal modifications
      const seasonalMods = SEASONAL_THEMES[context.season]
      let enhancedTheme = baseTheme
      
      if (seasonalMods) {
        enhancedTheme = applyThemeModifiers(baseTheme, seasonalMods.modifiers)
      }
      
      // Apply event-specific modifications
      const dominantEventTheme = selectDominantEventTheme(context)
      if (dominantEventTheme) {
        enhancedTheme = applyThemeModifiers(enhancedTheme, dominantEventTheme.modifiers)
      }
      
      setSeasonalTheme({
        ...enhancedTheme,
        seasonalContext: {
          season: context.season,
          seasonalMods,
          eventTheme: dominantEventTheme,
          description: dominantEventTheme?.description || seasonalMods?.description || timeAmbience.themeData.description
        }
      })
    }
    
    // Update immediately
    updateEventContext()
    
    // Update every hour to catch new events/context changes
    const interval = setInterval(updateEventContext, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [calendarEvents, timeAmbience.currentTheme, timeAmbience.themeData])
  
  return {
    // Enhanced theme data
    ...timeAmbience,
    themeData: seasonalTheme || timeAmbience.themeData,
    
    // Event context
    eventContext,
    
    // Contextual information
    seasonalContext: seasonalTheme?.seasonalContext,
    
    // Helper functions
    hasActiveEvents: () => {
      if (!eventContext) return false
      return eventContext.holidays.length > 0 || 
             eventContext.birthdays.length > 0 || 
             eventContext.familyEvents.length > 0 ||
             eventContext.specialPeriod !== null
    },
    
    getActiveEventSummary: () => {
      if (!eventContext) return null
      
      const summary = []
      
      if (eventContext.holidays.length > 0) {
        summary.push(...eventContext.holidays.map(h => h.name))
      }
      
      if (eventContext.birthdays.filter(b => b.daysAway === 0).length > 0) {
        summary.push('Birthday today! 🎂')
      }
      
      if (eventContext.familyEvents.filter(e => e.daysAway === 0).length > 0) {
        summary.push('Family event today')
      }
      
      if (eventContext.specialPeriod) {
        summary.push(eventContext.specialPeriod.name.replace(/_/g, ' '))
      }
      
      return summary.length > 0 ? summary.join(' • ') : null
    }
  }
}

export default useSeasonalAmbience