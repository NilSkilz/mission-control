// Auth endpoints (mounted UNGUARDED at /api/auth): login issues a signed token.
import express from 'express'
import db, { get } from '../lib/familyDb.js'
import { verifyPassword, hashPassword, signToken, verifyToken } from '../lib/auth.js'

const router = express.Router()

function publicUser(row) {
  if (!row) return null
  const { passwordHash, ...rest } = row
  return rest
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

export default router
