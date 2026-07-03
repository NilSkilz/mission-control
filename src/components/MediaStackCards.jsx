import { useState, useEffect } from 'react'
import { Card } from './ui'

const API_BASE = ''

function StatusDot({ online, active }) {
  if (!online) return <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
  return (
    <span className={`w-2 h-2 rounded-full inline-block ${active ? 'bg-green-400 animate-pulse' : 'bg-green-400/60'}`} />
  )
}

function MediaCard({ title, borderColor, online, active, value, unit, lines }) {
  return (
    <Card className={`bg-slate-800/50 ${borderColor} ${active ? 'panel-active' : 'card-alive'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-slate-400 text-xs font-mono header-glow">{title}</div>
        <StatusDot online={online} active={active} />
      </div>
      <div className="text-white font-semibold text-lg value-live">
        {online ? value : 'OFFLINE'}
        {online && unit && <span className="text-slate-400 text-sm ml-1">{unit}</span>}
      </div>
      <div className="mt-1 space-y-0.5 min-h-[2rem]">
        {(lines || []).map((line, i) => (
          <div key={i} className="text-slate-500 text-xs data-stream truncate">{line}</div>
        ))}
      </div>
    </Card>
  )
}

function relativeDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const days = Math.round((d - new Date().setHours(0, 0, 0, 0)) / 86400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function MediaStackCards() {
  const [media, setMedia] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/media/summary`)
        const json = await res.json()
        if (!cancelled && json.success) setMedia(json.data)
      } catch {
        /* keep last known state */
      }
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (!media) return null

  const { plex, sonarr, radarr, sabnzbd } = media

  const plexLines = plex?.online && plex.streams > 0
    ? plex.sessions.slice(0, 2).map(s => `${s.user}: ${s.title}`)
    : ['no active streams']

  const sonarrLines = sonarr?.online
    ? [
        sonarr.queue > 0 ? `${sonarr.queue} downloading` : 'queue empty',
        sonarr.next ? `next: ${sonarr.next.series} ${sonarr.next.episode} ${relativeDay(sonarr.next.airDate)}` : 'nothing airing this week'
      ]
    : []

  const radarrLines = radarr?.online
    ? [
        radarr.queue > 0 ? `${radarr.queue} downloading` : 'queue empty',
        radarr.next ? `soon: ${radarr.next.title} ${relativeDay(radarr.next.release)}` : 'no upcoming releases'
      ]
    : []

  const sabActive = sabnzbd?.online && !sabnzbd.paused && sabnzbd.speedKBps > 100
  const sabSpeed = sabnzbd?.speedKBps >= 1024
    ? `${(sabnzbd.speedKBps / 1024).toFixed(1)}`
    : `${Math.round(sabnzbd?.speedKBps || 0)}`
  const sabUnit = sabnzbd?.speedKBps >= 1024 ? 'MB/s' : 'KB/s'
  const sabLines = sabnzbd?.online
    ? sabnzbd.slots > 0
      ? [
          `${sabnzbd.slots} in queue, ${(sabnzbd.remainingMB / 1024).toFixed(1)} GB left`,
          sabnzbd.paused ? 'PAUSED' : (sabnzbd.timeLeft ? `eta ${sabnzbd.timeLeft}` : '')
        ].filter(Boolean)
      : ['queue empty']
    : []

  return (
    <section className="mt-6">
      <div className="text-xs text-cyan-400 font-mono mb-3 header-glow">// MEDIA_STACK</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MediaCard
          title="// PLEX"
          borderColor="border-amber-500/30"
          online={!!plex?.online}
          active={plex?.online && plex.streams > 0}
          value={plex?.streams ?? 0}
          unit={plex?.streams === 1 ? 'stream' : 'streams'}
          lines={plexLines}
        />
        <MediaCard
          title="// SONARR"
          borderColor="border-sky-500/30"
          online={!!sonarr?.online}
          active={sonarr?.online && sonarr.queue > 0}
          value={sonarr?.upcoming ?? 0}
          unit="airing this week"
          lines={sonarrLines}
        />
        <MediaCard
          title="// RADARR"
          borderColor="border-yellow-500/30"
          online={!!radarr?.online}
          active={radarr?.online && radarr.queue > 0}
          value={radarr?.upcoming ?? 0}
          unit="releases this month"
          lines={radarrLines}
        />
        <MediaCard
          title="// SABNZBD"
          borderColor="border-green-500/30"
          online={!!sabnzbd?.online}
          active={sabActive}
          value={sabActive ? sabSpeed : (sabnzbd?.slots ?? 0)}
          unit={sabActive ? sabUnit : 'queued'}
          lines={sabLines}
        />
      </div>
    </section>
  )
}
