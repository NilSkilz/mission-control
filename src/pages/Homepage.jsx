import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { Card, Button, Badge } from '../components/ui'
import { ExternalLinkIcon, ThermometerIcon, ZapIcon, WifiIcon, CalendarIcon, ListBulletIcon } from '@radix-ui/react-icons'

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

// Home stats component
function HomeStats() {
  // Placeholder data - will be replaced with real integrations later
  const stats = [
    {
      icon: <ThermometerIcon className="w-5 h-5" />,
      label: 'Living Room',
      value: '21°C',
      status: 'normal',
      color: 'text-emerald-400'
    },
    {
      icon: <ZapIcon className="w-5 h-5" />,
      label: 'Power Usage',
      value: '2.4 kW',
      status: 'normal',
      color: 'text-yellow-400'
    },
    {
      icon: <WifiIcon className="w-5 h-5" />,
      label: 'Network',
      value: 'Online',
      status: 'good',
      color: 'text-emerald-400'
    }
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        🏠 Home Status
      </h2>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={stat.color}>{stat.icon}</div>
                <div>
                  <div className="text-slate-300 text-sm">{stat.label}</div>
                  <div className={`font-semibold ${stat.color}`}>{stat.value}</div>
                </div>
              </div>
              <Badge variant={stat.status === 'good' ? 'success' : 'default'}>
                {stat.status === 'good' ? '●' : '○'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
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

// Calendar & todos component
function CalendarTodos() {
  // Placeholder data - will be replaced with real integrations later
  const upcomingEvents = [
    { time: '09:00', title: 'School Drop-off', type: 'routine' },
    { time: '14:30', title: 'Logan Football', type: 'activity' },
    { time: '19:00', title: 'Family Dinner', type: 'family' }
  ]

  const todos = [
    { id: 1, text: 'Take bins out', completed: false, priority: 'high' },
    { id: 2, text: 'Weekly shop', completed: false, priority: 'medium' },
    { id: 3, text: 'Book dentist', completed: true, priority: 'low' }
  ]

  return (
    <div className="space-y-6">
      {/* Calendar Events */}
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <CalendarIcon className="w-5 h-5" />
          Today's Events
        </h2>
        <div className="space-y-3">
          {upcomingEvents.map((event, index) => (
            <Card key={index} className="bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="text-teal-400 font-mono text-sm bg-teal-500/20 px-2 py-1 rounded">
                  {event.time}
                </div>
                <div>
                  <div className="text-white text-sm">{event.title}</div>
                  <Badge variant={
                    event.type === 'routine' ? 'default' :
                    event.type === 'activity' ? 'warning' : 'teal'
                  }>
                    {event.type}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Todo List Preview */}
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <ListBulletIcon className="w-5 h-5" />
          Quick Tasks
        </h2>
        <div className="space-y-2">
          {todos.slice(0, 4).map((todo) => (
            <Card key={todo.id} className="bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  todo.completed ? 'bg-emerald-500' : 
                  todo.priority === 'high' ? 'bg-red-500' :
                  todo.priority === 'medium' ? 'bg-yellow-500' : 'bg-slate-500'
                }`}></div>
                <span className={`text-sm flex-1 ${
                  todo.completed ? 'text-slate-500 line-through' : 'text-slate-300'
                }`}>
                  {todo.text}
                </span>
              </div>
            </Card>
          ))}
          <Button variant="ghost" size="sm" className="w-full mt-3">
            View All Tasks →
          </Button>
        </div>
      </div>
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
      <WeatherWidget />

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