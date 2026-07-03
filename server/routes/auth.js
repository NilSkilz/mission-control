// Auth endpoints (mounted UNGUARDED at /api/auth): login issues a signed token.
import express from 'express'
import db, { get, create, remove } from '../lib/familyDb.js'
import { verifyPassword, hashPassword, signToken, verifyToken } from '../lib/auth.js'

const router = express.Router()

function publicUser(row) {
  if (!row) return null
  const { passwordHash, ...rest } = row
  return rest
}

// Resolve the authenticated caller from the bearer token (these routes are
// mounted before the global guard, so we check here). Returns the user or null.
function caller(req) {
  const header = req.headers.authorization || ''
  const payload = verifyToken(header.startsWith('Bearer ') ? header.slice(7) : null)
  return payload ? get('users', payload.uid) : null
}
function requireParent(req, res) {
  const me = caller(req)
  if (!me) { res.status(401).json({ error: 'not authenticated' }); return null }
  if (me.role !== 'parent') { res.status(403).json({ error: 'parents only' }); return null }
  return me
}

// GET /api/auth/users -> minimal public profiles for the login picker (no secrets)
router.get('/users', (req, res) => {
  const rows = db.prepare('SELECT id, username, displayName, role, avatar, color FROM users ORDER BY createdAt').all()
  res.json(rows)
})

// POST /api/auth/login { username, password } -> { token, user }
router.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'username and password required' })
  const row = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(username)
  if (!row || !verifyPassword(password, row.passwordHash)) {
    return res.status(401).json({ error: 'wrong username or password' })
  }
  res.json({ token: signToken(row.id), user: publicUser(row) })
})

// GET /api/auth/me  (Bearer token) -> the current user, or 401
router.get('/me', (req, res) => {
  const header = req.headers.authorization || ''
  const payload = verifyToken(header.startsWith('Bearer ') ? header.slice(7) : null)
  if (!payload) return res.status(401).json({ error: 'not authenticated' })
  const user = get('users', payload.uid)
  if (!user) return res.status(401).json({ error: 'unknown user' })
  res.json({ user })
})

// POST /api/auth/change-password { userId, currentPassword, newPassword }
// (mounted unguarded, but requires the current password to change it)
router.post('/change-password', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body || {}
  if (!userId || !newPassword) return res.status(400).json({ error: 'userId and newPassword required' })
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!row || !verifyPassword(currentPassword, row.passwordHash)) {
    return res.status(401).json({ error: 'current password is wrong' })
  }
  db.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?')
    .run(hashPassword(newPassword), new Date().toISOString(), userId)
  res.json({ ok: true })
})

// ---- Parent-only people management ----

// POST /api/auth/reset-password { userId, newPassword } — a parent sets someone's
// password without needing the old one.
router.post('/reset-password', (req, res) => {
  if (!requireParent(req, res)) return
  const { userId, newPassword } = req.body || {}
  if (!userId || !newPassword) return res.status(400).json({ error: 'userId and newPassword required' })
  const target = get('users', userId)
  if (!target) return res.status(404).json({ error: 'no such person' })
  db.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?')
    .run(hashPassword(newPassword), new Date().toISOString(), userId)
  res.json({ ok: true })
})

// POST /api/auth/people { username, displayName, role, password, color } — add a person.
router.post('/people', (req, res) => {
  if (!requireParent(req, res)) return
  const { username, displayName, role = 'child', password, color, avatar } = req.body || {}
  if (!username || !displayName || !password) return res.status(400).json({ error: 'username, displayName and password required' })
  if (db.prepare('SELECT 1 FROM users WHERE lower(username) = lower(?)').get(username)) {
    return res.status(409).json({ error: 'that username is taken' })
  }
  const row = create('users', {
    username: username.toLowerCase(), displayName,
    role: role === 'parent' ? 'parent' : 'child',
    color: color || '#99A0A8', avatar: avatar || '🙂',
    passwordHash: hashPassword(password),
  })
  res.status(201).json(publicUser(row))
})

// DELETE /api/auth/people/:id — remove a person (not yourself).
router.delete('/people/:id', (req, res) => {
  const me = requireParent(req, res)
  if (!me) return
  if (me.id === req.params.id) return res.status(400).json({ error: "you can't remove yourself" })
  if (!get('users', req.params.id)) return res.status(404).json({ error: 'no such person' })
  remove('users', req.params.id)
  res.json({ ok: true })
})

export default router
