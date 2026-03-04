import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Card, Button } from './ui'

const ENERGY_ENTITIES = {
  solar_power: 'sensor.solis_ac_output_total_power',
  solar_energy: 'sensor.solis_energy_today',
  battery_power: 'sensor.solis_battery_power',
  grid_import: 'sensor.shellyem_34945470ed50_channel_1_power',
  grid_export: 'sensor.shellyem_34945470ed50_channel_2_power',
  temperature: 'climate.living_room'
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function formatValue(value, unit) {
  if (!value && value !== 0) return 'N/A'
  
  if (unit === 'W') {
    return value > 1000 ? `${(value / 1000).toFixed(1)}kW` : `${Math.round(value)}W`
  }
  if (unit === 'kWh') {
    return `${value.toFixed(1)}kWh`
  }
  if (unit === '°C') {
    return `${value.toFixed(1)}°C`
  }
  return `${value}`
}

export function EnergyCharts() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('1day')
  const [refreshTime, setRefreshTime] = useState(new Date())

  useEffect(() => {
    fetchEnergyData()
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchEnergyData()
      setRefreshTime(new Date())
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [period])

  const fetchEnergyData = async () => {
    try {
      setLoading(true)
      const entities = Object.values(ENERGY_ENTITIES).join(',')
      const response = await fetch(`/api/ha/history?period=${period}&entities=${entities}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.error || 'Failed to fetch energy data')
      }
    } catch (error) {
      console.error('Energy data fetch error:', error)
      setError('Network error fetching energy data')
    } finally {
      setLoading(false)
    }
  }

  // Process data for charts
  const processChartData = (entityData, dataKey) => {
    if (!data?.history[entityData]) return []
    
    return data.history[entityData]
      .filter(point => point.value !== null && !isNaN(point.value))
      .map(point => ({
        timestamp: point.timestamp,
        time: formatTime(point.timestamp),
        [dataKey]: point.value,
        unit: point.unit
      }))
  }

  // Combine power data for comprehensive view
  const combinePowerData = () => {
    if (!data) return []
    
    const solarData = data.history[ENERGY_ENTITIES.solar_power] || []
    const batteryData = data.history[ENERGY_ENTITIES.battery_power] || []
    const gridImportData = data.history[ENERGY_ENTITIES.grid_import] || []
    const gridExportData = data.history[ENERGY_ENTITIES.grid_export] || []
    
    // Create time-aligned dataset
    const timeMap = new Map()
    
    const addToTimeMap = (dataArray, key) => {
      dataArray.forEach(point => {
        const timeKey = new Date(point.timestamp).getTime()
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, { timestamp: point.timestamp, time: formatTime(point.timestamp) })
        }
        timeMap.get(timeKey)[key] = point.value
      })
    }
    
    addToTimeMap(solarData, 'solar')
    addToTimeMap(batteryData, 'battery')
    addToTimeMap(gridImportData, 'gridImport')
    addToTimeMap(gridExportData, 'gridExport')
    
    return Array.from(timeMap.values()).sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    ).slice(-50) // Limit to last 50 points for readability
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <Card className="h-64 bg-slate-700/20">
            <div className="flex items-center justify-center h-full text-slate-500">
              Loading energy data...
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-red-500/10 border-red-500/20">
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">⚠️ Energy Data Unavailable</div>
          <div className="text-slate-400 text-sm mb-4">{error}</div>
          <Button onClick={fetchEnergyData} size="sm">Retry</Button>
        </div>
      </Card>
    )
  }

  const powerData = combinePowerData()
  const temperatureData = processChartData(ENERGY_ENTITIES.temperature, 'temperature')
  const solarEnergyData = processChartData(ENERGY_ENTITIES.solar_energy, 'energy')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">⚡ Energy Dashboard</h3>
        <div className="flex items-center gap-2">
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-white text-sm"
          >
            <option value="1day">24 Hours</option>
            <option value="7days">7 Days</option>
          </select>
          <div className="text-xs text-slate-400">
            Updated: {refreshTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Power Flow Chart */}
      {powerData.length > 0 && (
        <Card>
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-white mb-2">🔋 Power Flow</h4>
            <div className="text-sm text-slate-400">Solar, Battery, and Grid Power (W)</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={powerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                fontSize={12}
                interval="preserveStartEnd"
              />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f1f5f9'
                }}
                formatter={(value, name) => [
                  formatValue(value, 'W'),
                  name === 'solar' ? 'Solar' :
                  name === 'battery' ? 'Battery' :
                  name === 'gridImport' ? 'Grid Import' :
                  name === 'gridExport' ? 'Grid Export' : name
                ]}
              />
              <Line type="monotone" dataKey="solar" stroke="#fbbf24" strokeWidth={2} dot={false} name="Solar" />
              <Line type="monotone" dataKey="battery" stroke="#10b981" strokeWidth={2} dot={false} name="Battery" />
              <Line type="monotone" dataKey="gridImport" stroke="#ef4444" strokeWidth={2} dot={false} name="Grid Import" />
              <Line type="monotone" dataKey="gridExport" stroke="#3b82f6" strokeWidth={2} dot={false} name="Grid Export" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Solar Energy Today */}
      {solarEnergyData.length > 0 && (
        <Card>
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-white mb-2">☀️ Solar Energy Today</h4>
            <div className="text-sm text-slate-400">Cumulative energy generation (kWh)</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={solarEnergyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f1f5f9'
                }}
                formatter={(value) => [formatValue(value, 'kWh'), 'Energy Generated']}
              />
              <Area 
                type="monotone" 
                dataKey="energy" 
                stroke="#fbbf24" 
                fill="#fbbf24" 
                fillOpacity={0.3} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Temperature */}
      {temperatureData.length > 0 && (
        <Card>
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-white mb-2">🌡️ Indoor Temperature</h4>
            <div className="text-sm text-slate-400">Living room temperature (°C)</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={temperatureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f1f5f9'
                }}
                formatter={(value) => [formatValue(value, '°C'), 'Temperature']}
              />
              <Line 
                type="monotone" 
                dataKey="temperature" 
                stroke="#06b6d4" 
                strokeWidth={2} 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {data?.errors && data.errors.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <div className="text-amber-400 text-sm">
            <div className="font-medium mb-2">⚠️ Some data sources unavailable:</div>
            <ul className="list-disc list-inside space-y-1">
              {data.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  )
}