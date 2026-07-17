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

// GET /api/system/overview - at-a-glance host + media-drive stats for the System tab
// host  : CPU%, load, RAM, CPU temp, uptime — from the Proxmox host via a
//         read-only forced-command SSH key (see .env HOST_STATS_*).
// media : the movie/TV drive free/total — from Radarr's diskspace API (/media mount).
router.get('/overview', async (req, res) => {
  const out = { host: null, media: null }

  // --- host stats over the locked-down SSH channel ---
  const target = process.env.HOST_STATS_SSH || 'root@192.168.1.2'
  const key = process.env.HOST_STATS_KEY || '/opt/mission-control/.ssh/hoststats'
  const kh = process.env.HOST_STATS_KNOWN_HOSTS || '/opt/mission-control/.ssh/known_hosts'
  try {
    const cmd = `ssh -i ${key} -o UserKnownHostsFile=${kh} -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=6 ${target} stats`
    const { stdout } = await execAsync(cmd, { timeout: 9000 })
    out.host = JSON.parse(stdout.trim())
  } catch (error) {
    out.host = { error: 'host unreachable' }
  }

  // --- media drive via Radarr (falls back to Sonarr); both mount the same /media ---
  const radarr = process.env.RADARR_URL || 'http://192.168.1.9:7878'
  const sonarr = process.env.SONARR_URL || 'http://192.168.1.8:8989'
  const sources = [
    { url: `${radarr}/api/v3/diskspace`, key: process.env.RADARR_API_KEY },
    { url: `${sonarr}/api/v3/diskspace`, key: process.env.SONARR_API_KEY },
  ]
  for (const s of sources) {
    if (!s.key) continue
    try {
      const { data } = await axios.get(s.url, { timeout: 6000, headers: { 'X-Api-Key': s.key } })
      const drive = (data || []).find((d) => d.path === '/media') || (data || []).sort((a, b) => b.totalSpace - a.totalSpace)[0]
      if (drive) {
        out.media = { path: drive.path, total: drive.totalSpace, free: drive.freeSpace, used: drive.totalSpace - drive.freeSpace }
        break
      }
    } catch { /* try next source */ }
  }

  res.json({ success: true, data: out, timestamp: new Date().toISOString() })
})

// ---- tiny in-memory cache so we don't hammer Plausible/GlitchTip on every tab open ----
const _cache = new Map()
async function cached(key, ttlMs, fn) {
  const hit = _cache.get(key)
  const now = Date.now()
  if (hit && now - hit.at < ttlMs) return hit.val
  const val = await fn()
  _cache.set(key, { at: now, val })
  return val
}

// Current date in Europe/London (site timezone), shifted by offsetDays, as YYYY-MM-DD.
// We anchor to London ourselves rather than trusting Plausible's relative periods:
// on this instance `period=7d` lags ~2 days and returns all-zeros, hiding recent hits.
function londonDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const y = +parts.find((p) => p.type === 'year').value
  const m = +parts.find((p) => p.type === 'month').value
  const d = +parts.find((p) => p.type === 'day').value
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + offsetDays)
  return dt.toISOString().slice(0, 10)
}

// GET /api/system/analytics - Plausible weekly usage for the Tethered app.
// Returns { days: [{date, visitors}], total, last24h } — daily unique visitors over the
// last 7 days (including today) plus unique visitors across the last ~24h.
// Config: PLAUSIBLE_URL, PLAUSIBLE_SITE_ID, PLAUSIBLE_API_KEY.
router.get('/analytics', async (req, res) => {
  const base = process.env.PLAUSIBLE_URL || 'http://192.168.1.15:8000'
  const site = process.env.PLAUSIBLE_SITE_ID || 'tethered.me.uk'
  const token = process.env.PLAUSIBLE_API_KEY
  if (!token) return res.json({ success: false, error: 'not configured', data: null })
  try {
    const data = await cached('plausible:7d', 5 * 60 * 1000, async () => {
      const headers = { Authorization: `Bearer ${token}` }
      const end = londonDate(0)
      const start = londonDate(-6)
      const { data: ts } = await axios.get(`${base}/api/v1/stats/timeseries`, {
        timeout: 8000, headers,
        params: { site_id: site, period: 'custom', date: `${start},${end}`, metrics: 'visitors' },
      })
      const days = (ts.results || []).map((r) => ({ date: r.date, visitors: r.visitors || 0 }))
      const total = days.reduce((n, d) => n + d.visitors, 0)
      // Rolling last-24h unique visitors (yesterday + today, deduplicated by Plausible).
      let last24h = null
      try {
        const { data: agg } = await axios.get(`${base}/api/v1/stats/aggregate`, {
          timeout: 8000, headers,
          params: { site_id: site, period: 'custom', date: `${londonDate(-1)},${end}`, metrics: 'visitors' },
        })
        last24h = agg?.results?.visitors?.value ?? null
      } catch { /* leave last24h null on failure */ }
      return { site, days, total, last24h }
    })
    res.json({ success: true, data })
  } catch (error) {
    res.json({ success: false, error: error.message, data: null })
  }
})

// GET /api/system/errors - GlitchTip open-error summary for the Tethered app.
// Returns { openIssues, events, lastSeen } from the Sentry-compatible API.
// Config: GLITCHTIP_URL, GLITCHTIP_ORG, GLITCHTIP_TOKEN.
router.get('/errors', async (req, res) => {
  const base = process.env.GLITCHTIP_URL || 'http://192.168.1.62:8000'
  const org = process.env.GLITCHTIP_ORG || 'tethered'
  const token = process.env.GLITCHTIP_TOKEN
  if (!token) return res.json({ success: false, error: 'not configured', data: null })
  try {
    const data = await cached('glitchtip:issues', 5 * 60 * 1000, async () => {
      const { data: issues } = await axios.get(`${base}/api/0/organizations/${org}/issues/`, {
        timeout: 8000,
        headers: { Authorization: `Bearer ${token}` },
        params: { query: 'is:unresolved', limit: 100 },
      })
      const list = Array.isArray(issues) ? issues : []
      const events = list.reduce((n, i) => n + (parseInt(i.count, 10) || 0), 0)
      const lastSeen = list.map((i) => i.lastSeen).filter(Boolean).sort().pop() || null
      return { openIssues: list.length, events, lastSeen }
    })
    res.json({ success: true, data })
  } catch (error) {
    res.json({ success: false, error: error.message, data: null })
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