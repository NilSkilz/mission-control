import { useState, useEffect } from 'react'
import { Card, Button } from '../components/ui'
import { ExternalLinkIcon, ReloadIcon } from '@radix-ui/react-icons'

// OpenClaw status component
function OpenClawStatus() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/openclaw/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        setStatus({ error: 'Failed to fetch status' })
      }
    } catch (error) {
      setStatus({ error: error.message })
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStatus()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = () => {
    if (loading) return '⏳'
    if (status?.error) return '❌'
    return '✅'
  }

  const getStatusText = () => {
    if (loading) return 'Checking status...'
    if (status?.error) return `Error: ${status.error}`
    return 'OpenClaw is running'
  }

  return (
    <Card className="bg-slate-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getStatusIcon()}</span>
          <div>
            <h3 className="text-lg font-semibold text-white">OpenClaw Gateway</h3>
            <p className="text-sm text-slate-400">{getStatusText()}</p>
            {status && !status.error && (
              <div className="mt-2 text-xs text-slate-500">
                <div>Model: {status.model || 'Unknown'}</div>
                <div>Session: {status.session || 'Unknown'}</div>
              </div>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchStatus}
          disabled={loading}
        >
          <ReloadIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </Card>
  )
}

// Active sessions component
function ActiveSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/openclaw/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      } else {
        setSessions([])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      setSessions([])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 60000) // Every minute
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="bg-slate-800/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Active Sessions</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchSessions}
          disabled={loading}
        >
          <ReloadIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-slate-400 text-sm">No active sessions found</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session, index) => (
            <div key={index} className="flex justify-between items-center bg-slate-700/30 rounded-lg p-3">
              <div>
                <div className="text-white text-sm font-medium">
                  {session.label || session.sessionKey || 'Unknown'}
                </div>
                <div className="text-slate-400 text-xs">
                  {session.agentId || session.kind || 'main'} • 
                  {session.activeMinutes ? ` ${session.activeMinutes}m ago` : ' Active'}
                </div>
              </div>
              {session.model && (
                <div className="text-slate-400 text-xs">
                  {session.model.replace(/^[^/]*\//, '')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// System services component
function SystemServices() {
  const services = [
    {
      name: 'Home Assistant',
      description: 'Smart home automation',
      url: 'http://localhost:8123',
      icon: '🏠',
      status: 'running'
    },
    {
      name: 'Mission Control API',
      description: 'Family dashboard backend',
      url: 'http://localhost:3001/health',
      icon: '🚀',
      status: 'running'
    },
    {
      name: 'Plex Media Server',
      description: 'Media streaming',
      url: 'https://plex.cracky.co.uk',
      icon: '🎬',
      status: 'running'
    },
    {
      name: 'Overseerr',
      description: 'Media requests',
      url: 'https://overseerr.cracky.co.uk',
      icon: '📺',
      status: 'running'
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-400'
      case 'stopped': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      default: return 'text-slate-400'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '●'
      case 'stopped': return '●'
      case 'warning': return '●'
      default: return '○'
    }
  }

  return (
    <Card className="bg-slate-800/50">
      <h3 className="text-lg font-semibold text-white mb-4">System Services</h3>
      <div className="space-y-3">
        {services.map((service, index) => (
          <div key={index} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{service.icon}</span>
              <div>
                <div className="text-white text-sm font-medium">{service.name}</div>
                <div className="text-slate-400 text-xs">{service.description}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`${getStatusColor(service.status)} text-sm`}>
                {getStatusIcon(service.status)} {service.status}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(service.url, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLinkIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// System stats component
function SystemStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock system stats for now - could be extended to fetch real data
    const fetchStats = async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setStats({
        uptime: '5 days, 12 hours',
        memory: { used: 4.2, total: 16.0 },
        storage: { used: 125.8, total: 500.0 },
        load: [0.8, 1.2, 1.5]
      })
      setLoading(false)
    }
    
    fetchStats()
  }, [])

  if (loading) {
    return (
      <Card className="bg-slate-800/50">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="h-4 bg-slate-700 rounded"></div>
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800/50">
      <h3 className="text-lg font-semibold text-white mb-4">System Stats</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Uptime</span>
          <span className="text-white">{stats?.uptime}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-slate-400">Memory</span>
          <span className="text-white">
            {stats?.memory?.used}GB / {stats?.memory?.total}GB 
            <span className="text-slate-500 ml-1">
              ({Math.round((stats?.memory?.used / stats?.memory?.total) * 100)}%)
            </span>
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-slate-400">Storage</span>
          <span className="text-white">
            {stats?.storage?.used}GB / {stats?.storage?.total}GB
            <span className="text-slate-500 ml-1">
              ({Math.round((stats?.storage?.used / stats?.storage?.total) * 100)}%)
            </span>
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-slate-400">Load Average</span>
          <span className="text-white font-mono text-xs">
            {stats?.load?.join(', ')}
          </span>
        </div>
      </div>
    </Card>
  )
}

export default function SystemAdmin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Administration</h1>
        <p className="text-slate-400">Monitor OpenClaw, agents, and system services</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <OpenClawStatus />
          <ActiveSessions />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <SystemServices />
          <SystemStats />
        </div>
      </div>
    </div>
  )
}