import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui'
import EventCallout from '../components/EventCallout'
import { useSeasonalAmbience } from '../hooks/useSeasonalAmbience'

// Mission timer with seasonal context
function MissionTimer({ seasonalContext }) {
  const [time, setTime] = useState(new Date())
  
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])
  
  const dateStr = `${time.getMonth() + 1}.${String(time.getDate()).padStart(2, '0')}`
  const timeStr = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  
  return (
    <div className="text-center font-mono">
      <div className="text-xs mb-1" style={{ color: seasonalContext?.primary || '#22d3ee' }}>
        // TIMESTAMP
      </div>
      <div className="text-2xl text-white">{dateStr}</div>
      <div className="text-sm text-slate-400">{timeStr}</div>
      {seasonalContext?.description && (
        <div className="text-xs mt-2 text-slate-500">
          MODE: {seasonalContext.description.toUpperCase()}
        </div>
      )}
    </div>
  )
}

// Seasonal status circle
function SeasonalStatusCircle({ themeData, eventContext, hasActiveEvents, getActiveEventSummary }) {
  const summary = getActiveEventSummary()
  
  return (
    <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center">
      {/* Outer glow with seasonal colors */}
      <div 
        className="absolute inset-0 rounded-full blur-3xl opacity-30"
        style={{ 
          backgroundColor: themeData?.glow?.replace(/[\d.]+\)$/, '0.2)') || 'rgba(34, 211, 238, 0.2)' 
        }}
      />
      
      {/* Rotating ring with seasonal theme */}
      <div 
        className="absolute inset-0 rounded-full border-2 animate-spin-slow"
        style={{ 
          borderColor: `${themeData?.accent || 'rgba(34, 211, 238, 0.3)'} transparent transparent transparent`
        }}
      />
      
      {/* Inner rotating ring - opposite direction */}
      <div 
        className="absolute inset-8 rounded-full border animate-pulse"
        style={{ 
          borderColor: themeData?.secondary || 'rgba(56, 189, 248, 0.4)',
          animationDuration: '3s'
        }}
      />
      
      {/* Core status display */}
      <div 
        className="relative z-10 w-48 h-48 rounded-full border-2 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center"
        style={{ 
          borderColor: themeData?.primary || 'rgba(34, 211, 238, 0.5)',
          boxShadow: `0 0 30px ${themeData?.glow || 'rgba(34, 211, 238, 0.2)'}` 
        }}
      >
        <div className="text-center p-4">
          {hasActiveEvents() && summary ? (
            <>
              <div 
                className="text-xs font-mono mb-2"
                style={{ color: themeData?.accent || '#22d3ee' }}
              >
                // SPECIAL_MODE
              </div>
              <div className="text-sm text-white font-mono leading-tight max-w-[160px]">
                {summary.split(' • ')[0]}
              </div>
              {summary.includes(' • ') && (
                <div className="text-xs text-slate-400 font-mono mt-1">
                  +{summary.split(' • ').length - 1} more
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-xs font-mono mb-2" style={{ color: themeData?.accent || '#22d3ee' }}>
                // STATUS
              </div>
              <div className="text-base sm:text-lg text-green-400 font-mono">ALL_SYSTEMS</div>
              <div className="text-base sm:text-lg text-green-400 font-mono">OPERATIONAL</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Seasonal theme display
function ThemeDisplay({ themeData, eventContext }) {
  if (!eventContext) return null
  
  return (
    <Card className="bg-slate-800/50 border-slate-600/30">
      <div className="space-y-3">
        <div className="text-xs text-slate-400 font-mono">// SEASONAL_CONTEXT</div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">Season</span>
            <span className="text-white text-sm capitalize">{eventContext.season}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">Active Events</span>
            <span className="text-cyan-400 text-sm">{eventContext.holidays.length}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">Birthdays</span>
            <span className="text-purple-400 text-sm">{eventContext.birthdays.length}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">Family Events</span>
            <span className="text-green-400 text-sm">{eventContext.familyEvents.length}</span>
          </div>
          
          {eventContext.specialPeriod && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">Special Period</span>
              <span className="text-yellow-400 text-sm capitalize">
                {eventContext.specialPeriod.name.replace(/_/g, ' ')}
              </span>
            </div>
          )}
        </div>
        
        {/* Theme color preview */}
        <div className="pt-2 border-t border-slate-700/50">
          <div className="text-xs text-slate-400 font-mono mb-2">Current Theme</div>
          <div className="flex gap-2">
            <div 
              className="w-4 h-4 rounded-full border border-slate-600"
              style={{ backgroundColor: themeData?.primary }}
              title="Primary"
            />
            <div 
              className="w-4 h-4 rounded-full border border-slate-600"
              style={{ backgroundColor: themeData?.accent }}
              title="Accent"
            />
            <div 
              className="w-4 h-4 rounded-full border border-slate-600"
              style={{ backgroundColor: themeData?.secondary }}
              title="Secondary"
            />
            <div 
              className="w-4 h-4 rounded-full border border-slate-600"
              style={{ backgroundColor: themeData?.glow }}
              title="Glow"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function SeasonalDemo() {
  const [calendarEvents, setCalendarEvents] = useState(null)
  
  // Fetch calendar events
  useEffect(() => {
    async function fetchCalendarEvents() {
      try {
        const response = await fetch('/api/calendar/events')
        if (response.ok) {
          const events = await response.json()
          setCalendarEvents(events)
        }
      } catch (error) {
        console.error('Failed to fetch calendar events:', error)
      }
    }
    
    fetchCalendarEvents()
  }, [])
  
  const seasonalAmbience = useSeasonalAmbience(calendarEvents)
  const { themeData, eventContext, hasActiveEvents, getActiveEventSummary, seasonalContext } = seasonalAmbience

  return (
    <div 
      className="min-h-screen bg-gradient-to-br transition-all duration-1000"
      style={{ 
        backgroundImage: themeData?.background ? 
          `linear-gradient(to bottom right, ${themeData.background.replace('from-', '').replace(' via-', ', ').replace(' to-', ', ')})` :
          'linear-gradient(to bottom right, #0f172a, #1e293b, #1e40af)'
      }}
    >
      {/* Grid pattern overlay with seasonal tint */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(${themeData?.accent || 'rgba(34,197,241,0.1)'} 1px, transparent 1px),
          linear-gradient(90deg, ${themeData?.accent || 'rgba(34,197,241,0.1)'} 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      }}></div>
      
      {/* Header */}
      <header className="relative z-10 border-b bg-slate-900/60 backdrop-blur"
              style={{ borderBottomColor: themeData?.secondary || 'rgba(51, 65, 85, 0.5)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="hover:opacity-80 transition-colors text-sm font-mono"
                style={{ color: themeData?.accent || '#22d3ee' }}
              >
                ← //RETURN_TO_BASE
              </Link>
            </div>
            
            <div className="text-center">
              <h1 className="text-xl font-mono" style={{ color: themeData?.primary || '#22d3ee' }}>
                // SEASONAL_MISSION_CONTROL
              </h1>
              <div className="text-xs font-mono mt-1" style={{ color: themeData?.secondary || 'rgb(148 163 184)' }}>
                EVENT_AWARE_SYSTEM
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: themeData?.accent || '#22c55e' }}
              />
              <span className="text-xs font-mono" style={{ color: themeData?.secondary || 'rgb(148 163 184)' }}>
                //SEASONAL_MODE
              </span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main dashboard */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[60vh]">
          
          {/* Left Panel - Event Callouts */}
          <div className="lg:col-span-3 space-y-4">
            <EventCallout maxCallouts={5} />
            <ThemeDisplay themeData={themeData} eventContext={eventContext} />
          </div>
          
          {/* Center Panel - Seasonal Status */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            <div className="mb-6">
              <SeasonalStatusCircle 
                themeData={themeData}
                eventContext={eventContext}
                hasActiveEvents={hasActiveEvents}
                getActiveEventSummary={getActiveEventSummary}
              />
            </div>
            <MissionTimer seasonalContext={seasonalContext} />
          </div>
          
          {/* Right Panel - Event Details */}
          <div className="lg:col-span-3 space-y-4">
            {eventContext?.upcomingHolidays && eventContext.upcomingHolidays.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-600/30">
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 font-mono">// UPCOMING_HOLIDAYS</div>
                  <div className="space-y-2">
                    {eventContext.upcomingHolidays.slice(0, 3).map((holiday, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm">{holiday.name}</span>
                        <span className="text-cyan-400 text-xs">
                          {holiday.daysAway === 0 ? 'Today' : 
                           holiday.daysAway === 1 ? 'Tomorrow' : 
                           `${holiday.daysAway} days`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
            
            {eventContext?.birthdays && eventContext.birthdays.length > 0 && (
              <Card className="bg-slate-800/50 border-purple-500/30">
                <div className="space-y-3">
                  <div className="text-xs text-purple-400 font-mono">// BIRTHDAYS</div>
                  <div className="space-y-2">
                    {eventContext.birthdays.map((birthday, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm truncate">{birthday.name}</span>
                        <span className="text-purple-400 text-xs">
                          {birthday.daysAway === 0 ? 'Today! 🎂' : 
                           birthday.daysAway === 1 ? 'Tomorrow' : 
                           `${birthday.daysAway} days`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
            
            {eventContext?.familyEvents && eventContext.familyEvents.length > 0 && (
              <Card className="bg-slate-800/50 border-green-500/30">
                <div className="space-y-3">
                  <div className="text-xs text-green-400 font-mono">// FAMILY_EVENTS</div>
                  <div className="space-y-2">
                    {eventContext.familyEvents.map((event, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm truncate">{event.name}</span>
                        <span className="text-green-400 text-xs">
                          {event.daysAway === 0 ? 'Today' : 
                           event.daysAway === 1 ? 'Tomorrow' : 
                           `${event.daysAway} days`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
            
            {/* API Test Panel */}
            <Card className="bg-slate-800/50 border-slate-600/30">
              <div className="space-y-3">
                <div className="text-xs text-slate-400 font-mono">// API_ENDPOINTS</div>
                <div className="space-y-1 text-xs font-mono">
                  <a href="/api/events/context" target="_blank" 
                     className="block text-cyan-400 hover:text-cyan-300 transition-colors">
                    /api/events/context
                  </a>
                  <a href="/api/events/theme" target="_blank" 
                     className="block text-cyan-400 hover:text-cyan-300 transition-colors">
                    /api/events/theme
                  </a>
                  <a href="/api/events/upcoming" target="_blank" 
                     className="block text-cyan-400 hover:text-cyan-300 transition-colors">
                    /api/events/upcoming
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}