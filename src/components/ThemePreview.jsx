import { useState } from 'react'
import { useTimeAmbience } from '../hooks/useTimeAmbience'
import { Card } from './ui'

/**
 * ThemePreview - Shows current theme and allows manual theme testing
 * Useful for development and demonstrating the ambient theme system
 */

const THEME_DESCRIPTIONS = {
  'early-morning': {
    time: '5:00-7:00 AM',
    description: 'Cool morning awakening - soft blues and calm tones',
    mood: '🌅 Awakening'
  },
  'morning': {
    time: '7:00-10:00 AM', 
    description: 'Fresh morning energy - bright cyans and sky blues',
    mood: '☀️ Energetic'
  },
  'day': {
    time: '10:00 AM-5:00 PM',
    description: 'Operational focus - neutral blues and teals (default)',
    mood: '💼 Focused'
  },
  'evening': {
    time: '5:00-9:00 PM',
    description: 'Evening warmth - amber and orange tones',
    mood: '🌆 Productive'
  },
  'night': {
    time: '9:00 PM-12:00 AM',
    description: 'Night rest mode - deep purples and reds',
    mood: '🌙 Calm'
  },
  'late-night': {
    time: '12:00-5:00 AM',
    description: 'Minimal night mode - muted grays for sleep comfort',
    mood: '😴 Minimal'
  }
}

export function ThemePreview({ compact = false }) {
  const { currentTheme, themeData, transitionProgress, availableThemes, themeConfig } = useTimeAmbience()
  const [isExpanded, setIsExpanded] = useState(false)
  
  const currentDesc = THEME_DESCRIPTIONS[currentTheme] || THEME_DESCRIPTIONS.day
  
  if (compact) {
    return (
      <Card className="bg-slate-800/60 border-slate-600/40 ambience-border-secondary ambience-transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full ambience-transition" 
                 style={{ backgroundColor: themeData.primary }} />
            <div>
              <div className="text-sm font-mono ambience-primary ambience-transition">{currentTheme.toUpperCase()}</div>
              <div className="text-xs text-slate-500">{currentDesc.time}</div>
            </div>
          </div>
          <div className="text-sm">{currentDesc.mood}</div>
        </div>
      </Card>
    )
  }
  
  return (
    <Card className="bg-slate-800/60 border-slate-600/40 ambience-border-secondary ambience-transition">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono ambience-primary ambience-transition">// AMBIENT_THEME</h3>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-white/20 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full ambience-transition" 
                 style={{ backgroundColor: themeData.primary }} />
          </div>
          <div className="flex-1">
            <div className="font-mono text-sm ambience-primary ambience-transition">
              {currentTheme.replace('-', '_').toUpperCase()}
            </div>
            <div className="text-xs text-slate-500">{currentDesc.time} • {currentDesc.mood}</div>
          </div>
        </div>
        
        <div className="text-xs text-slate-400 leading-relaxed">
          {currentDesc.description}
        </div>
        
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t border-slate-700/50">
            <div className="text-xs text-slate-500 font-mono">THEME_VALUES:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeData.primary }} />
                <span className="text-slate-400">PRIMARY</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeData.secondary }} />
                <span className="text-slate-400">SECONDARY</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeData.accent }} />
                <span className="text-slate-400">ACCENT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeData.glow }} />
                <span className="text-slate-400">GLOW</span>
              </div>
            </div>
            
            <div className="text-xs text-slate-500 font-mono">
              PROGRESS: {Math.round(transitionProgress * 100)}%
            </div>
            
            {/* All available themes preview */}
            <div className="space-y-2">
              <div className="text-xs text-slate-500 font-mono">ALL_THEMES:</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {availableThemes.map(theme => {
                  const config = themeConfig[theme]
                  const desc = THEME_DESCRIPTIONS[theme]
                  return (
                    <div key={theme} className={`flex items-center gap-2 p-1 rounded ${theme === currentTheme ? 'bg-slate-700/50' : ''}`}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.primary }} />
                      <span className={theme === currentTheme ? 'text-white' : 'text-slate-500'}>
                        {theme.replace('-', '_').toUpperCase()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default ThemePreview