import express from 'express'
import axios from 'axios'
import https from 'https'

const router = express.Router()

// Ubiquiti Dream Machine API client
class UbiquitiClient {
  constructor() {
    this.baseURL = 'https://192.168.1.1'
    this.apiKey = process.env.UBIQUITI_API_KEY || 'U2lKqkabMmCavoYXZvqTsB1nc42-UKll'
    
    // Create axios instance that ignores SSL cert issues (common with UDM)
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    })
    
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌐 UDM API: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('UDM Request Error:', error)
        return Promise.reject(error)
      }
    )
    
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Dream Machine is offline or unreachable')
        }
        if (error.response?.status === 401) {
          throw new Error('Dream Machine authentication failed - check API key')
        }
        if (error.response?.status === 404) {
          throw new Error('Dream Machine endpoint not found')
        }
        throw new Error(error.response?.data?.message || error.message || 'Dream Machine API error')
      }
    )
  }
  
  async getSystemInfo() {
    const response = await this.client.get('/proxy/network/api/s/default/stat/sysinfo')
    return response.data
  }
  
  async getClients() {
    const response = await this.client.get('/proxy/network/api/s/default/stat/sta')
    return response.data
  }
  
  async getNetworkStats() {
    const response = await this.client.get('/proxy/network/api/s/default/stat/health')
    return response.data
  }
  
  async getWANStatus() {
    const response = await this.client.get('/proxy/network/api/s/default/rest/networkconf')
    return response.data
  }
}

// GET /api/network/stats - Network statistics from Dream Machine
router.get('/stats', async (req, res) => {
  try {
    const udm = new UbiquitiClient()
    
    const [systemInfo, clients, networkStats, wanStatus] = await Promise.allSettled([
      udm.getSystemInfo(),
      udm.getClients(),
      udm.getNetworkStats(),
      udm.getWANStatus()
    ])
    
    const stats = {
      system: null,
      clients: [],
      network_health: null,
      wan: null,
      summary: {
        total_clients: 0,
        online_clients: 0,
        wan_up: false,
        uptime: null
      },
      timestamp: new Date().toISOString()
    }
    
    // Process system info
    if (systemInfo.status === 'fulfilled' && systemInfo.value?.data) {
      const sysData = systemInfo.value.data[0]
      stats.system = {
        hostname: sysData.hostname,
        version: sysData.version,
        uptime: sysData.uptime,
        model: sysData.model,
        serial: sysData.serial_no,
        ip_address: sysData.ip,
        load_average: sysData.loadavg_5
      }
      stats.summary.uptime = sysData.uptime
    }
    
    // Process clients
    if (clients.status === 'fulfilled' && clients.value?.data) {
      stats.clients = clients.value.data.map(client => ({
        mac: client.mac,
        hostname: client.hostname || client.name || 'Unknown',
        ip: client.ip,
        is_online: !client.is_guest && client.last_seen > (Date.now() - 300000), // 5 min threshold
        last_seen: new Date(client.last_seen * 1000).toISOString(),
        rx_bytes: client.rx_bytes || 0,
        tx_bytes: client.tx_bytes || 0,
        signal: client.signal || null,
        network: client.network || null
      }))
      
      stats.summary.total_clients = stats.clients.length
      stats.summary.online_clients = stats.clients.filter(c => c.is_online).length
    }
    
    // Process network health
    if (networkStats.status === 'fulfilled' && networkStats.value?.data) {
      const healthData = networkStats.value.data
      const wanHealth = healthData.find(h => h.subsystem === 'wan')
      
      if (wanHealth) {
        stats.network_health = {
          wan_up: wanHealth.status === 'ok',
          latency: wanHealth.latency || null,
          uptime: wanHealth.uptime || null,
          drops: wanHealth.drops || 0
        }
        stats.summary.wan_up = wanHealth.status === 'ok'
      }
    }
    
    // Process WAN status (additional info)
    if (wanStatus.status === 'fulfilled' && wanStatus.value?.data) {
      const wanData = wanStatus.value.data.find(net => net.purpose === 'wan')
      if (wanData) {
        stats.wan = {
          name: wanData.name,
          enabled: wanData.enabled,
          wan_type: wanData.wan_type,
          wan_ip: wanData.wan_ip,
          wan_gateway: wanData.wan_gateway,
          wan_dns1: wanData.wan_dns1,
          wan_dns2: wanData.wan_dns2
        }
      }
    }
    
    // Collect any errors
    const errors = []
    if (systemInfo.status === 'rejected') errors.push('System info: ' + systemInfo.reason.message)
    if (clients.status === 'rejected') errors.push('Clients: ' + clients.reason.message)
    if (networkStats.status === 'rejected') errors.push('Network stats: ' + networkStats.reason.message)
    if (wanStatus.status === 'rejected') errors.push('WAN status: ' + wanStatus.reason.message)
    
    res.json({
      success: true,
      data: stats,
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Network Stats Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      available: false,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/network/clients - Just client information
router.get('/clients', async (req, res) => {
  try {
    const udm = new UbiquitiClient()
    const response = await udm.getClients()
    
    const clients = response.data.map(client => ({
      mac: client.mac,
      hostname: client.hostname || client.name || 'Unknown Device',
      ip: client.ip,
      is_online: !client.is_guest && client.last_seen > (Date.now() - 300000),
      last_seen: new Date(client.last_seen * 1000).toISOString(),
      rx_bytes: client.rx_bytes || 0,
      tx_bytes: client.tx_bytes || 0,
      rx_rate: client.rx_rate || 0,
      tx_rate: client.tx_rate || 0,
      signal: client.signal || null,
      network: client.network || null,
      is_wired: client.is_wired || false,
      device_type: client.oui || 'Unknown'
    }))
    
    // Sort by online status, then by hostname
    clients.sort((a, b) => {
      if (a.is_online !== b.is_online) return b.is_online - a.is_online
      return a.hostname.localeCompare(b.hostname)
    })
    
    res.json({
      success: true,
      data: {
        clients,
        summary: {
          total: clients.length,
          online: clients.filter(c => c.is_online).length,
          offline: clients.filter(c => !c.is_online).length
        }
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Network Clients Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

export { router as networkRoutes }