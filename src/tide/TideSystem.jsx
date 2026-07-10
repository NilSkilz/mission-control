import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Label, EmptyHint } from './widgets'
import { getServices, getMediaSummary } from '../lib/data'
import { useUser } from '../context/UserContext'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([getServices(), getMediaSummary()]).then(([svc, s]) => {
      if (!alive) return
      setServices(svc.services || []); setSum(s); setLoading(false)
    })
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
