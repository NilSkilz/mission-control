import { useLocation, Link } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { UserAvatar, Button } from './ui'
import { useSeasonalAmbience } from '../hooks/useSeasonalAmbience'
import EventCallout from './EventCallout'
import { useEffect, useState } from 'react'

// Navigation items with role-based access
const NAV_ITEMS = [
  { href: '/', key: 'home', label: 'Home', roles: ['parent', 'child'] },
  { href: '/family/chores', key: 'chores', label: 'Chores', roles: ['parent', 'child'] },
  { href: '/family/meals', key: 'meals', label: 'Meals', roles: ['parent'] },
  { href: '/family/shopping', key: 'shopping', label: 'Shopping', roles: ['parent'] },
  { href: '/family/calendar', key: 'calendar', label: 'Calendar', roles: ['parent', 'child'] },
  { href: '/agents', key: 'agents', label: 'Agents', roles: ['parent'] },
  { href: '/admin', key: 'admin', label: 'System Admin', roles: ['parent'] },
]

function NavLink({ href, active, children, themeData }) {
  return (
    <Link
      to={href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'text-white' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
      style={active ? {
        backgroundColor: themeData?.primary || 'rgba(20, 184, 166, 0.3)',
        boxShadow: `0 0 15px ${themeData?.glow || 'rgba(20, 184, 166, 0.3)'}`
      } : {}}
    >
      {children}
    </Link>
  )
}

function SeasonalBackground({ themeData }) {
  if (!themeData?.background) return null
  
  return (
    <div 
      className={`fixed inset-0 bg-gradient-to-br ${themeData.background} opacity-90 pointer-events-none`}
      style={{ zIndex: -1 }}
    />
  )
}

function SystemStatus({ seasonalContext }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="text-xs font-mono text-slate-400 space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>SYSTEM_ONLINE</span>
      </div>
      <div>
        TIME: {currentTime.toLocaleTimeString('en-GB', { hour12: false })}
      </div>
      {seasonalContext && (
        <div>
          MODE: {seasonalContext.description?.toUpperCase() || 'OPERATIONAL'}
        </div>
      )}
    </div>
  )
}

export default function SeasonalLayout({ children }) {
  const { user, logout } = useUser()
  const location = useLocation()
  const [calendarEvents, setCalendarEvents] = useState(null)
  
  // Fetch calendar events for seasonal context
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
  
  if (!user) return children

  // Determine current page from path
  const getCurrentPage = () => {
    if (location.pathname === '/') return 'home'
    if (location.pathname === '/family/chores') return 'chores'
    if (location.pathname === '/family/meals') return 'meals'
    if (location.pathname === '/family/shopping') return 'shopping'
    if (location.pathname === '/family/calendar') return 'calendar'
    if (location.pathname === '/agents') return 'agents'
    if (location.pathname === '/admin') return 'admin'
    return location.pathname.split('/').pop()
  }
  const currentPage = getCurrentPage()

  // Filter navigation based on user role
  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user.role))
  
  const themeData = seasonalAmbience.themeData
  const seasonalContext = seasonalAmbience.seasonalContext

  return (
    <div className="min-h-screen bg-slate-900 relative">
      {/* Seasonal background */}
      <SeasonalBackground themeData={themeData} />
      
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b sticky top-0 z-30"
              style={{ 
                borderBottomColor: themeData?.secondary || 'rgb(51 65 85)', // slate-700
                boxShadow: `0 1px 0 ${themeData?.glow || 'rgba(20, 184, 166, 0.1)'}` 
              }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <h1 className="text-2xl font-bold text-white">Mission Control</h1>
              {seasonalContext?.description && (
                <div className="hidden sm:block ml-4 px-2 py-1 rounded text-xs font-mono"
                     style={{ 
                       backgroundColor: themeData?.secondary || 'rgba(20, 184, 166, 0.2)',
                       color: themeData?.primary?.replace(/[\d.]+\)$/, '1)') || '#14b8a6'
                     }}>
                  {seasonalContext.description}
                </div>
              )}
            </div>
            
            <nav className="flex gap-1">
              {visibleNav.map(item => (
                <NavLink 
                  key={item.key} 
                  href={item.href} 
                  active={currentPage === item.key}
                  themeData={themeData}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <UserAvatar user={user} size="sm" />
                <span className="text-sm text-slate-300">{user.display_name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Event callouts */}
        <EventCallout className="mb-6" />
        
        {/* Page content */}
        {children}
      </main>
      
      {/* System status indicator */}
      <div className="fixed bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 border"
           style={{ borderColor: themeData?.secondary || 'rgb(51 65 85)' }}>
        <SystemStatus seasonalContext={seasonalContext} />
      </div>
    </div>
  )
}