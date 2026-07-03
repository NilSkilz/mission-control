import express from 'express'
import axios from 'axios'
import NodeCache from 'node-cache'

const router = express.Router()
const cache = new NodeCache({ stdTTL: 30 })

const PLEX_URL = process.env.PLEX_URL || 'http://192.168.1.3:32400'
const SONARR_URL = process.env.SONARR_URL || 'http://192.168.1.8:8989'
const RADARR_URL = process.env.RADARR_URL || 'http://192.168.1.9:7878'
const SABNZBD_URL = process.env.SABNZBD_URL || 'http://192.168.1.7:7777'

const TIMEOUT = 5000

async function fetchPlex() {
  const { data } = await axios.get(`${PLEX_URL}/status/sessions`, {
    timeout: TIMEOUT,
    headers: { 'X-Plex-Token': process.env.PLEX_TOKEN, Accept: 'application/json' }
  })
  const sessions = (data.MediaContainer?.Metadata || []).map(m => ({
    title: m.grandparentTitle ? `${m.grandparentTitle} - ${m.title}` : m.title,
    user: m.User?.title || 'unknown',
    player: m.Player?.product || '',
    state: m.Player?.state || 'unknown'
  }))
  return { online: true, streams: sessions.length, sessions }
}

async function fetchSonarr() {
  const headers = { 'X-Api-Key': process.env.SONARR_API_KEY }
  const now = new Date()
  const weekOut = new Date(now.getTime() + 7 * 86400_000)
  const [queue, calendar] = await Promise.all([
    axios.get(`${SONARR_URL}/api/v3/queue?pageSize=1`, { headers, timeout: TIMEOUT }),
    axios.get(`${SONARR_URL}/api/v3/calendar`, {
      headers, timeout: TIMEOUT,
      params: { start: now.toISOString(), end: weekOut.toISOString(), includeSeries: true }
    })
  ])
  const next = calendar.data
    .filter(e => !e.hasFile && new Date(e.airDateUtc) > now)
    .sort((a, b) => new Date(a.airDateUtc) - new Date(b.airDateUtc))[0]
  return {
    online: true,
    queue: queue.data.totalRecords ?? 0,
    upcoming: calendar.data.length,
    next: next ? {
      series: next.series?.title || '',
      episode: `S${String(next.seasonNumber).padStart(2, '0')}E${String(next.episodeNumber).padStart(2, '0')}`,
      airDate: next.airDateUtc
    } : null
  }
}

async function fetchRadarr() {
  const headers = { 'X-Api-Key': process.env.RADARR_API_KEY }
  const now = new Date()
  const monthOut = new Date(now.getTime() + 30 * 86400_000)
  const [queue, calendar] = await Promise.all([
    axios.get(`${RADARR_URL}/api/v3/queue?pageSize=1`, { headers, timeout: TIMEOUT }),
    axios.get(`${RADARR_URL}/api/v3/calendar`, {
      headers, timeout: TIMEOUT,
      params: { start: now.toISOString(), end: monthOut.toISOString() }
    })
  ])
  const next = calendar.data
    .filter(m => !m.hasFile)
    .sort((a, b) => new Date(a.digitalRelease || a.physicalRelease || a.inCinemas || 0) -
                    new Date(b.digitalRelease || b.physicalRelease || b.inCinemas || 0))[0]
  return {
    online: true,
    queue: queue.data.totalRecords ?? 0,
    upcoming: calendar.data.length,
    next: next ? { title: next.title, release: next.digitalRelease || next.physicalRelease || next.inCinemas } : null
  }
}

async function fetchSabnzbd() {
  const { data } = await axios.get(`${SABNZBD_URL}/api`, {
    timeout: TIMEOUT,
    params: { mode: 'queue', output: 'json', apikey: process.env.SABNZBD_API_KEY }
  })
  const q = data.queue || {}
  return {
    online: true,
    paused: q.paused === true,
    speedKBps: parseFloat(q.kbpersec || '0'),
    remainingMB: parseFloat(q.mbleft || '0'),
    slots: parseInt(q.noofslots ?? 0, 10),
    timeLeft: q.timeleft || null
  }
}

// GET /api/media/summary - all four services, fetched in parallel, 30s cache
router.get('/summary', async (req, res) => {
  const cached = cache.get('summary')
  if (cached) return res.json(cached)

  const fetchers = { plex: fetchPlex, sonarr: fetchSonarr, radarr: fetchRadarr, sabnzbd: fetchSabnzbd }
  const result = {}
  await Promise.all(Object.entries(fetchers).map(async ([key, fn]) => {
    try {
      result[key] = await fn()
    } catch (e) {
      result[key] = { online: false, error: e.code === 'ECONNREFUSED' ? 'Connection refused' : e.message }
    }
  }))

  const payload = { success: true, data: result, fetchedAt: new Date().toISOString() }
  cache.set('summary', payload)
  res.json(payload)
})

export default router
