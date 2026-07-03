// Real server-side auth for the family app: scrypt-hashed passwords + a signed
// bearer token. Replaces the old client-side hardcoded password map, so the
// Express API is no longer wide open and the NPM basic-auth wall can come off.
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ---- server secret (for signing tokens) ----
// Prefer AUTH_SECRET from env; otherwise generate once and persist so tokens
// survive restarts.
function loadSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db')
  const file = path.join(dir, '.auth_secret')
  try {
    return fs.readFileSync(file, 'utf8').trim()
  } catch {
    fs.mkdirSync(dir, { recursive: true })
    const secret = crypto.randomBytes(48).toString('hex')
    fs.writeFileSync(file, secret, { mode: 0o600 })
    return secret
  }
}
const SECRET = loadSecret()
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

// ---- password hashing (scrypt) ----
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false
  const [, salt, hash] = stored.split('$')
  const test = crypto.scryptSync(password, salt, 64)
  const known = Buffer.from(hash, 'hex')
  return known.length === test.length && crypto.timingSafeEqual(known, test)
}

// ---- signed tokens ----
const b64url = (buf) => Buffer.from(buf).toString('base64url')

export function signToken(userId) {
  const payload = b64url(JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_TTL_MS }))
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (!data.exp || data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

// ---- express guard ----
// Protects everything it is mounted on, except the Plex art proxy (loaded via
// <img> tags that can't carry an Authorization header, and it only serves
// artwork for a valid Plex path).
export function authGuard(req, res, next) {
  if (req.method === 'OPTIONS') return next()
  if (req.originalUrl.startsWith('/api/media/cinema/image')) return next()
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const payload = verifyToken(token)
  if (!payload) return res.status(401).json({ error: 'authentication required' })
  req.userId = payload.uid
  next()
}
