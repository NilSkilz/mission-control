// System page backend: the family's hosted services + a live up/down check.
// TCP-connect probe (not HTTP) so a service behind auth/redirect/self-signed TLS
// still reads as "up" when its port is open.
import express from 'express'
import net from 'node:net'

const router = express.Router()

// host/port are LAN (for the probe); url is where the browser actually goes.
const SERVICES = [
  { key: 'vault', name: 'Vaultwarden', emoji: '🔐', desc: 'Family password vault', url: 'https://vault.cracky.co.uk', host: '192.168.1.17', port: 8080 },
  { key: 'plex', name: 'Plex', emoji: '🎬', desc: 'Films & TV', url: 'https://plex.cracky.co.uk', host: '192.168.1.3', port: 32400 },
  { key: 'seerr', name: 'Requests', emoji: '🍿', desc: 'Ask for new films/shows (Seerr)', url: 'https://seerr.cracky.co.uk', host: '192.168.1.12', port: 5055 },
  { key: 'ha', name: 'Home Assistant', emoji: '🏠', desc: 'Whole-house automation', url: 'https://ha.cracky.co.uk', host: '192.168.1.4', port: 8123 },
  { key: 'sonarr', name: 'Sonarr', emoji: '📺', desc: 'TV library', url: 'https://sonarr.cracky.co.uk', host: '192.168.1.8', port: 8989 },
  { key: 'radarr', name: 'Radarr', emoji: '🎞️', desc: 'Film library', url: 'https://radarr.cracky.co.uk', host: '192.168.1.9', port: 7878 },
  { key: 'prowlarr', name: 'Prowlarr', emoji: '🔎', desc: 'Indexer manager', url: 'https://prowlarr.cracky.co.uk', host: '192.168.1.5', port: 9696 },
  { key: 'sab', name: 'SABnzbd', emoji: '⬇️', desc: 'Usenet downloader', url: 'https://nzb.cracky.co.uk', host: '192.168.1.7', port: 7777 },
  { key: 'plausible', name: 'Plausible', emoji: '📈', desc: 'Site analytics', url: 'https://plausible.cracky.co.uk', host: '192.168.1.15', port: 8000 },
  // LAN-only (no public subdomain) — links go to the LAN address
  { key: 'proxmox', name: 'Proxmox', emoji: '🧰', desc: 'Hypervisor / all the VMs', url: 'https://192.168.1.2:8006', host: '192.168.1.2', port: 8006, lan: true },
  { key: 'npm', name: 'Nginx Proxy Manager', emoji: '🔀', desc: 'Reverse proxy admin', url: 'http://192.168.1.14:81', host: '192.168.1.14', port: 81, lan: true },
  { key: 'tdarr', name: 'Tdarr', emoji: '🗜️', desc: 'Transcoding', url: 'http://192.168.1.13:8265', host: '192.168.1.13', port: 8265, lan: true },
  { key: 'homepage', name: 'Homepage', emoji: '📋', desc: 'Old services dashboard', url: 'http://192.168.1.10:3000', host: '192.168.1.10', port: 3000, lan: true },
  { key: 'unifi', name: 'UniFi (router)', emoji: '📡', desc: 'Network / Dream Machine', url: 'https://192.168.1.1', host: '192.168.1.1', port: 443, lan: true },
]

function tcpCheck(host, port, timeout = 2500) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const sock = net.createConnection({ host, port })
    let done = false
    const finish = (ok) => { if (done) return; done = true; try { sock.destroy() } catch { /* noop */ } resolve({ ok, ms: Date.now() - t0 }) }
    sock.setTimeout(timeout)
    sock.once('connect', () => finish(true))
    sock.once('timeout', () => finish(false))
    sock.once('error', () => finish(false))
  })
}

router.get('/', async (req, res) => {
  const results = await Promise.all(SERVICES.map(async (s) => {
    const { ok, ms } = await tcpCheck(s.host, s.port)
    const { host, port, ...pub } = s // don't leak internal host/port to the client
    return { ...pub, ok, ms }
  }))
  res.json({ services: results, at: new Date().toISOString() })
})

export default router
