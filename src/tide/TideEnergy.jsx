// Home energy for the house screen, styled after the HA energy page: a 7-day
// grouped bar chart of grid usage vs solar sent back to the grid, plus a live
// "right now" reading of which way the power is flowing.
import { useEffect, useState } from 'react'
import { Label, EmptyHint } from './widgets'
import { haEnergyWeek } from '../lib/data'

const USAGE = 'linear-gradient(180deg,#f08c5a,#d96d8f)'      // used from grid
const SOLAR = 'linear-gradient(180deg,#5bbf8a,#3f9d78)'      // sent to grid (solar)

function dayInitial(iso) {
  const d = new Date(`${iso}T00:00:00`)
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()] || ''
}

function fmt(kwh) {
  if (kwh >= 100) return Math.round(kwh)
  return Math.round(kwh * 10) / 10
}

function LiveBadge({ live }) {
  if (!live || live.watts == null) return null
  const exporting = live.flow === 'export'
  const w = Math.abs(live.watts)
  const label = w >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${w} W`
  return (
    <span className="tide-pill" style={{
      fontSize: 12, background: exporting ? 'rgba(91,191,138,0.16)' : 'var(--tide-hair)',
      color: exporting ? '#3f9d78' : 'var(--tide-ink)',
    }}>
      {exporting ? `☀️ sending ${label} to grid` : `⚡ using ${label} from grid`}
    </span>
  )
}

export default function TideEnergy() {
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    const load = () => haEnergyWeek().then((d) => { if (alive) { setData(d); setLoaded(true) } })
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  if (!loaded) {
    return (
      <div className="tide-card" style={{ padding: 16, marginTop: 16 }}>
        <Label>energy</Label>
        <EmptyHint>reading the meter…</EmptyHint>
      </div>
    )
  }
  if (!data || !data.days?.length) {
    return (
      <div className="tide-card" style={{ padding: 16, marginTop: 16 }}>
        <Label>energy</Label>
        <EmptyHint>no energy data from home assistant right now.</EmptyHint>
      </div>
    )
  }

  const max = Math.max(0.1, ...data.days.flatMap((d) => [d.usage, d.production]))

  return (
    <div className="tide-card" style={{ padding: 16, marginTop: 16, maxWidth: 520 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <Label style={{ marginBottom: 0 }}>energy · this week</Label>
        <LiveBadge live={data.live} />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 96, marginTop: 16 }}>
        {data.days.map((d) => (
          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }}>
              <div title={`used ${fmt(d.usage)} kWh`} style={{
                width: '42%', height: `${Math.max(d.usage ? 6 : 2, (d.usage / max) * 100)}%`,
                borderRadius: 4, background: d.usage ? USAGE : 'color-mix(in srgb, var(--tide-ink) 8%, transparent)',
                transition: 'height .4s ease',
              }} />
              <div title={`solar sent ${fmt(d.production)} kWh`} style={{
                width: '42%', height: `${Math.max(d.production ? 6 : 2, (d.production / max) * 100)}%`,
                borderRadius: 4, background: d.production ? SOLAR : 'color-mix(in srgb, var(--tide-ink) 8%, transparent)',
                transition: 'height .4s ease',
              }} />
            </div>
            <span className="tide-sub" style={{ fontSize: 10 }}>{dayInitial(d.date)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        <span className="tide-sub" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: USAGE }} /> used {fmt(data.totals.usage)} kWh
        </span>
        <span className="tide-sub" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: SOLAR }} /> solar sent {fmt(data.totals.production)} kWh
        </span>
      </div>
      <div className="tide-sub" style={{ fontSize: 11, marginTop: 8 }}>
        grid usage vs solar returned · last 7 days
      </div>
    </div>
  )
}
