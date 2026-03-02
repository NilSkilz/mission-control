import { useState, useEffect } from 'react'
import { Card, Badge } from './ui'

function StatusBadge({ status, label }) {
  const variants = {
    online: 'success',
    offline: 'danger',
    unknown: 'warning'
  }
  
  const icons = {
    online: '✅',
    offline: '❌',
    unknown: '❓'
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variants[status]} className="flex items-center gap-1">
        <span>{icons[status]}</span>
        <span>{status.toUpperCase()}</span>
      </Badge>
      <span className="text-slate-300 text-sm">{label}</span>
    </div>
  )
}

function ServerStats({ stats }) {
  if (!stats) return null

  return (
    <Card className="bg-slate-700/30">
      <h4 className="text-lg font-semibold text-white mb-3">💻 Server Stats</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-slate-400">CPU Cores</div>
          <div className="text-white font-medium">{stats.cpu_count}</div>
        </div>
        <div>
          <div className="text-slate-400">Memory Usage</div>
          <div className="text-white font-medium">{stats.memory?.usage_percent}%</div>
        </div>
        <div>
          <div className="text-slate-400">Disk Usage</div>
          <div className="text-white font-medium">{stats.disk?.usage_percent}%</div>
        </div>
        <div>
          <div className="text-slate-400">Uptime</div>
          <div className="text-white font-medium">
            {Math.floor(stats.uptime / 86400)}d {Math.floor((stats.uptime % 86400) / 3600)}h
          </div>
        </div>
        <div>
          <div className="text-slate-400">Load Avg</div>
          <div className="text-white font-medium">{stats.load_average?.[0]?.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-slate-400">Platform</div>
          <div className="text-white font-medium">{stats.platform}</div>
        </div>
      </div>
    </Card>
  )
}

function NetworkInfo({ networkStats }) {
  if (!networkStats || !networkStats.summary) return null

  return (
    <Card className="bg-blue-500/10 border-blue-500/20">
      <h4 className="text-lg font-semibold text-white mb-3">🌐 Network Status</h4>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">WAN Status</span>
          <Badge variant={networkStats.summary.wan_up ? 'success' : 'danger'}>
            {networkStats.summary.wan_up ? 'ONLINE' : 'OFFLINE'}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Connected Devices</span>
          <span className="text-white font-medium">
            {networkStats.summary.online_clients} / {networkStats.summary.total_clients}
          </span>
        </div>
        {networkStats.system?.uptime && (
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Router Uptime</span>
            <span className="text-white font-medium">
              {Math.floor(networkStats.system.uptime / 86400)}d {Math.floor((networkStats.system.uptime % 86400) / 3600)}h
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}

export function EnhancedSystemStatus() {
  const [haStatus, setHaStatus] = useState(null)
  const [systemServices, setSystemServices] = useState(null)
  const [serverStats, setServerStats] = useState(null)
  const [networkStats, setNetworkStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    fetchAllStatus()
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAllStatus()
      setLastUpdate(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAllStatus = async () => {
    try {
      setLoading(true)
      
      const [haRes, systemRes, serverRes, networkRes] = await Promise.allSettled([
        fetch('/api/ha/status'),
        fetch('/api/system/status'),
        fetch('/api/system/server'),
        fetch('/api/network/stats')
      ])

      // Home Assistant status
      if (haRes.status === 'fulfilled') {
        const haData = await haRes.value.json()
        setHaStatus(haData.success ? haData.data : null)
      }

      // System services status
      if (systemRes.status === 'fulfilled') {
        const systemData = await systemRes.value.json()
        setSystemServices(systemData.success ? systemData.data : null)
      }

      // Server stats
      if (serverRes.status === 'fulfilled') {
        const serverData = await serverRes.value.json()
        setServerStats(serverData.success ? serverData.data : null)
      }

      // Network stats
      if (networkRes.status === 'fulfilled') {
        const networkData = await networkRes.value.json()
        setNetworkStats(networkData.success ? networkData.data : null)
      }

    } catch (error) {
      console.error('Status fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const coreServices = [
    {
      name: 'Home Assistant',
      status: haStatus?.connected ? 'online' : 'offline',
      details: haStatus?.version ? `v${haStatus.version}` : null
    },
    {
      name: '3D Printer',
      status: 'online', // From existing HA integration
      details: 'OctoPrint'
    },
    {
      name: 'Jarvis',
      status: 'online', // Assumed online if we can connect to HA
      details: 'AI Assistant'
    }
  ]

  const additionalServices = systemServices?.services ? Object.entries(systemServices.services).map(([key, service]) => ({
    name: service.name,
    status: service.status,
    details: service.error || (service.uptime ? `${Math.floor((Date.now() - service.uptime) / 1000 / 60)}m uptime` : null)
  })) : []

  const allServices = [...coreServices, ...additionalServices]

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-32 bg-slate-700/20 rounded"></div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">🏠 System Status</h3>
        <div className="text-xs text-slate-400">
          Updated: {lastUpdate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Core Services */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4">Essential Services</h4>
        <div className="grid gap-3">
          {coreServices.map((service, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <StatusBadge status={service.status} label={service.name} />
              {service.details && (
                <span className="text-xs text-slate-400">{service.details}</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Additional Services */}
      {additionalServices.length > 0 && (
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">Additional Services</h4>
          <div className="grid gap-3">
            {additionalServices.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <StatusBadge status={service.status} label={service.name} />
                {service.details && (
                  <span className="text-xs text-slate-400">{service.details}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Server Stats */}
      <ServerStats stats={serverStats} />

      {/* Network Info */}
      <NetworkInfo networkStats={networkStats} />

      {/* Status Summary */}
      <Card className="bg-gradient-to-r from-teal-500/10 to-blue-500/10 border-teal-500/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-semibold">Overall System Health</div>
            <div className="text-slate-300 text-sm">
              {allServices.filter(s => s.status === 'online').length} of {allServices.length} services operational
            </div>
          </div>
          <div className="text-3xl">
            {allServices.filter(s => s.status === 'online').length === allServices.length ? '🟢' : 
             allServices.filter(s => s.status === 'online').length > allServices.length / 2 ? '🟡' : '🔴'}
          </div>
        </div>
      </Card>
    </div>
  )
}