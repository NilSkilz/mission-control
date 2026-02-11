import express from 'express'
import axios from 'axios'

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

// GET /api/ha/tesla - Timmy status (charge, sentry, etc.)
router.get('/tesla', async (req, res) => {
  try {
    const teslaEntities = [
      'switch.timmy_charger',
      'switch.timmy_sentry_mode', 
      'switch.timmy_valet_mode',
      'button.timmy_horn',
      'button.timmy_flash_lights',
      'climate.timmy_hvac_climate_system'
    ]
    
    const teslaStates = await Promise.allSettled(
      teslaEntities.map(entityId => ha.getState(entityId))
    )
    
    const tesla = {
      vehicle_name: 'Timmy',
      charging: null,
      sentry_mode: null,
      valet_mode: null,
      climate: null,
      available: false,
      timestamp: new Date().toISOString()
    }
    
    teslaStates.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const state = result.value
        const entityId = teslaEntities[index]
        tesla.available = true
        
        switch (entityId) {
          case 'switch.timmy_charger':
            tesla.charging = {
              is_charging: state.state === 'on',
              friendly_name: state.attributes.friendly_name,
              last_changed: state.last_changed
            }
            break
            
          case 'switch.timmy_sentry_mode':
            tesla.sentry_mode = {
              enabled: state.state === 'on',
              friendly_name: state.attributes.friendly_name,
              last_changed: state.last_changed
            }
            break
            
          case 'switch.timmy_valet_mode':
            tesla.valet_mode = {
              enabled: state.state === 'on',
              friendly_name: state.attributes.friendly_name,
              last_changed: state.last_changed
            }
            break
            
          case 'climate.timmy_hvac_climate_system':
            tesla.climate = {
              current_temperature: parseFloat(state.attributes.current_temperature) || null,
              target_temperature: parseFloat(state.attributes.temperature) || null,
              hvac_mode: state.state,
              hvac_action: state.attributes.hvac_action || null,
              unit: state.attributes.unit_of_measurement || '°C',
              friendly_name: state.attributes.friendly_name
            }
            break
        }
      }
    })
    
    res.json({
      success: true,
      data: tesla,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Tesla API Error:', error)
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

export { router as homeAssistantRoutes }