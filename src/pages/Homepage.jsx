import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { Card, Button, Badge } from '../components/ui'
import { ExternalLinkIcon, CalendarIcon, ListBulletIcon } from '@radix-ui/react-icons'
import { HomeStats, TeslaWidget, HAWeatherWidget, DeviceOverview } from '../components/HomeAssistantWidget'
import CalendarWidget from '../components/CalendarWidget'
import TodoWidget from '../components/TodoWidget'

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
      <div className="flex items-center gap-4">
        <div className="text-4xl">
          {current.weatherCode === '113' ? '☀️' :
           current.weatherCode === '116' ? '⛅' :
           current.weatherCode === '119' ? '☁️' :
           current.weatherCode === '122' ? '☁️' :
           current.weatherCode.startsWith('2') || current.weatherCode.startsWith('3') ? '🌧️' :
           '🌤️'}
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{current.temp_C}°C</div>
          <div className="text-blue-200 text-sm">{current.weatherDesc[0].value}</div>
          <div className="text-blue-300 text-xs">
            H: {today.maxtempC}°C | L: {today.mintempC}°C
          </div>
        </div>
        <div className="ml-auto text-right text-blue-200 text-xs">
          <div>💧 {current.humidity}%</div>
          <div>💨 {current.windspeedKmph} km/h</div>
          <div>📍 Crackington Haven</div>
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
  const services = [
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
      url: 'https://app.plex.tv',
      icon: '🎬',
      color: 'from-orange-500/20 to-orange-600/20 border-orange-500/30 hover:from-orange-500/30 hover:to-orange-600/30'
    },
    {
      name: 'Overseerr',
      description: 'Media Requests',
      url: 'https://overseerr.cracky.co.uk',
      icon: '📺',
      color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 hover:from-purple-500/30 hover:to-purple-600/30'
    },
    {
      name: 'Tethered',
      description: 'Lifestyle App',
      url: 'https://tethered.me.uk',
      icon: '🔗',
      color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 hover:from-emerald-500/30 hover:to-emerald-600/30'
    }
  ]

  const handleServiceClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">🚀 Mission Control</h2>
      <div className="grid grid-cols-2 gap-4">
        {services.map((service, index) => (
          <Card
            key={index}
            className={`${service.color} cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95`}
            onClick={() => handleServiceClick(service.url)}
          >
            <div className="text-center p-4">
              <div className="text-4xl mb-3">{service.icon}</div>
              <div className="text-white font-semibold text-lg mb-1">{service.name}</div>
              <div className="text-slate-300 text-sm">{service.description}</div>
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

export default function Homepage() {
  const { user } = useUser()

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.display_name || 'Friend'}! 👋
        </h1>
        <p className="text-slate-400">Your family dashboard is ready</p>
      </div>

      {/* Weather Bar */}
      <EnhancedWeatherWidget />

      {/* Tesla & Device Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TeslaWidget />
        <DeviceOverview />
      </div>

      {/* Main Three-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Home Stats */}
        <div className="lg:col-span-3">
          <HomeStats />
        </div>

        {/* Center Column: Service Launcher */}
        <div className="lg:col-span-6">
          <ServiceLauncher />
        </div>

        {/* Right Column: Calendar & Todos */}
        <div className="lg:col-span-3">
          <CalendarTodos />
        </div>
      </div>

      {/* Quick Actions Footer */}
      <Card className="bg-gradient-to-r from-teal-900/20 to-teal-700/20 border-teal-600/30">
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="ghost" size="sm">📋 View Chores</Button>
          <Button variant="ghost" size="sm">🛒 Shopping List</Button>
          <Button variant="ghost" size="sm">🍽️ Meal Planning</Button>
          <Button variant="ghost" size="sm">📅 Family Calendar</Button>
        </div>
      </Card>
    </div>
  )
}