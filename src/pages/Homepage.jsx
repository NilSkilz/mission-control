import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { Card, Button } from '../components/ui'
import { ExternalLinkIcon } from '@radix-ui/react-icons'
import { HomeEnvironment, SystemStatus, HAWeatherWidget } from '../components/HomeAssistantWidget'
import { useNavigate } from 'react-router-dom'
import CalendarWidget from '../components/CalendarWidget'
import TodoWidget from '../components/TodoWidget'
import { EnergyCharts } from '../components/EnergyCharts'
import { EnergyFlowVisualization } from '../components/EnergyFlowVisualization'
import { EnhancedSystemStatus } from '../components/EnhancedSystemStatus'
import { NotificationWidget } from '../components/NotificationWidget'
import { AmbienceProvider, AmbienceStyles } from '../components/AmbienceProvider'
import { ThemePreview } from '../components/ThemePreview'

// Weather widget component
function WeatherWidget() {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Using wttr.in API for Crackington Haven
        const response = await fetch('https://wttr.in/Crackington+Haven?format=j1')
        const data = await response.json()
        setWeather(data)
      } catch (error) {
        console.error('Failed to fetch weather:', error)
      }
      setLoading(false)
    }

    fetchWeather()
    // Refresh weather every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-blue-900/30 to-blue-700/30 border-blue-600/30">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full"></div>
          <div>
            <div className="w-32 h-4 bg-blue-500/20 rounded mb-2"></div>
            <div className="w-24 h-3 bg-blue-500/20 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (!weather) {
    return (
      <Card className="bg-gradient-to-r from-slate-900/30 to-slate-700/30">
        <div className="text-slate-400 text-center">Weather unavailable</div>
      </Card>
    )
  }

  const current = weather.current_condition[0]
  const today = weather.weather[0]

  return (
    <Card className="bg-gradient-to-r from-blue-900/30 to-blue-700/30 border-blue-600/30">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="text-3xl sm:text-4xl">
          {current.weatherCode === '113' ? '☀️' :
           current.weatherCode === '116' ? '⛅' :
           current.weatherCode === '119' ? '☁️' :
           current.weatherCode === '122' ? '☁️' :
           current.weatherCode.startsWith('2') || current.weatherCode.startsWith('3') ? '🌧️' :
           '🌤️'}
        </div>
        <div className="flex-1">
          <div className="text-xl sm:text-2xl font-bold text-white">{current.temp_C}°C</div>
          <div className="text-blue-200 text-xs sm:text-sm">{current.weatherDesc[0].value}</div>
          <div className="text-blue-300 text-xs">
            H: {today.maxtempC}°C | L: {today.mintempC}°C
          </div>
        </div>
        <div className="text-right text-blue-200 text-xs">
          <div>💧 {current.humidity}%</div>
          <div>💨 {current.windspeedKmph} km/h</div>
          <div className="hidden sm:block">📍 Crackington Haven</div>
        </div>
      </div>
    </Card>
  )
}

// Enhanced weather widget that tries HA first, falls back to external
function EnhancedWeatherWidget() {
  // Try HA weather first, fallback to external
  const haWeather = HAWeatherWidget()
  
  if (haWeather) {
    return haWeather
  }
  
  // Fallback to external weather
  return <WeatherWidget />
}

