import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Label, EmptyHint } from './widgets'
import { getServices, getMediaSummary, getSystemOverview } from '../lib/data'
import { useUser } from '../context/UserContext'

// tidy a byte count to TB/GB with one decimal
function fmtBytes(b) {
  if (b == null) return '—'
  const tb = b / 1e12
  if (tb >= 1) return `${tb.toFixed(1)} TB`
  return `${Math.round(b / 1e9)} GB`
}

// colour a 0-100 load: green normal, amber busy, coral hot
function loadColour(pct) {
  if (pct >= 90) return '#e06a6a'
  if (pct >= 75) return 'var(--tide-accent-ink)'
  return 'var(--p-logan)'
}
function tempColour(c) {
  if (c >= 80) return '#e06a6a'
  if (c >= 68) return 'var(--tide-accent-ink)'
  return 'var(--p-logan)'
}

function Meter({ pct, colour }) {
  const p = Math.max(0, Math.min(100, pct || 0))
  return (
    <div style={{ height: 7, borderRadius: 6, background: 'color-mix(in srgb, var(--tide-ink) 10%, transparent)', overflow: 'hidden', marginTop: 8 }}>
      <div style={{ width: `${p}%`, height: '100%', borderRadius: 6, background: colour, transition: 'width .4s ease' }} />
    </div>
  )
}

function StatCard({ label, big, sub, pct, colour }) {
  return (
    <div className="tide-card" style={{ padding: 14 }}>
      <div className="tide-sub" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 20, marginTop: 4, color: colour || 'var(--tide-ink)' }}>{big}</div>
      {sub && <div className="tide-sub" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
      {pct != null && <Meter pct={pct} colour={colour} />}
    </div>
  )
}

function SystemStats({ ov }) {
  if (!ov) return null
  const { host, media } = ov
  const hostOk = host && !host.error

  const usedPct = media && media.total ? (media.used / media.total) * 100 : null
  const memPct = hostOk && host.mem?.total ? (host.mem.used / host.mem.total) * 100 : null

  if (!media && !hostOk) return null

  return (
    <div style={{ marginTop: 20 }}>
      <Label>at home right now</Label>
      <div className="tide-stat-grid" style={{ marginTop: 8 }}>
        {media && (
          <StatCard
            label="media drive"
            big={`${fmtBytes(media.free)} free`}
            sub={`${fmtBytes(media.used)} of ${fmtBytes(media.total)} used`}
            pct={usedPct}
            colour={loadColour(usedPct)}
          />
        )}
        {hostOk && (
          <>
            <StatCard
              label="cpu"
              big={`${host.cpu_pct}%`}
              sub={`load ${host.load?.[0]} · ${host.cores} cores`}
              pct={host.cpu_pct}
              colour={loadColour(host.cpu_pct)}
            />
            <StatCard
              label="memory"
              big={`${Math.round(memPct)}%`}
              sub={`${fmtBytes(host.mem.used)} of ${fmtBytes(host.mem.total)}`}
              pct={memPct}
              colour={loadColour(memPct)}
            />
            <StatCard
              label="cpu temp"
              big={`${host.temp_c}°C`}
              sub={host.temp_max_c && host.temp_max_c !== host.temp_c ? `${host.temp_max_c}°C peak core` : 'server'}
              colour={tempColour(host.temp_c)}
            />
          </>
        )}
      </div>
    </div>
  )
}

// small live stat per media service, pulled from /api/media/summary
function mediaStat(key, sum) {
  if (!sum) return null
  if (key === 'plex' && sum.plex?.online) return `${sum.plex.streams || 0} streaming`
  if (key === 'sonarr' && sum.sonarr?.online) return `${sum.sonarr.queue || 0} in queue`
  if (key === 'radarr' && sum.radarr?.online) return `${sum.radarr.queue || 0} in queue`
  if (key === 'sab' && sum.sabnzbd?.online) return sum.sabnzbd.slots ? `${sum.sabnzbd.slots} downloading` : 'idle'
  return null
}

function ServiceCard({ s, sum }) {
  const stat = mediaStat(s.key, sum)
  return (
    <a href={s.url} target="_blank" rel="noreferrer" className="tide-card tide-service" style={{ padding: 14, textDecoration: 'none', color: 'var(--tide-ink)', display: 'block' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{s.emoji}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            {s.name}
            <span title={s.ok ? `up · ${s.ms}ms` : 'not responding'} style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: s.ok ? 'var(--p-logan)' : '#e06a6a' }} />
          </div>
          <div className="tide-sub" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.desc}</div>
        </div>
        <span className="tide-sub" style={{ fontSize: 16 }}>↗</span>
      </div>
      <div className="tide-sub" style={{ fontSize: 11, marginTop: 8, display: 'flex', gap: 8 }}>
        <span>{s.ok ? `online · ${s.ms}ms` : 'offline'}</span>
        {stat && <span style={{ color: 'var(--tide-accent-ink)' }}>· {stat}</span>}
      </div>
    </a>
  )
}

export default function TideSystem() {
  const { user } = useUser()
  const isParent = user?.role === 'parent'
  const [services, setServices] = useState([])
  const [sum, setSum] = useState(null)
  const [ov, setOv] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([getServices(), getMediaSummary()]).then(([svc, s]) => {
      if (!alive) return
      setServices(svc.services || []); setSum(s); setLoading(false)
    })
    // host/media stats load independently (slower: SSH + arr API) so they never hold up the links
    getSystemOverview().then((o) => { if (alive) setOv(o) })
    return () => { alive = false }
  }, [])

  const hosted = services.filter((s) => !s.lan)
  const network = services.filter((s) => s.lan)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">system</span></div>
        {isParent && <Link to="/system/dashboard" className="tide-pill" style={{ marginLeft: 'auto' }}>▦ dashboard</Link>}
      </div>
      <p className="tide-sub" style={{ marginTop: 6 }}>quick links to everything running at home</p>

      <SystemStats ov={ov} />

      {loading ? (
        <p className="tide-sub" style={{ marginTop: 18 }}>checking services…</p>
      ) : services.length === 0 ? (
        <EmptyHint>couldn't reach the service check.</EmptyHint>
      ) : (
        <>
          <div style={{ marginTop: 20 }}>
            <Label>hosted (cracky.co.uk)</Label>
            <div className="tide-service-grid" style={{ marginTop: 8 }}>
              {hosted.map((s) => <ServiceCard key={s.key} s={s} sum={sum} />)}
            </div>
          </div>
          {network.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Label>on the network (home only)</Label>
              <div className="tide-service-grid" style={{ marginTop: 8 }}>
                {network.map((s) => <ServiceCard key={s.key} s={s} sum={sum} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
