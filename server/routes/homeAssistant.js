import express from 'express'
import axios from 'axios'
import WebSocket from 'ws'
import { list } from '../lib/familyDb.js'

const router = express.Router()

// Home Assistant API client
class HomeAssistantClient {
  constructor() {
    this.baseURL = process.env.HA_BASE_URL || 'http://localhost:8123'
    this.token = process.env.HA_TOKEN
    
    if (!this.token) {
      throw new Error('HA_TOKEN environment variable is required')
    }
    
    this.client = axios.create({
      baseURL: `${this.baseURL}/api`,
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🏠 HA API: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('HA Request Error:', error)
        return Promise.reject(error)
      }
    )
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Home Assistant is offline or unreachable')
        }
        if (error.response?.status === 401) {
          throw new Error('Home Assistant authentication failed - check token')
        }
        if (error.response?.status === 404) {
          throw new Error('Home Assistant endpoint not found')
        }
        throw new Error(error.response?.data?.message || error.message || 'Home Assistant API error')
      }
    )
  }
  
  async getStates() {
    const response = await this.client.get('/states')
    return response.data
  }
  
  async getState(entityId) {
    try {
      const response = await this.client.get(`/states/${entityId}`)
      return response.data
    } catch (error) {
      if (error.response?.status === 404) {
        return null // Entity not found
      }
      throw error
    }
  }
  
  async callService(domain, service, data = {}) {
    const response = await this.client.post(`/services/${domain}/${service}`, data)
    return response.data
  }
}

const ha = new HomeAssistantClient()

