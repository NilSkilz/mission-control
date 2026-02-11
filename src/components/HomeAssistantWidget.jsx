import { useState, useEffect } from 'react'
import { Card, Button, Badge } from './ui'
import { ActivityLogIcon, LightningBoltIcon, GlobeIcon, ReloadIcon } from '@radix-ui/react-icons'
import { api, useApiCall } from '../lib/api'

// Home environment stats (temperature & power) - displayed as inline cards
export function HomeEnvironment() {
  const { data: stats, loading, error, refetch } = useApiCall(() => api.getStats())

  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 60000)
    return () => clearInterval(interval)
  }, [refetch])

  if (loading) {
    return (
      <>
        {[1, 2].map((i) => (
          <Card key={i} className="bg-slate-800/50">
            <div className="animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-600 rounded-lg"></div>
              <div>
                <div className="w-20 h-3 bg-slate-600 rounded mb-1"></div>
                <div className="w-16 h-5 bg-slate-600 rounded"></div>
              </div>
            </div>
          </Card>
        ))}
      </>
    )
  }

  if (error || !stats?.success) return null

  const climate = stats.data?.climate
  const power = stats.data?.power

  if (!climate && !power) return null

  return (
    <>
      {climate && (
        <Card className="bg-slate-800/50 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="text-blue-400 bg-blue-500/10 p-2 rounded-lg">
              <ActivityLogIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-400 text-xs">{climate.friendly_name || 'Living Room'}</div>
              <div className="text-white font-semibold text-lg">{climate.current_temperature}°C</div>
              <div className="text-slate-500 text-xs">
                Target: {climate.temperature}°C{climate.hvac_action ? ` · ${climate.hvac_action}` : ''}
              </div>
            </div>
          </div>
        </Card>
      )}
      {power && (
        <Card className="bg-slate-800/50 border-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="text-yellow-400 bg-yellow-500/10 p-2 rounded-lg">
              <LightningBoltIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-400 text-xs">Power Usage</div>
              <div className="text-white font-semibold text-lg">{power.current_usage_kw} kW</div>
              <div className="text-slate-500 text-xs">{Math.round(power.current_usage)} W</div>
            </div>
          </div>
        </Card>
      )}
    </>
  )
}

// System status row: HA, 3D Printer, Jarvis
export function SystemStatus() {
  const { data: haStatus, loading: haLoading } = useApiCall(() => api.getStatus())
  const { data: printer, loading: printerLoading } = useApiCall(() => api.getPrinter())

  const haConnected = haStatus?.success && haStatus?.data?.connected
  const haVersion = haStatus?.data?.version

  const printerAvailable = printer?.success && printer?.data?.available
  const printing = printer?.data?.printing
  const printerState = printer?.data?.state
  const progress = printer?.data?.job_percentage

  function getPrinterLabel() {
    if (printerLoading) return 'Checking...'
    if (!printerAvailable) return 'Off'
    if (printing) return progress != null ? `Printing · ${Math.round(progress)}%` : 'Printing'
    return printerState || 'Idle'
  }

  function getPrinterColor() {
    if (!printerAvailable) return { dot: 'bg-slate-500', text: 'text-slate-500' }
    if (printing) return { dot: 'bg-green-400', text: 'text-green-400' }
    return { dot: 'bg-emerald-400', text: 'text-white' }
  }

  const printerColor = getPrinterColor()

  return (
    <Card className="bg-slate-800/50">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* HA Status */}
        <div className="flex items-center gap-3">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${haLoading ? 'bg-slate-500 animate-pulse' : haConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <div>
            <div className="text-xs text-slate-400">Home Assistant</div>
            <div className={`text-sm font-medium ${haLoading ? 'text-slate-500' : haConnected ? 'text-white' : 'text-red-400'}`}>
              {haLoading ? 'Checking...' : haConnected ? (haVersion ? `v${haVersion}` : 'Online') : 'Offline'}
            </div>
          </div>
        </div>

        {/* 3D Printer */}
        <div className="flex items-center gap-3">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${printerLoading ? 'bg-slate-500 animate-pulse' : printerColor.dot}`} />
          <div>
            <div className="text-xs text-slate-400">3D Printer</div>
            <div className={`text-sm font-medium ${printerColor.text}`}>
              {getPrinterLabel()}
            </div>
            {printing && progress != null && (
              <div className="w-20 bg-slate-700 rounded-full h-1 mt-0.5">
                <div className="bg-green-400 h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Jarvis */}
        <div className="flex items-center gap-3">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <div>
            <div className="text-xs text-slate-400">Jarvis</div>
            <div className="text-sm font-medium text-white">Online</div>
          </div>
        </div>
      </div>
    </Card>
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