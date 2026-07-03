import express from 'express'
import axios from 'axios'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'

const execAsync = promisify(exec)
const router = express.Router()

// GET /api/system/status - Status of non-HA services
router.get('/status', async (req, res) => {
  try {
    // Post-Proxmox-rebuild layout (July 2026): each service is its own LXC
    const HOSTS = {
      plex: process.env.PLEX_URL || 'http://192.168.1.3:32400',
      radarr: process.env.RADARR_URL || 'http://192.168.1.9:7878',
      sonarr: process.env.SONARR_URL || 'http://192.168.1.8:8989',
      overseerr: process.env.OVERSEERR_URL || 'http://192.168.1.12:5055',
      mission_control: process.env.MISSION_CONTROL_URL || 'http://localhost:3001',
      haven: process.env.HAVEN_URL || 'http://localhost:3004'
    }

    const services = {
      plex: { name: 'Plex Media Server', url: HOSTS.plex, status: 'unknown' },
      radarr: { name: 'Radarr', url: HOSTS.radarr, status: 'unknown' },
      sonarr: { name: 'Sonarr', url: HOSTS.sonarr, status: 'unknown' },
      overseerr: { name: 'Overseerr', url: HOSTS.overseerr, status: 'unknown' },
      mission_control: { name: 'Mission Control', url: `${HOSTS.mission_control}/health`, status: 'unknown' },
      haven: { name: 'Haven', url: `${HOSTS.haven}/health`, status: 'unknown' }
    }

    // Check HTTP services (internal IP for reliability)
    const httpChecks = [
      { key: 'plex', url: `${HOSTS.plex}/web/index.html` },
      { key: 'radarr', url: `${HOSTS.radarr}/api/v3/system/status`, headers: { 'X-Api-Key': process.env.RADARR_API_KEY } },
      { key: 'sonarr', url: `${HOSTS.sonarr}/api/v3/system/status`, headers: { 'X-Api-Key': process.env.SONARR_API_KEY } },
      { key: 'overseerr', url: `${HOSTS.overseerr}/api/v1/status` },
      { key: 'mission_control', url: `${HOSTS.mission_control}/health` },
      { key: 'haven', url: `${HOSTS.haven}/health` }
    ]

    // Perform HTTP health checks
    const httpPromises = httpChecks.map(async ({ key, url, headers }) => {
      try {
        const response = await axios.get(url, { 
          timeout: 5000, 
          headers: headers || {},
          validateStatus: (status) => status < 500 // Accept 2xx, 3xx, 4xx as "up"
        })
        services[key].status = 'online'
        services[key].response_time = Date.now()
      } catch (error) {
        services[key].status = 'offline'
        services[key].error = error.code === 'ECONNREFUSED' ? 'Connection refused' : error.message
      }
    })

    await Promise.allSettled(httpPromises)

    // Calculate summary
    const summary = {
      total: Object.keys(services).length,
      online: Object.values(services).filter(s => s.status === 'online').length,
      offline: Object.values(services).filter(s => s.status === 'offline').length,
      unknown: Object.values(services).filter(s => s.status === 'unknown').length
    }

    res.json({
      success: true,
      data: { services, summary },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('System Status Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/system/server - Local server stats
router.get('/server', async (req, res) => {
  try {
    const stats = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      load_average: os.loadavg(),
      cpu_count: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usage_percent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      }
    }

    // Get disk usage
    try {
      const { stdout } = await execAsync('df -h / | tail -1')
      const diskInfo = stdout.trim().split(/\s+/)
      stats.disk = {
        filesystem: diskInfo[0],
        size: diskInfo[1],
        used: diskInfo[2],
        available: diskInfo[3],
        usage_percent: parseInt(diskInfo[4])
      }
    } catch (error) {
      stats.disk = { error: 'Could not retrieve disk info' }
    }

    // Get CPU usage (basic)
    const cpus = os.cpus()
    stats.cpu = {
      model: cpus[0].model,
      cores: cpus.length,
      speeds: cpus.map(cpu => cpu.speed)
    }

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Server Stats Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Notification system
const NOTIFICATIONS_FILE = './db/notifications.json'

// Ensure notifications file exists
async function ensureNotificationsFile() {
  try {
    await fs.access(NOTIFICATIONS_FILE)
  } catch {
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify([], null, 2))
  }
}

// GET /api/notifications - Get all notifications
router.get('/notifications', async (req, res) => {
  try {
    await ensureNotificationsFile()
    const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf8')
    const notifications = JSON.parse(data)
    
    // Filter out old notifications (older than 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const activeNotifications = notifications.filter(n => 
      new Date(n.timestamp) > thirtyDaysAgo && !n.dismissed
    )

    res.json({
      success: true,
      data: activeNotifications,
      count: activeNotifications.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Get Notifications Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// POST /api/notifications - Create new notification
router.post('/notifications', async (req, res) => {
  try {
    const { title, message, type = 'info', source = 'manual' } = req.body

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      })
    }

    await ensureNotificationsFile()
    const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf8')
    const notifications = JSON.parse(data)

    const newNotification = {
      id: Date.now().toString(),
      title,
      message,
      type, // 'info', 'warning', 'alert', 'success'
      source,
      timestamp: new Date().toISOString(),
      read: false,
      dismissed: false
    }

    notifications.unshift(newNotification)

    // Keep only last 100 notifications
    if (notifications.length > 100) {
      notifications.splice(100)
    }

    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2))

    res.json({
      success: true,
      data: newNotification,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Create Notification Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// PATCH /api/notifications/:id - Mark as read/dismissed
router.patch('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { read, dismissed } = req.body

    await ensureNotificationsFile()
    const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf8')
    const notifications = JSON.parse(data)

    const notification = notifications.find(n => n.id === id)
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      })
    }

    if (typeof read === 'boolean') notification.read = read
    if (typeof dismissed === 'boolean') notification.dismissed = dismissed

    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2))

    res.json({
      success: true,
      data: notification,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Update Notification Error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

export { router as systemRoutes }