// GET /api/ha/stats - Temperature, climate, power usage
router.get('/stats', async (req, res) => {
  try {
    const [
      climateState,
      powerEntities
    ] = await Promise.allSettled([
      ha.getState('climate.living_room'),
      ha.getStates() // Get all states to filter power-related ones
    ])
    
    const stats = {
      climate: null,
      power: null,
      energy: null,
      timestamp: new Date().toISOString()
    }
    
    // Process climate data
    if (climateState.status === 'fulfilled' && climateState.value) {
      const climate = climateState.value
      stats.climate = {
        current_temperature: parseFloat(climate.attributes.current_temperature) || null,
        temperature: parseFloat(climate.attributes.temperature) || null,
        humidity: parseFloat(climate.attributes.current_humidity) || null,
        hvac_mode: climate.state,
        hvac_action: climate.attributes.hvac_action || null,
        preset_mode: climate.attributes.preset_mode || null,
        friendly_name: climate.attributes.friendly_name || 'Living Room',
        unit: climate.attributes.unit_of_measurement || '°C'
      }
    }
    
    // Process power/energy data from all states
    if (powerEntities.status === 'fulfilled') {
      const states = powerEntities.value
      const powerSensors = states.filter(state => 
        state.entity_id.includes('power') || 
        state.entity_id.includes('energy') ||
        state.attributes.unit_of_measurement === 'W' ||
        state.attributes.unit_of_measurement === 'kW' ||
        state.attributes.unit_of_measurement === 'kWh'
      )
      
      if (powerSensors.length > 0) {
        // Calculate total power usage from W and kW sensors
        const currentPowerW = powerSensors
          .filter(s => s.attributes.unit_of_measurement === 'W')
          .reduce((sum, sensor) => sum + (parseFloat(sensor.state) || 0), 0)
          
        const currentPowerKW = powerSensors
          .filter(s => s.attributes.unit_of_measurement === 'kW')
          .reduce((sum, sensor) => sum + (parseFloat(sensor.state) || 0), 0)
        
        const totalPowerW = currentPowerW + (currentPowerKW * 1000)
        
        stats.power = {
          current_usage: totalPowerW > 0 ? totalPowerW : null,
          current_usage_kw: totalPowerW > 0 ? (totalPowerW / 1000).toFixed(2) : null,
          unit: 'W',
          sensors_count: powerSensors.length,
          details: powerSensors.slice(0, 5).map(s => ({
            entity_id: s.entity_id,
            friendly_name: s.attributes.friendly_name,
            state: parseFloat(s.state) || 0,
            unit: s.attributes.unit_of_measurement
          }))
        }
        
        // Energy consumption data
        const energySensors = powerSensors.filter(s => s.attributes.unit_of_measurement === 'kWh')
        if (energySensors.length > 0) {
          const totalEnergyKWh = energySensors.reduce((sum, sensor) => sum + (parseFloat(sensor.state) || 0), 0)
          stats.energy = {
            total_consumption: totalEnergyKWh,
            unit: 'kWh',
            sensors: energySensors.map(s => ({
              entity_id: s.entity_id,
              friendly_name: s.attributes.friendly_name,
              consumption: parseFloat(s.state) || 0
            }))
          }
        }
      }
    }
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Stats API Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})


// GET /api/ha/devices - Device status (lights, switches, sensors)
router.get('/devices', async (req, res) => {
  try {
    const deviceEntities = [
      'light.aurora_52_50_96',
      'light.living_room_lights_led',
      'switch.living_room_lights',
      'switch.snug_lights',
      'switch.vivarium_plug',
      'binary_sensor.octoprint_printing',
      'switch.tumble_dryer_tumble_dryer',
      'binary_sensor.tumble_dryer_door_open'
    ]
    
    const deviceStates = await Promise.allSettled(
      deviceEntities.map(entityId => ha.getState(entityId))
    )
    
    const devices = {
      lights: [],
      switches: [],
      sensors: [],
      appliances: [],
      timestamp: new Date().toISOString()
    }
    
    deviceStates.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const state = result.value
        const entityId = deviceEntities[index]
        
        const deviceData = {
          entity_id: entityId,
          friendly_name: state.attributes.friendly_name || entityId,
          state: state.state,
          last_changed: state.last_changed,
          last_updated: state.last_updated,
          attributes: {}
        }
        
        // Add relevant attributes based on device type
        if (state.attributes.brightness) {
          deviceData.attributes.brightness = state.attributes.brightness
          deviceData.attributes.brightness_pct = Math.round((state.attributes.brightness / 255) * 100)
        }
        if (state.attributes.rgb_color) {
          deviceData.attributes.rgb_color = state.attributes.rgb_color
        }
        if (state.attributes.effect) {
          deviceData.attributes.effect = state.attributes.effect
        }
        
        // Categorize devices
        if (entityId.startsWith('light.')) {
          devices.lights.push(deviceData)
        } else if (entityId.startsWith('switch.') && !entityId.includes('tumble_dryer')) {
          devices.switches.push(deviceData)
        } else if (entityId.startsWith('binary_sensor.')) {
          devices.sensors.push(deviceData)
        } else if (entityId.includes('tumble_dryer')) {
          devices.appliances.push(deviceData)
        }
      }
    })
    
    res.json({
      success: true,
      data: devices,
      summary: {
        lights_on: devices.lights.filter(l => l.state === 'on').length,
        switches_on: devices.switches.filter(s => s.state === 'on').length,
        sensors_active: devices.sensors.filter(s => s.state === 'on').length,
        total_devices: Object.values(devices).reduce((sum, arr) => {
          return sum + (Array.isArray(arr) ? arr.length : 0)
        }, 0) - 1 // subtract timestamp
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Devices API Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/ha/weather - Local weather from HA
router.get('/weather', async (req, res) => {
  try {
    // Get all states and filter for weather-related entities
    const allStates = await ha.getStates()
    const weatherEntities = allStates.filter(state => 
      state.entity_id.startsWith('weather.') ||
      state.entity_id.startsWith('sensor.') && (
        state.attributes.unit_of_measurement === '°C' ||
        state.attributes.unit_of_measurement === '%' ||
        state.attributes.device_class === 'temperature' ||
        state.attributes.device_class === 'humidity' ||
        state.attributes.device_class === 'pressure' ||
        state.entity_id.includes('temperature') ||
        state.entity_id.includes('humidity') ||
        state.entity_id.includes('weather')
      )
    )
    
    const weather = {
      primary_weather: null,
      sensors: [],
      location: 'Crackington Haven', // Default location
      timestamp: new Date().toISOString()
    }
    
    // Find primary weather entity
    const primaryWeatherEntity = weatherEntities.find(entity => 
      entity.entity_id.startsWith('weather.')
    )
    
    if (primaryWeatherEntity) {
      weather.primary_weather = {
        entity_id: primaryWeatherEntity.entity_id,
        state: primaryWeatherEntity.state,
        temperature: parseFloat(primaryWeatherEntity.attributes.temperature) || null,
        humidity: parseFloat(primaryWeatherEntity.attributes.humidity) || null,
        pressure: parseFloat(primaryWeatherEntity.attributes.pressure) || null,
        wind_bearing: parseFloat(primaryWeatherEntity.attributes.wind_bearing) || null,
        wind_speed: parseFloat(primaryWeatherEntity.attributes.wind_speed) || null,
        visibility: parseFloat(primaryWeatherEntity.attributes.visibility) || null,
        forecast: primaryWeatherEntity.attributes.forecast || null,
        friendly_name: primaryWeatherEntity.attributes.friendly_name,
        attribution: primaryWeatherEntity.attributes.attribution
      }
      
      if (primaryWeatherEntity.attributes.friendly_name) {
        weather.location = primaryWeatherEntity.attributes.friendly_name.replace(/weather/i, '').trim()
      }
    }
    
    // Add temperature and humidity sensors
    weather.sensors = weatherEntities
      .filter(entity => entity.entity_id.startsWith('sensor.'))
      .slice(0, 10) // Limit to first 10 sensors
      .map(sensor => ({
        entity_id: sensor.entity_id,
        friendly_name: sensor.attributes.friendly_name || sensor.entity_id,
        state: parseFloat(sensor.state) || sensor.state,
        unit: sensor.attributes.unit_of_measurement,
        device_class: sensor.attributes.device_class,
        last_updated: sensor.last_updated
      }))
    
    // Fallback: If no HA weather, provide external weather note
    if (!weather.primary_weather && weather.sensors.length === 0) {
      weather.fallback_note = 'No Home Assistant weather entities found. Using external weather service.'
      weather.external_weather_url = 'https://wttr.in/Crackington+Haven?format=j1'
    }
    
    res.json({
      success: true,
      data: weather,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Weather API Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      fallback_note: 'Home Assistant weather unavailable. Frontend can use external weather service.',
      external_weather_url: 'https://wttr.in/Crackington+Haven?format=j1',
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/ha/printer - OctoPrint / 3D printer status
router.get('/printer', async (req, res) => {
  try {
    const printerEntities = [
      'binary_sensor.octoprint_printing',
      'sensor.octoprint_current_state',
      'sensor.octoprint_job_percentage',
      'sensor.octoprint_estimated_finish_time',
      'sensor.octoprint_actual_printer_state'
    ]

    const results = await Promise.allSettled(
      printerEntities.map(entityId => ha.getState(entityId))
    )

    const printer = {
      available: false,
      printing: false,
      state: null,
      job_percentage: null,
      estimated_finish: null,
      timestamp: new Date().toISOString()
    }

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const state = result.value
        printer.available = true

        switch (printerEntities[index]) {
          case 'binary_sensor.octoprint_printing':
            printer.printing = state.state === 'on'
            break
          case 'sensor.octoprint_current_state':
            printer.state = state.state
            break
          case 'sensor.octoprint_job_percentage':
            printer.job_percentage = parseFloat(state.state) || null
            break
          case 'sensor.octoprint_estimated_finish_time':
            printer.estimated_finish = state.state !== 'unknown' ? state.state : null
            break
          case 'sensor.octoprint_actual_printer_state':
            if (!printer.state) printer.state = state.state
            break
        }
      }
    })

    res.json({
      success: true,
      data: printer,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Printer API Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/ha/status - Overall HA connection status
router.get('/status', async (req, res) => {
  try {
    const configResponse = await ha.client.get('/config')
    const config = configResponse.data
    
    res.json({
      success: true,
      data: {
        connected: true,
        version: config.version,
        location_name: config.location_name,
        latitude: config.latitude,
        longitude: config.longitude,
        unit_system: config.unit_system,
        time_zone: config.time_zone,
        components: config.components ? config.components.length : 0,
        state_count: (await ha.getStates()).length
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Status API Error:', error)
    res.status(500).json({
      success: false,
      data: {
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/ha/states - Fetch specific entity states
router.get('/states', async (req, res) => {
  try {
    const { entities } = req.query
    
    if (!entities) {
      return res.status(400).json({
        success: false,
        error: 'entities query parameter is required (comma-separated list)'
      })
    }
    
    const entityIds = entities.split(',').map(e => e.trim()).filter(Boolean)
    
    // Fetch all requested entity states in parallel
    const statePromises = entityIds.map(id => ha.getState(id).catch(() => null))
    const states = await Promise.all(statePromises)
    
    // Filter out null results (entities not found)
    const validStates = states.filter(s => s !== null)
    
    res.json({
      success: true,
      data: validStates,
      requested: entityIds.length,
      found: validStates.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('States API Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/ha/history - Time-series data for charts
router.get('/history', async (req, res) => {
  try {
    const { period = '1day', entities } = req.query
    
    // Default entities for energy graphs
    const defaultEntities = [
      'sensor.solis_ac_output_total_power',
      'sensor.solis_energy_today', 
      'sensor.solis_battery_power',
      'sensor.solis_total_energy_charged',
      'sensor.solis_total_energy_discharged',
      'sensor.shellyem_34945470ed50_channel_1_power',
      'sensor.shellyem_34945470ed50_channel_2_power',
      'climate.living_room'
    ]
    
    const targetEntities = entities ? entities.split(',') : defaultEntities
    
    // Calculate start time based on period
    const now = new Date()
    const startTime = new Date()
    switch (period) {
      case '1day':
        startTime.setDate(now.getDate() - 1)
        break
      case '7days':
        startTime.setDate(now.getDate() - 7)
        break
      case '1month':
        startTime.setMonth(now.getMonth() - 1)
        break
      default:
        startTime.setDate(now.getDate() - 1)
    }
    
    const history = {}
    const errors = []
    
    // Fetch history for each entity
    for (const entityId of targetEntities) {
      try {
        const response = await ha.client.get(`/history/period/${startTime.toISOString()}`, {
          params: {
            filter_entity_id: entityId,
            end_time: now.toISOString()
          }
        })
        
        if (response.data && response.data[0]) {
          // Process the history data
          history[entityId] = response.data[0].map(point => ({
            timestamp: point.last_updated,
            value: parseFloat(point.state) || 0,
            unit: point.attributes?.unit_of_measurement || null,
            friendly_name: point.attributes?.friendly_name || entityId
          })).filter(point => !isNaN(point.value))
        } else {
          history[entityId] = []
        }
      } catch (error) {
        errors.push(`${entityId}: ${error.message}`)
        history[entityId] = []
      }
    }
    
    res.json({
      success: true,
      data: {
        period,
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        history,
        entities: targetEntities,
        errors: errors.length > 0 ? errors : null
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('History API Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/ha/current-energy - Current energy flow data for visualization
router.get('/current-energy', async (req, res) => {
  try {
    // Define energy-related entity IDs
    const energyEntities = {
      solar_power: 'sensor.solis_ac_output_total_power',
      solar_energy: 'sensor.solis_energy_today',
      battery_power: 'sensor.solis_battery_power',
      grid_import: 'sensor.shellyem_34945470ed50_channel_1_power',
      grid_export: 'sensor.shellyem_34945470ed50_channel_2_power',
      // Add more specific consumption entities if available
      house_total: 'sensor.house_total_power',
      kitchen: 'sensor.kitchen_power',
      living_room: 'sensor.living_room_power',
      upstairs: 'sensor.upstairs_power',
      office: 'sensor.office_power'
    }

    // Fetch current states for all energy entities
    const energyStates = await Promise.allSettled(
      Object.entries(energyEntities).map(([key, entityId]) => 
        ha.getState(entityId).then(state => ({ key, state })).catch(() => ({ key, state: null }))
      )
    )

    const energy = {
      solar: { power: null, unit: 'W' },
      battery: { power: null, unit: 'W' },
      grid_import: { power: null, unit: 'W' },
      grid_export: { power: null, unit: 'W' },
      house_consumption: { power: null, unit: 'W' },
      areas: {
        kitchen: { power: null, unit: 'W' },
        living_room: { power: null, unit: 'W' },
        upstairs: { power: null, unit: 'W' },
        office: { power: null, unit: 'W' }
      },
      timestamp: new Date().toISOString()
    }

    // Process results
    energyStates.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { key, state } = result.value
        const power = state ? parseFloat(state.state) || 0 : null

        switch (key) {
          case 'solar_power':
            energy.solar.power = power
            break
          case 'battery_power':
            energy.battery.power = power
            break
          case 'grid_import':
            energy.grid_import.power = power
            break
          case 'grid_export':
            energy.grid_export.power = power
            break
          case 'house_total':
            energy.house_consumption.power = power
            break
          case 'kitchen':
            if (power !== null) energy.areas.kitchen.power = power
            break
          case 'living_room':
            if (power !== null) energy.areas.living_room.power = power
            break
          case 'upstairs':
            if (power !== null) energy.areas.upstairs.power = power
            break
          case 'office':
            if (power !== null) energy.areas.office.power = power
            break
        }
      }
    })

    // Calculate house consumption if not available directly
    if (energy.house_consumption.power === null) {
      const areaConsumption = Object.values(energy.areas)
        .map(area => area.power || 0)
        .reduce((sum, power) => sum + power, 0)
      
      if (areaConsumption > 0) {
        energy.house_consumption.power = areaConsumption
      } else {
        // Fallback calculation: solar + grid_import - grid_export - battery_charging
        const solar = energy.solar.power || 0
        const gridImport = energy.grid_import.power || 0
        const gridExport = energy.grid_export.power || 0
        const batteryPower = energy.battery.power || 0 // Negative if charging

        energy.house_consumption.power = solar + gridImport - gridExport - batteryPower
      }
    }

    // Add some mock area data if no specific sensors available
    if (Object.values(energy.areas).every(area => area.power === null)) {
      const totalConsumption = energy.house_consumption.power || 0
      if (totalConsumption > 0) {
        // Distribute consumption across areas with realistic ratios
        energy.areas.kitchen.power = Math.round(totalConsumption * 0.15)
        energy.areas.living_room.power = Math.round(totalConsumption * 0.25)
        energy.areas.upstairs.power = Math.round(totalConsumption * 0.35)
        energy.areas.office.power = Math.round(totalConsumption * 0.25)
      }
    }

    res.json({
      success: true,
      data: energy,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Current Energy API Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// ---- small numeric helpers for the house widgets ----
const num = (v) => {
  if (v === null || v === undefined || v === '' || v === 'unknown' || v === 'unavailable') return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

// GET /api/ha/climate - living-room thermostat, shaped for the Nest-style dial
router.get('/climate', async (req, res) => {
  try {
    const entityId = process.env.HA_CLIMATE_ENTITY || 'climate.living_room_living_room'
    const s = await ha.getState(entityId)
    if (!s) return res.json({ success: true, data: { available: false } })
    const a = s.attributes || {}
    res.json({
      success: true,
      data: {
        available: true,
        entity_id: entityId,
        mode: s.state,                              // 'heat' | 'off' | ...
        action: a.hvac_action || null,             // 'heating' | 'idle' | 'off'
        current: num(a.current_temperature),
        target: num(a.temperature),
        humidity: num(a.current_humidity),
        min: num(a.min_temp) ?? 7,
        max: num(a.max_temp) ?? 35,
        step: num(a.target_temp_step) || 0.5,
        unit: a.unit_of_measurement || '°C',
        modes: a.hvac_modes || ['heat', 'off'],
        presets: a.preset_modes || null,
        preset: a.preset_mode || null,
        name: a.friendly_name || 'Thermostat',
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.json({ success: true, data: { available: false, error: error.message } })
  }
})

// GET /api/ha/energy-week - 7 days of grid usage vs solar export, HA-energy-page style.
// We only have a single net-metering clamp (Shelly EM ch1), so "production" here is
// the solar surplus actually returned to the grid (energy_returned), and "usage" is
// energy imported from the grid. Daily figures are per-local-day deltas of the
// cumulative kWh counters.
router.get('/energy-week', async (req, res) => {
  try {
    const importSensor = process.env.HA_GRID_IMPORT_SENSOR || 'sensor.shellyem_34945470ed50_channel_1_energy'
    const exportSensor = process.env.HA_GRID_EXPORT_SENSOR || 'sensor.shellyem_34945470ed50_channel_1_energy_returned'
    const powerSensor = process.env.HA_GRID_POWER_SENSOR || 'sensor.shellyem_34945470ed50_channel_1_power'
    const days = 7

    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - days)
    start.setHours(0, 0, 0, 0)

    const fetchHist = async (id) => {
      try {
        const r = await ha.client.get(`/history/period/${start.toISOString()}`, {
          params: { filter_entity_id: id, end_time: now.toISOString(), minimal_response: true },
        })
        return (r.data && r.data[0]) ? r.data[0] : []
      } catch { return [] }
    }

    const [imp, exp] = await Promise.all([fetchHist(importSensor), fetchHist(exportSensor)])

    const dayKey = (ts) => {
      const d = new Date(ts)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    // Cumulative counter -> per-day delta (max-min; guard against counter resets).
    const bucket = (points) => {
      const m = {}
      for (const p of points) {
        const v = num(p.state)
        if (v === null) continue
        const k = dayKey(p.last_changed || p.last_updated)
        const b = m[k] || (m[k] = { min: v, max: v })
        if (v < b.min) b.min = v
        if (v > b.max) b.max = v
      }
      const out = {}
      for (const k of Object.keys(m)) {
        const d = m[k].max - m[k].min
        out[k] = d > 0 ? d : 0
      }
      return out
    }

    const impDay = bucket(imp)
    const expDay = bucket(exp)

    const list = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      list.push({ date: k, usage: round2(impDay[k] || 0), production: round2(expDay[k] || 0) })
    }

    // Live grid power right now: +ve = importing, -ve = exporting (solar surplus).
    let live = null
    try {
      const ps = await ha.getState(powerSensor)
      const w = ps ? num(ps.state) : null
      if (w !== null) live = { watts: Math.round(w), flow: w >= 0 ? 'import' : 'export' }
    } catch { /* no live reading */ }

    const totals = list.reduce(
      (t, d) => ({ usage: t.usage + d.usage, production: t.production + d.production }),
      { usage: 0, production: 0 },
    )

    res.json({
      success: true,
      data: {
        days: list,
        totals: { usage: round2(totals.usage), production: round2(totals.production) },
        unit: 'kWh',
        live,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Energy Week API Error:', error)
    res.json({ success: true, data: null, error: error.message })
  }
})

// ==================== CAR (MG4 + Pod Point) ====================
// One payload for the Tide house > car tab: live car/charger state, real
// tariff costs and home electricity, all from HA. Parents only (it carries
// money and where the car is). Long-term numbers come from HA's recorder
// statistics over the websocket API, since REST has no statistics endpoint.

const CAR = 'mg_mg4_electric'
const CHARGER = 'psl_557234'
const SHELLY = 'shellyem_34945470ed50'
const S = {
  soc: `sensor.${CAR}_state_of_charge`,
  range: `sensor.${CAR}_electric_range`,
  status: `sensor.${CAR}_charging_status`,
  carPower: `sensor.${CAR}_charging_power`,
  remaining: `sensor.${CAR}_remaining_charging_time`,
  target: `number.${CAR}_target_soc`,
  where: `device_tracker.${CAR}_gps_location`,
  lock: `lock.${CAR}_lock`,
  amps: `select.${CAR}_charging_current_limit`,
  gun: `binary_sensor.${CAR}_charging_gun_state`,
  mileage: `sensor.${CAR}_mileage`,
  inside: `sensor.${CAR}_interior_temperature`,
  outside: `sensor.${CAR}_exterior_temperature`,
  aux: `sensor.${CAR}_ancillary_battery_voltage`,
  efficiency: `sensor.${CAR}_efficiency_since_last_charge`,
  updated: `sensor.${CAR}_last_update_time`,
  tyreFL: `sensor.${CAR}_tyre_pressure_front_left`,
  tyreFR: `sensor.${CAR}_tyre_pressure_front_right`,
  tyreRL: `sensor.${CAR}_tyre_pressure_rear_left`,
  tyreRR: `sensor.${CAR}_tyre_pressure_rear_right`,
  podStatus: `sensor.${CHARGER}_status`,
  podCable: `binary_sensor.${CHARGER}_cable_status`,
  podCloud: `binary_sensor.${CHARGER}_cloud_connection`,
  smart: `switch.${CHARGER}_smart_charge_mode`,
  chargerW: `sensor.${SHELLY}_channel_2_power`,
  houseW: `sensor.${SHELLY}_channel_1_power`,
  rate: 'sensor.ev_current_rate',
  costRate: 'sensor.ev_charging_cost_rate',
  sessionCost: 'sensor.ev_session_cost',
  sessionKwh: 'sensor.ev_session_energy',
  dayRate: 'input_number.ev_day_rate',
  nightRate: 'input_number.ev_night_rate',
}
const DOORS = ['door_front_left', 'door_front_right', 'door_rear_left', 'door_rear_right', 'boot_status', 'bonnet_status']
  .map((k) => `binary_sensor.${CAR}_${k}`)
const WINDOWS = ['window_front_left', 'window_front_right', 'window_rear_left', 'window_rear_right']
  .map((k) => `binary_sensor.${CAR}_${k}`)
const STAT = {
  cost: 'sensor.ev_charging_cost',
  car: `sensor.${SHELLY}_channel_2_energy`,
  house: `sensor.${SHELLY}_channel_1_energy`,
  exported: `sensor.${SHELLY}_channel_1_energy_returned`,
}

function haStats(statisticIds, start, period) {
  return new Promise((resolve, reject) => {
    const url = ha.baseURL.replace(/^http/, 'ws') + '/api/websocket'
    const ws = new WebSocket(url)
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('HA statistics timed out')) }, 8000)
    ws.on('error', (e) => { clearTimeout(timer); reject(e) })
    ws.on('message', (raw) => {
      const m = JSON.parse(raw)
      if (m.type === 'auth_required') ws.send(JSON.stringify({ type: 'auth', access_token: ha.token }))
      else if (m.type === 'auth_invalid') { clearTimeout(timer); ws.close(); reject(new Error('HA auth failed')) }
      else if (m.type === 'auth_ok') {
        ws.send(JSON.stringify({
          id: 1, type: 'recorder/statistics_during_period', start_time: start.toISOString(),
          period, types: ['change'], statistic_ids: statisticIds,
        }))
      } else if (m.id === 1) {
        clearTimeout(timer); ws.close()
        m.success ? resolve(m.result || {}) : reject(new Error(m.error?.message || 'statistics failed'))
      }
    })
  })
}

const londonDay = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Europe/London' })

let carCache = { at: 0, data: null }

router.get('/car', async (req, res) => {
  const me = list('users').find((u) => (req.isJarvis ? u.username === req.jarvisUser : u.id === req.userId))
  if (!(req.isJarvis && !req.jarvisUser) && me?.role !== 'parent') {
    return res.status(403).json({ success: false, error: 'parents only' })
  }
  if (carCache.data && Date.now() - carCache.at < 45000) return res.json({ success: true, data: carCache.data })

  try {
    const all = await ha.getStates()
    const byId = Object.fromEntries(all.map((e) => [e.entity_id, e]))
    const st = (id) => byId[id]?.state
    const n = (id) => num(st(id))

    const now = new Date()
    const dayStart = new Date(now); dayStart.setDate(now.getDate() - 34); dayStart.setHours(0, 0, 0, 0)
    const hourStart = new Date(now.getTime() - 24 * 3600 * 1000)
    const ids = Object.values(STAT)
    const [daily, hourly, socHist] = await Promise.all([
      haStats(ids, dayStart, 'day').catch(() => ({})),
      haStats(ids, hourStart, 'hour').catch(() => ({})),
      ha.client.get(`/history/period/${new Date(now.getTime() - 48 * 3600 * 1000).toISOString()}`, {
        params: { filter_entity_id: S.soc, end_time: now.toISOString(), minimal_response: true, no_attributes: true },
      }).then((r) => (r.data?.[0] || [])).catch(() => []),
    ])

    const series = (stats, key) => Object.fromEntries((stats[key] || []).map((r) => [r.start, Math.max(0, r.change || 0)]))
    const join = (stats) => {
      const cost = series(stats, STAT.cost), car = series(stats, STAT.car), house = series(stats, STAT.house), exp = series(stats, STAT.exported)
      const starts = [...new Set([...Object.keys(cost), ...Object.keys(car), ...Object.keys(house)])].map(Number).sort((a, b) => a - b)
      return starts.map((t) => ({ t, cost: round2(cost[t] || 0), car: round2(car[t] || 0), house: round2(house[t] || 0), exported: round2(exp[t] || 0) }))
    }
    const days = join(daily).map((d) => ({ ...d, date: londonDay(d.t) }))
    const hours = join(hourly).filter((h) => h.t >= hourStart.getTime() - 3600 * 1000)

    // Spend windows, London calendar.
    const today = londonDay(now.getTime())
    const shift = (k) => { const d = new Date(now); d.setDate(d.getDate() + k); return londonDay(d.getTime()) }
    const dow = (now.getDay() + 6) % 7 // Monday = 0
    const sumFrom = (from, to = today) => round2(days.filter((d) => d.date >= from && d.date <= to).reduce((a, d) => a + d.cost, 0))
    const spend = {
      today: sumFrom(today),
      yesterday: sumFrom(shift(-1), shift(-1)),
      week: sumFrom(shift(-dow)),
      month: sumFrom(today.slice(0, 8) + '01'),
    }
    const kwhMonth = round2(days.filter((d) => d.date >= today.slice(0, 8) + '01').reduce((a, d) => a + d.car, 0))

    const tyres = {}
    for (const k of ['FL', 'FR', 'RL', 'RR']) tyres[k] = n(S[`tyre${k}`])

    const data = {
      car: {
        soc: n(S.soc),
        rangeMiles: n(S.range) != null ? Math.round(n(S.range) * 0.621371) : null,
        status: st(S.status) || null,
        powerKw: n(S.carPower),
        remainingMin: n(S.remaining),
        target: n(S.target),
        home: st(S.where) === 'home',
        where: st(S.where) || null,
        locked: st(S.lock) === 'locked',
        amps: st(S.amps) || null,
        plugged: st(S.gun) === 'on',
        mileage: n(S.mileage) != null ? Math.round(n(S.mileage) * 0.621371) : null,
        insideC: n(S.inside),
        outsideC: n(S.outside),
        auxV: n(S.aux),
        // km/kWh from the car -> mi/kWh
        efficiency: n(S.efficiency) != null ? round2(n(S.efficiency) * 0.621371) : null,
        updated: st(S.updated) || null,
        tyres,
        tyreUnit: byId[S.tyreFL]?.attributes?.unit_of_measurement || 'bar',
        open: [...DOORS, ...WINDOWS].filter((id) => st(id) === 'on')
          .map((id) => id.replace(`binary_sensor.${CAR}_`, '').replace(/_status$/, '').replace(/_/g, ' ')),
      },
      charger: {
        status: st(S.podStatus) || null,
        cable: st(S.podCable) === 'on',
        online: st(S.podCloud) === 'on',
        smart: st(S.smart) === 'on',
        watts: n(S.chargerW),
        rate: n(S.rate),
        dayRate: n(S.dayRate),
        nightRate: n(S.nightRate),
        perHour: n(S.costRate),
        session: { cost: n(S.sessionCost), kwh: n(S.sessionKwh) },
      },
      house: { watts: n(S.houseW) },
      spend,
      kwhMonth,
      days: days.slice(-30),
      hours,
      soc: socHist.map((p) => ({ t: Date.parse(p.last_changed || p.last_updated), v: num(p.state) })).filter((p) => p.v != null),
      window: { start: '00:30', end: '05:30' },
    }
    carCache = { at: Date.now(), data }
    res.json({ success: true, data, timestamp: now.toISOString() })
  } catch (error) {
    console.error('Car API Error:', error)
    res.json({ success: true, data: null, error: error.message })
  }
})

// POST /api/ha/service - Call a Home Assistant service
router.post('/service', async (req, res) => {
  try {
    const { domain, service, entity_id, data = {} } = req.body

    if (!domain || !service) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: domain and service'
      })
    }

    // Build service data
    const serviceData = { ...data }
    if (entity_id) {
      serviceData.entity_id = entity_id
    }

    console.log(`🎬 Calling HA service: ${domain}.${service}`, serviceData)

    const result = await ha.callService(domain, service, serviceData)

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Service API Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

export { router as homeAssistantRoutes }