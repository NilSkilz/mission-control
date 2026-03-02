import { useState, useEffect } from 'react'
import { CalendarIcon, HeartIcon, HomeIcon } from '@heroicons/react/24/outline'
import { 
  GiftIcon, 
  CakeIcon, 
  SparklesIcon,
  FaceSmileIcon
} from '@heroicons/react/24/solid'

/**
 * Event Callout Component
 * Displays contextual seasonal and event information with terminal aesthetic
 */

// Icon mapping for different event types
const EVENT_ICONS = {
  holiday: SparklesIcon,
  birthday: CakeIcon,
  upcoming_birthday: CakeIcon,
  family: HomeIcon,
  special_period: GiftIcon,
  upcoming_holiday: CalendarIcon,
  default: FaceSmileIcon
}

// Theme classes for different event types
const EVENT_THEMES = {
  holiday: {
    bg: 'bg-gradient-to-r from-amber-500/20 to-yellow-400/20',
    border: 'border-amber-400/50',
    text: 'text-amber-300',
    icon: 'text-amber-400'
  },
  birthday: {
    bg: 'bg-gradient-to-r from-purple-500/20 to-pink-400/20',
    border: 'border-purple-400/50',
    text: 'text-purple-300',
    icon: 'text-purple-400'
  },
  upcoming_birthday: {
    bg: 'bg-gradient-to-r from-purple-500/10 to-pink-400/10',
    border: 'border-purple-400/30',
    text: 'text-purple-300/80',
    icon: 'text-purple-400/80'
  },
  family: {
    bg: 'bg-gradient-to-r from-green-500/20 to-emerald-400/20',
    border: 'border-green-400/50',
    text: 'text-green-300',
    icon: 'text-green-400'
  },
  special_period: {
    bg: 'bg-gradient-to-r from-red-500/20 to-rose-400/20',
    border: 'border-red-400/50',
    text: 'text-red-300',
    icon: 'text-red-400'
  },
  upcoming_holiday: {
    bg: 'bg-gradient-to-r from-cyan-500/15 to-blue-400/15',
    border: 'border-cyan-400/40',
    text: 'text-cyan-300/80',
    icon: 'text-cyan-400/80'
  },
  default: {
    bg: 'bg-gradient-to-r from-slate-500/20 to-gray-400/20',
    border: 'border-slate-400/50',
    text: 'text-slate-300',
    icon: 'text-slate-400'
  }
}

function CalloutItem({ callout, index }) {
  const theme = EVENT_THEMES[callout.type] || EVENT_THEMES.default
  const Icon = EVENT_ICONS[callout.type] || EVENT_ICONS.default
  
  return (
    <div 
      className={`
        ${theme.bg} ${theme.border} ${theme.text}
        border rounded-lg px-4 py-3 
        backdrop-blur-sm
        flex items-center gap-3
        transition-all duration-300 hover:scale-[1.02]
        animate-fadeInUp
      `}
      style={{ 
        animationDelay: `${index * 100}ms`,
        boxShadow: `0 0 20px ${theme.border.includes('amber') ? 'rgba(251, 191, 36, 0.1)' : 
                              theme.border.includes('purple') ? 'rgba(168, 85, 247, 0.1)' :
                              theme.border.includes('green') ? 'rgba(34, 197, 94, 0.1)' :
                              theme.border.includes('red') ? 'rgba(239, 68, 68, 0.1)' :
                              theme.border.includes('cyan') ? 'rgba(34, 211, 238, 0.1)' :
                              'rgba(148, 163, 184, 0.1)'}`
      }}
    >
      <Icon className={`w-5 h-5 ${theme.icon} flex-shrink-0`} />
      <span className="font-mono text-sm font-medium leading-relaxed">
        {callout.message}
      </span>
    </div>
  )
}

function SeasonalHeader({ season, description }) {
  const seasonEmojis = {
    spring: '🌸',
    summer: '☀️',
    autumn: '🍂',
    winter: '❄️'
  }
  
  const seasonColors = {
    spring: 'text-green-400',
    summer: 'text-amber-400',
    autumn: 'text-orange-400',
    winter: 'text-blue-300'
  }
  
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{seasonEmojis[season]}</span>
        <span className={`font-mono text-sm font-medium ${seasonColors[season]}`}>
          // SEASONAL_CONTEXT: {season.toUpperCase()}
        </span>
      </div>
      {description && (
        <div className="text-xs text-slate-400 font-mono ml-7">
          {description}
        </div>
      )}
    </div>
  )
}

export default function EventCallout({ className = '', maxCallouts = 3 }) {
  const [eventData, setEventData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    async function fetchEventData() {
      try {
        setLoading(true)
        const response = await fetch('/api/events/theme')
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        setEventData(data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch event data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchEventData()
    
    // Refresh every 30 minutes
    const interval = setInterval(fetchEventData, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])
  
  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-48 mb-2"></div>
          <div className="h-8 bg-slate-800 rounded"></div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={`${className}`}>
        <div className="text-slate-400 text-sm font-mono">
          // EVENT_SYSTEM: Error loading context
        </div>
      </div>
    )
  }
  
  if (!eventData?.context) {
    return null
  }
  
  const { context, suggestions } = eventData
  const displayCallouts = suggestions.callouts.slice(0, maxCallouts)
  
  // Don't render if no interesting events
  if (displayCallouts.length === 0) {
    return (
      <div className={`${className}`}>
        <SeasonalHeader 
          season={context.season} 
          description="Operational mode"
        />
      </div>
    )
  }
  
  return (
    <div className={`${className}`}>
      <SeasonalHeader 
        season={context.season} 
        description={suggestions.primary ? `Event mode: ${suggestions.primary}` : 'Seasonal mode'}
      />
      
      <div className="space-y-3">
        {displayCallouts.map((callout, index) => (
          <CalloutItem 
            key={`${callout.type}-${index}`} 
            callout={callout} 
            index={index}
          />
        ))}
      </div>
    </div>
  )
}