// Service launcher component
function ServiceLauncher() {
  const navigate = useNavigate()

  const externalServices = [
    {
      name: 'Home Assistant',
      description: 'Smart Home Control',
      url: 'http://localhost:8123',
      icon: '🏠',
      color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 hover:from-blue-500/30 hover:to-blue-600/30'
    },
    {
      name: 'Plex',
      description: 'Media Server',
      url: 'https://plex.cracky.co.uk',
      icon: '🎬',
      color: 'from-orange-500/20 to-orange-600/20 border-orange-500/30 hover:from-orange-500/30 hover:to-orange-600/30'
    },
    {
      name: 'Overseerr',
      description: 'Media Requests',
      url: 'https://overseerr.cracky.co.uk',
      icon: '📺',
      color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 hover:from-purple-500/30 hover:to-purple-600/30'
    }
  ]

  const appLinks = [
    {
      name: 'Chores',
      description: 'Family Tasks',
      route: '/family/chores',
      icon: '📋',
      color: 'from-teal-500/20 to-teal-600/20 border-teal-500/30 hover:from-teal-500/30 hover:to-teal-600/30'
    },
    {
      name: 'Meal Planner',
      description: 'Weekly Meals',
      route: '/family/meals',
      icon: '🍽️',
      color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 hover:from-emerald-500/30 hover:to-emerald-600/30'
    },
    {
      name: 'Shopping List',
      description: 'Family Shopping',
      route: '/family/shopping',
      icon: '🛒',
      color: 'from-amber-500/20 to-amber-600/20 border-amber-500/30 hover:from-amber-500/30 hover:to-amber-600/30'
    },
    {
      name: 'Mission Control',
      description: 'Clean Dashboard',
      route: '/simple-demo',
      icon: '🎛️',
      color: 'from-cyan-500/20 to-blue-600/20 border-cyan-500/30 hover:from-cyan-500/30 hover:to-blue-600/30'
    }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">🚀 Mission Control</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {appLinks.map((link, index) => (
          <Card
            key={`app-${index}`}
            className={`${link.color} cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95 min-h-[120px]`}
            onClick={() => navigate(link.route)}
          >
            <div className="text-center p-4 sm:p-6">
              <div className="text-4xl sm:text-5xl mb-3">{link.icon}</div>
              <div className="text-white font-semibold text-lg sm:text-xl mb-1">{link.name}</div>
              <div className="text-slate-300 text-sm sm:text-base">{link.description}</div>
            </div>
          </Card>
        ))}
        {externalServices.map((service, index) => (
          <Card
            key={`ext-${index}`}
            className={`${service.color} cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95 min-h-[120px]`}
            onClick={() => window.open(service.url, '_blank', 'noopener,noreferrer')}
          >
            <div className="text-center p-4 sm:p-6">
              <div className="text-4xl sm:text-5xl mb-3">{service.icon}</div>
              <div className="text-white font-semibold text-lg sm:text-xl mb-1">{service.name}</div>
              <div className="text-slate-300 text-sm sm:text-base">{service.description}</div>
              <ExternalLinkIcon className="w-4 h-4 text-slate-400 mx-auto mt-2" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Calendar & todos component using real widgets
function CalendarTodos() {
  return (
    <div className="space-y-6">
      {/* Calendar Events */}
      <CalendarWidget />
      
      {/* Todo List Preview */}
      <TodoWidget />
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// Inline login pane for the homepage
function HomepageLogin() {
  const { users, login } = useUser()
  const [selectedUser, setSelectedUser] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!selectedUser || !password) return
    setLoading(true)
    setError('')
    try {
      await login(selectedUser.username, password)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const USER_ORDER = ['rob', 'aimee', 'dexter', 'logan']
  const sortedUsers = [...users].sort((a, b) => {
    const ai = USER_ORDER.indexOf(a.username?.toLowerCase())
    const bi = USER_ORDER.indexOf(b.username?.toLowerCase())
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  if (!selectedUser) {
    return (
      <Card className="bg-slate-800/50">
        <h2 className="text-lg font-semibold text-white mb-4 text-center">Who are you?</h2>
        <div className="grid grid-cols-2 gap-3">
          {sortedUsers.map(u => (
            <button
              key={u.id}
              onClick={() => { setSelectedUser(u); setPassword(''); setError('') }}
              className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:border-teal-500 transition-all text-center"
            >
              <span className="text-2xl block">{u.avatar}</span>
              <span className="block mt-1 text-sm font-medium text-white">{u.display_name}</span>
            </button>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800/50">
      <form onSubmit={handleLogin} className="space-y-3">
        <div className="text-center">
          <span className="text-3xl">{selectedUser.avatar}</span>
          <p className="text-white font-medium mt-1">{selectedUser.display_name}</p>
        </div>
        <div>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 text-sm"
          />
        </div>
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setPassword(''); setError('') }} className="flex-1">
            Back
          </Button>
          <Button type="submit" size="sm" disabled={!password || loading} className="flex-1">
            {loading ? '...' : 'Login'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default function Homepage() {
  const { user } = useUser()

  return (
      <div className="min-h-screen bg-slate-900">
      {!user && (
        <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <h1 className="text-2xl font-bold ambience-primary ambience-text-glow ambience-transition">Mission Control</h1>
            </div>
          </div>
        </header>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="space-y-6">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white">
          {user ? `${getGreeting()}, ${user.display_name}` : 'Mission Control'}
        </h1>
        <p className="text-slate-400">
          {user ? "Here's what's happening at home" : 'Sign in to see your dashboard'}
        </p>
      </div>

      {/* Weather & Quick Environment */}
      <div className="space-y-4">
        <EnhancedWeatherWidget />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HomeEnvironment />
        </div>
      </div>

      {user ? (
        <>
          {/* Dashboard Layout for Logged in Users */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column: Energy Flow, Charts & System Status */}
            <div className="xl:col-span-2 space-y-6">
              <EnergyFlowVisualization />
              <EnergyCharts />
              <EnhancedSystemStatus />
            </div>
            
            {/* Right Column: Notifications, Calendar & Todos */}
            <div className="space-y-6">
              <NotificationWidget />
              <ThemePreview compact={true} />
              <CalendarWidget />
              <TodoWidget />
            </div>
          </div>

          {/* Service Launcher */}
          <ServiceLauncher />
        </>
      ) : (
        /* Login Interface */
        <div className="max-w-md mx-auto">
          <HomepageLogin />
        </div>
      )}

        </div>
      </main>
    </div>
  )
}