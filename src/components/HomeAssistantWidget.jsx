import { useState, useEffect } from 'react'
import { Card, Button, Badge } from './ui'
import { ActivityLogIcon, LightningBoltIcon, GlobeIcon, ReloadIcon } from '@radix-ui/react-icons'
import { api, useApiCall } from '../lib/api'

// Home stats component with real HA data
export function HomeStats() {
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useApiCall(() => api.getStats())
  const { data: status, loading: statusLoading, error: statusError } = useApiCall(() => api.getStatus())

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchStats()
    }, 60000)
    
    return () => clearInterval(interval)
  }, [refetchStats])

  if (statsLoading || statusLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          🏠 Home Status
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-slate-800/50">
              <div className="animate-pulse flex items-center gap-3">
                <div className="w-5 h-5 bg-slate-600 rounded"></div>
                <div className="flex-1">
                  <div className="w-20 h-3 bg-slate-600 rounded mb-1"></div>
                  <div className="w-16 h-4 bg-slate-600 rounded"></div>
                </div>
                <div className="w-6 h-6 bg-slate-600 rounded-full"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const homeAssistantConnected = status?.success && status?.data?.connected

  // Build stats array from API data
  const displayStats = []

  // Climate data
  if (stats?.success && stats?.data?.climate) {
    const climate = stats.data.climate
    displayStats.push({
      icon: <ActivityLogIcon className="w-5 h-5" />,
      label: climate.friendly_name || 'Living Room',
      value: `${climate.current_temperature}°${climate.unit?.replace('°C', 'C') || 'C'}`,
      status: 'normal',
      color: 'text-blue-400',
      subtitle: `Target: ${climate.temperature}°C` + (climate.hvac_action ? ` • ${climate.hvac_action}` : '')
    })
  }

  // Power data
  if (stats?.success && stats?.data?.power) {
    const power = stats.data.power
    displayStats.push({
      icon: <LightningBoltIcon className="w-5 h-5" />,
      label: 'Power Usage',
      value: `${power.current_usage_kw} kW`,
      status: 'normal',
      color: 'text-yellow-400',
      subtitle: `${Math.round(power.current_usage)} W`
    })
  }

  // Home Assistant connection status
  displayStats.push({
    icon: <GlobeIcon className="w-5 h-5" />,
    label: 'Home Assistant',
    value: homeAssistantConnected ? 'Online' : 'Offline',
    status: homeAssistantConnected ? 'good' : 'error',
    color: homeAssistantConnected ? 'text-emerald-400' : 'text-red-400',
    subtitle: status?.data?.version ? `v${status.data.version}` : (statusError || statsError || 'Unknown')
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          🏠 Home Status
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refetchStats}
          className="opacity-70 hover:opacity-100"
        >
          <ReloadIcon className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
        {displayStats.map((stat, index) => (
          <Card key={index} className="bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={stat.color}>{stat.icon}</div>
                <div className="flex-1">
                  <div className="text-slate-300 text-sm">{stat.label}</div>
                  <div className={`font-semibold ${stat.color}`}>{stat.value}</div>
                  {stat.subtitle && (
                    <div className="text-xs text-slate-500">{stat.subtitle}</div>
                  )}
                </div>
              </div>
              <Badge variant={
                stat.status === 'good' ? 'success' : 
                stat.status === 'error' ? 'destructive' : 'default'
              }>
                {stat.status === 'good' ? '●' : 
                 stat.status === 'error' ? '✕' : '○'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Error display */}
      {(statsError || statusError) && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded p-2">
          <div className="font-medium">Connection Issues:</div>
          {statsError && <div>• Stats: {statsError}</div>}
          {statusError && <div>• Status: {statusError}</div>}
        </div>
      )}
    </div>
  )
}

// Tesla status widget
export function TeslaWidget() {
  const { data: tesla, loading, error, refetch } = useApiCall(() => api.getTesla())

  if (loading) {
    return (
      <Card className="bg-slate-800/50">
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-2xl">🚗</div>
            <div>
              <div className="w-16 h-4 bg-slate-600 rounded mb-1"></div>
              <div className="w-24 h-3 bg-slate-600 rounded"></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (error || !tesla?.success) {
    return (
      <Card className="bg-slate-800/50 opacity-50">
        <div className="flex items-center gap-3">
          <div className="text-2xl opacity-50">🚗</div>
          <div>
            <div className="text-slate-300 text-sm">Tesla "Timmy"</div>
            <div className="text-red-400 text-xs">{error || 'Unavailable'}</div>
          </div>
        </div>
      </Card>
    )
  }

  const teslaData = tesla.data

  return (
    <Card className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-slate-600/30">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🚗</div>
            <div>
              <div className="text-white font-medium">Tesla "{teslaData.vehicle_name}"</div>
              <div className="text-xs text-slate-400">
                {teslaData.available ? 'Connected' : 'Offline'}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <ReloadIcon className="w-4 h-4" />
          </Button>
        </div>

        {teslaData.available && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {teslaData.charging && (
              <div className="flex items-center gap-2">
                <span className={teslaData.charging.is_charging ? 'text-green-400' : 'text-slate-400'}>
                  ⚡
                </span>
                <span className="text-slate-300">
                  {teslaData.charging.is_charging ? 'Charging' : 'Not charging'}
                </span>
              </div>
            )}
            
            {teslaData.sentry_mode && (
              <div className="flex items-center gap-2">
                <span className={teslaData.sentry_mode.enabled ? 'text-red-400' : 'text-slate-400'}>
                  👁️
                </span>
                <span className="text-slate-300">
                  {teslaData.sentry_mode.enabled ? 'Sentry on' : 'Sentry off'}
                </span>
              </div>
            )}

            {teslaData.climate && teslaData.climate.current_temperature && (
              <div className="flex items-center gap-2">
                <span className="text-blue-400">🌡️</span>
                <span className="text-slate-300">
                  {teslaData.climate.current_temperature}°C
                </span>
              </div>
            )}

            {teslaData.valet_mode && (
              <div className="flex items-center gap-2">
                <span className={teslaData.valet_mode.enabled ? 'text-orange-400' : 'text-slate-400'}>
                  🔑
                </span>
                <span className="text-slate-300">
                  {teslaData.valet_mode.enabled ? 'Valet on' : 'Valet off'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// Home Assistant weather widget
export function HAWeatherWidget() {
  const { data: weather, loading, error } = useApiCall(() => api.getWeather())

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

  // If HA weather fails, fall back to external weather
  if (error || !weather?.success || !weather?.data?.primary_weather) {
    return null // Let the original weather widget handle this
  }

  const weatherData = weather.data

  return (
    <Card className="bg-gradient-to-r from-blue-900/30 to-blue-700/30 border-blue-600/30">
      <div className="flex items-center gap-4">
        <div className="text-4xl">
          {weatherData.primary_weather.state === 'sunny' ? '☀️' :
           weatherData.primary_weather.state === 'partlycloudy' ? '⛅' :
           weatherData.primary_weather.state === 'cloudy' ? '☁️' :
           weatherData.primary_weather.state === 'rainy' ? '🌧️' :
           '🌤️'}
        </div>
        <div>
          <div className="text-2xl font-bold text-white">
            {weatherData.primary_weather.temperature}°C
          </div>
          <div className="text-blue-200 text-sm capitalize">
            {weatherData.primary_weather.state}
          </div>
          <div className="text-blue-300 text-xs">
            {weatherData.location}
          </div>
        </div>
        <div className="ml-auto text-right text-blue-200 text-xs">
          {weatherData.primary_weather.humidity && (
            <div>💧 {weatherData.primary_weather.humidity}%</div>
          )}
          {weatherData.primary_weather.wind_speed && (
            <div>💨 {weatherData.primary_weather.wind_speed} km/h</div>
          )}
          {weatherData.primary_weather.pressure && (
            <div>📊 {weatherData.primary_weather.pressure} hPa</div>
          )}
        </div>
      </div>
    </Card>
  )
}

// Device status overview
export function DeviceOverview() {
  const { data: devices, loading, error, refetch } = useApiCall(() => api.getDevices())

  if (loading) {
    return (
      <Card className="bg-slate-800/50">
        <div className="animate-pulse space-y-2">
          <div className="w-24 h-4 bg-slate-600 rounded"></div>
          <div className="w-32 h-3 bg-slate-600 rounded"></div>
        </div>
      </Card>
    )
  }

  if (error || !devices?.success) {
    return (
      <Card className="bg-slate-800/50 opacity-50">
        <div className="text-slate-400 text-sm">
          Device status unavailable
        </div>
      </Card>
    )
  }

  const deviceData = devices.data
  const summary = devices.summary

  return (
    <Card className="bg-slate-800/50">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-white text-sm font-medium">Smart Devices</div>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <ReloadIcon className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">💡</span>
            <span className="text-slate-300">
              {summary.lights_on}/{deviceData.lights?.length || 0} Lights
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-green-400">🔌</span>
            <span className="text-slate-300">
              {summary.switches_on}/{deviceData.switches?.length || 0} Switches
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-blue-400">📡</span>
            <span className="text-slate-300">
              {summary.sensors_active}/{deviceData.sensors?.length || 0} Sensors
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-purple-400">🏠</span>
            <span className="text-slate-300">
              {deviceData.appliances?.length || 0} Appliances
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}