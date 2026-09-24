// Jarvis ops feed: the jarvis LXC pushes a status snapshot (cron jobs, Claude
// usage, host vitals) every few minutes; parents read it back on the /ops page.
// Mounted UNGUARDED at /api/jarvis (before the global bearer guard) because the
// pusher is a cron job, not a logged-in person: POST authenticates with the
// shared JARVIS_STATUS_KEY, GET requires a parent's bearer token.
import express from 'express'
import fs from 'fs'
import path from 'path'
import { timingSafeEqual } from 'crypto'
import { fileURLToPath } from 'url'
import { get } from '../lib/familyDb.js'
import { verifyToken } from '../lib/auth.js'

const router = express.Router()

const STATUS_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'jarvis-status.json'
)

function keyMatches(sent) {
  const expected = process.env.JARVIS_STATUS_KEY
  if (!expected || !sent) return false
  const a = Buffer.from(String(sent))
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function requireParent(req, res) {
  const header = req.headers.authorization || ''
  const payload = verifyToken(header.startsWith('Bearer ') ? header.slice(7) : null)
  const me = payload ? get('users', payload.uid) : null
  if (!me) { res.status(401).json({ error: 'not authenticated' }); return null }
  if (me.role !== 'parent') { res.status(403).json({ error: 'parents only' }); return null }
  return me
}

// POST /api/jarvis/status  (x-jarvis-key) — store the latest snapshot verbatim.
router.post('/status', (req, res) => {
  if (!process.env.JARVIS_STATUS_KEY) return res.status(503).json({ error: 'JARVIS_STATUS_KEY not configured' })
  if (!keyMatches(req.headers['x-jarvis-key'])) return res.status(401).json({ error: 'bad key' })
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'JSON body required' })
  const record = { receivedAt: new Date().toISOString(), status: req.body }
  fs.mkdirSync(path.dirname(STATUS_PATH), { recursive: true })
  fs.writeFileSync(STATUS_PATH, JSON.stringify(record))
  res.json({ ok: true })
})

// GET /api/jarvis/status  (parent bearer token) — the latest snapshot, or 404.
router.get('/status', (req, res) => {
  if (!requireParent(req, res)) return
  let record
  try {
    record = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'))
  } catch {
    return res.status(404).json({ error: 'no snapshot yet' })
  }
  res.json(record)
})

export default router
