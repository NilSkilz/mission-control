import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from './ui'

/**
 * ContextCards - Dynamic cards that appear based on current Home Assistant state
 * 
 * Rules-based system: each rule defines conditions and what card to show.
 * Cards slide in when conditions are met, slide out when they're not.
 */

const API_BASE = import.meta.env.PROD ? 'https://api.cracky.co.uk' : ''

// Icons for context cards
const Icons = {
  tv: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(168, 85, 247, 0.8)' }}>
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4" strokeLinecap="round"/>
    </svg>
  ),
  laundry: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.8)' }}>
      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 8v.01" strokeLinecap="round"/>
    </svg>
  ),
  car: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(34, 197, 94, 0.8)' }}>
      <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0z"/><path d="M3 17h2m14 0h2M5 17H3v-4l2-5h10l4 5v4h-2m-10 0h6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  bolt: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(251, 191, 36, 0.8)' }}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  printer: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(239, 68, 68, 0.8)' }}>
      <rect x="6" y="14" width="12" height="6" rx="1"/><path d="M6 14V4a1 1 0 011-1h10a1 1 0 011 1v10M4 14h16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z"/>
    </svg>
  ),
  gaming: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(34, 197, 94, 0.8)' }}>
      <rect x="2" y="6" width="20" height="12" rx="3"/><path d="M8 12h4M10 10v4M16 11v.01M18 13v.01" strokeLinecap="round"/>
    </svg>
  ),
  sun: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(250, 204, 21, 0.8)' }}>
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round"/>
    </svg>
  )
}

// Context card rules configuration
const CONTEXT_RULES = [
  {
    id: 'tv-playing',
    name: 'TV Playing',
    entity: 'media_player.55pus7906_12',
    condition: (state) => state?.state === 'playing' || state?.state === 'paused',
    icon: Icons.tv,
    color: 'border-purple-500/40',
    render: (state) => ({
      title: 'TV Active',
      subtitle: state?.attributes?.media_title || state?.attributes?.app_name || 'Playing',
      detail: state?.state === 'paused' ? 'Paused' : null
    })
  },
  {
    id: 'xbox-playing',
    name: 'Xbox Active',
    entity: 'media_player.xbox',
    condition: (state) => state?.state === 'playing' || state?.state === 'paused',
    icon: Icons.gaming,
    color: 'border-green-500/40',
    render: (state) => ({
      title: 'Xbox Active',
      subtitle: state?.attributes?.media_title || state?.attributes?.app_name || 'Gaming',
      detail: null
    })
  },
  {
    id: 'tumble-dryer',
    name: 'Tumble Dryer',
    entity: 'switch.tumble_dryer_tumble_dryer',
    condition: (state) => state?.state === 'on',
    icon: Icons.laundry,
    color: 'border-cyan-500/40',
    render: (state) => ({
      title: 'Tumble Dryer Running',
      subtitle: 'In progress',
      detail: null
    })
  },
  {
    id: 'tesla-charging',
    name: 'Tesla Charging',
    entity: 'switch.timmy_charger',
    condition: (state) => state?.state === 'on',
    icon: Icons.car,
    color: 'border-green-500/40',
    render: (state) => ({
      title: 'Timmy Charging',
      subtitle: 'Connected',
      detail: null
    })
  },
  {
    id: 'high-power',
    name: 'High Power Usage',
    entity: 'sensor.shellyem_34945470ed50_channel_1_power',
    condition: (state) => {
      const power = parseFloat(state?.state)
      return !isNaN(power) && power > 3000
    },
    icon: Icons.bolt,
    color: 'border-yellow-500/40',
    render: (state) => {
      const power = parseFloat(state?.state)
      return {
        title: 'High Power Usage',
        subtitle: `${(power / 1000).toFixed(1)} kW`,
        detail: 'Above normal'
      }
    }
  },
  {
    id: 'solar-generating',
    name: 'Solar Generating Well',
    entity: 'sensor.solis_ac_output_total_power',
    condition: (state) => {
      const power = parseFloat(state?.state)
      return !isNaN(power) && power > 500
    },
    icon: Icons.sun,
    color: 'border-yellow-400/40',
    render: (state) => {
      const power = parseFloat(state?.state)
      return {
        title: 'Solar Active',
        subtitle: `${(power / 1000).toFixed(2)} kW`,
        detail: power > 2000 ? 'Excellent!' : 'Generating'
      }
    }
  }
]

// Animation variants for smooth card transitions
const cardVariants = {
  hidden: {
    opacity: 0,
    x: 40,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] // Custom easing for natural feel
    }
  },
  exit: {
    opacity: 0,
    x: 40,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: 'easeIn'
    }
  }
}

// Individual context card component
function ContextCard({ rule, state }) {
  const content = rule.render(state)
  
  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="overflow-hidden" // Prevent content from showing during animation
    >
      <Card className={`bg-slate-800/60 ${rule.color} backdrop-blur-sm`}>
        <div className="flex items-center gap-3">
          <div className="shrink-0">{rule.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{content.title}</div>
            <div className="text-slate-400 text-xs truncate">{content.subtitle}</div>
          </div>
          {content.detail && (
            <div className="text-xs text-slate-500 font-mono">{content.detail}</div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

export function ContextCards({ className = '' }) {
  const [entityStates, setEntityStates] = useState({})
  
  // Fetch entity states
  useEffect(() => {
    const fetchStates = async () => {
      try {
        // Get all entities we need
        const entities = CONTEXT_RULES.map(r => r.entity)
        const uniqueEntities = [...new Set(entities)]
        
        const response = await fetch(`${API_BASE}/api/ha/states?entities=${uniqueEntities.join(',')}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const stateMap = {}
            data.data.forEach(s => {
              stateMap[s.entity_id] = s
            })
            setEntityStates(stateMap)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch entity states:', error)
      }
    }
    
    fetchStates()
    const interval = setInterval(fetchStates, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])
  
  // Evaluate which rules are active
  const activeCards = useMemo(() => {
    return CONTEXT_RULES.filter(rule => {
      const state = entityStates[rule.entity]
      return state && rule.condition(state)
    }).map(rule => ({
      rule,
      state: entityStates[rule.entity]
    }))
  }, [entityStates])
  
  if (activeCards.length === 0) {
    return null
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-xs text-slate-500 font-mono">// ACTIVE NOW</div>
      <AnimatePresence mode="popLayout">
        {activeCards.map(({ rule, state }) => (
          <ContextCard 
            key={rule.id} 
            rule={rule} 
            state={state}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ContextCards
