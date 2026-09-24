import { useEffect, useState } from 'react'
import { getJarvisOps } from '../lib/data'

// Parents-only management page: what Jarvis is running (cron jobs), Claude
// token usage and host vitals. Data is a snapshot the jarvis LXC pushes to
// /api/jarvis/status every 10 minutes; this page just renders the latest one.

function ago(iso) {
  if (!iso) return '—'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ${mins % 60}m ago`
  return `${Math.floor(h / 24)}d ago`
}

function clock(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  const hm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return today ? hm : `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${hm}`
}

function UsageBar({ label, entry }) {
  const pct = entry?.pct
  const known = typeof pct === 'number'
  const hot = known && pct >= 80
  return (
    <div className="tide-card" style={{ padding: 16, flex: '1 1 180px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tide-faint)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: hot ? 'var(--tide-accent-ink)' : 'var(--tide-ink)' }}>
        {known ? `${Math.round(pct)}%` : '—'}
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--tide-hair)', marginTop: 10, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${known ? Math.min(pct, 100) : 0}%`, borderRadius: 3,
          background: hot ? 'var(--tide-accent-ink)' : 'var(--tide-grad-135)', transition: 'width 400ms ease',
        }} />
      </div>
      <div className="tide-sub" style={{ fontSize: 12, marginTop: 8 }}>
        {entry?.resets ? `resets ${clock(entry.resets)}` : 'no data'}
      </div>
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <div className="tide-card" style={{ padding: '12px 16px', flex: '1 1 140px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tide-faint)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 3, color: 'var(--tide-ink)' }}>{value ?? '—'}</div>
    </div>
  )
}

function CronRow({ job }) {
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap',
      padding: '10px 0', borderBottom: '1px solid var(--tide-hair)',
      opacity: job.enabled ? 1 : 0.45,
    }}>
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tide-ink)' }}>
          {job.name}
          {!job.enabled && <span style={{ fontWeight: 500, color: 'var(--tide-faint)' }}> · off</span>}
        </div>
        {job.note && <div className="tide-sub" style={{ fontSize: 12, marginTop: 2 }}>{job.note}</div>}
      </div>
      <div style={{ fontSize: 13, color: 'var(--tide-ink)', whiteSpace: 'nowrap' }} title={job.schedule}>{job.human}</div>
      <div className="tide-sub" style={{ fontSize: 12, whiteSpace: 'nowrap', minWidth: 90, textAlign: 'right' }}>
        {job.enabled && job.next ? `next ${clock(job.next)}` : ''}
      </div>
    </div>
  )
}

export default function TideOps() {
  const [record, setRecord] = useState(undefined) // undefined = loading, null = no snapshot
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    const load = () =>
      getJarvisOps()
        .then((r) => { if (alive) { setRecord(r); setError(null) } })
        .catch((e) => { if (alive) setError(e.message) })
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const s = record?.status
  const staleMins = s?.generatedAt ? (Date.now() - new Date(s.generatedAt).getTime()) / 60000 : null
  const stale = staleMins !== null && staleMins > 25

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}>
        jarvis <span className="tide-grad">ops</span>
      </div>
      <p className="tide-sub" style={{ marginTop: 6 }}>
        what jarvis is running · updated {s ? ago(s.generatedAt) : '—'}
        {stale && <span style={{ color: 'var(--tide-accent-ink)', fontWeight: 600 }}> · snapshot is stale, the pusher may be down</span>}
      </p>

      {error && (
        <div className="tide-card" style={{ padding: 16, marginTop: 16, color: 'var(--tide-accent-ink)' }}>
          couldn't load the snapshot: {error}
        </div>
      )}
      {record === null && !error && (
        <div className="tide-card" style={{ padding: 16, marginTop: 16 }}>
          no snapshot yet — the jarvis box hasn't pushed one. give it ten minutes.
        </div>
      )}

      {s && (
        <>
          {/* Claude usage */}
          <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 24, color: 'var(--tide-ink)' }}>claude usage</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
            <UsageBar label="session" entry={s.usage?.session} />
            <UsageBar label="week · all models" entry={s.usage?.weeklyAll} />
            <UsageBar label="week · fable" entry={s.usage?.fable} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            <Fact label="chat model" value={s.usage?.model?.replace('claude-', '')} />
            {s.usage?.extra?.enabled && (
              <Fact label="extra usage" value={`${s.usage.extra.currency}${s.usage.extra.used.toFixed(2)} of ${s.usage.extra.currency}${s.usage.extra.cap.toFixed(0)}`} />
            )}
            <Fact label="bridge last active" value={ago(s.bridge?.lastActivity)} />
          </div>

          {/* Cron jobs */}
          <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 28, color: 'var(--tide-ink)' }}>
            cron jobs <span style={{ fontWeight: 500, color: 'var(--tide-faint)' }}>· {s.cron?.filter((j) => j.enabled).length ?? 0} live</span>
          </h3>
          <div className="tide-card" style={{ padding: '6px 16px', marginTop: 10 }}>
            {(s.cron || []).map((job, i) => <CronRow key={i} job={job} />)}
            {!s.cron?.length && <div className="tide-sub" style={{ padding: '10px 0' }}>none reported</div>}
          </div>

          {/* Host vitals */}
          <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 28, color: 'var(--tide-ink)' }}>
            host <span style={{ fontWeight: 500, color: 'var(--tide-faint)' }}>· {s.host}</span>
          </h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
            <Fact label="load" value={s.vitals?.load1 != null ? `${s.vitals.load1} / ${s.vitals.load5} / ${s.vitals.load15}` : null} />
            <Fact label="memory" value={s.vitals?.memUsedPct != null ? `${s.vitals.memUsedPct}% of ${s.vitals.memTotalMb} MB` : null} />
            <Fact label="disk" value={s.vitals?.diskUsedPct != null ? `${s.vitals.diskUsedPct}% · ${s.vitals.diskFree} free` : null} />
            <Fact label="uptime" value={s.vitals?.uptime} />
          </div>
        </>
      )}
    </div>
  )
}
