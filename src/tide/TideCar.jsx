// House > car: the MG4, the Pod Point and what charging actually costs on the
// Octopus Go tariff, plus the home electricity picture. Parents only; the data
// comes from one /api/ha/car payload (live HA states + recorder statistics).
import { useEffect, useMemo, useState } from 'react'
import { Label, EmptyHint, formatGBP } from './widgets'
import { haCar } from '../lib/data'

// Validated categorical slots (dataviz validator, light + dark pass).
const C_CAR = '#e0703f'
const C_HOUSE = '#4a7fd6'
const C_EXPORT = '#3f9d78'
const TARIFF_START = '2026-10-10' // costs are only real from the Go 12M Fixed start

const pct = (v) => (v == null ? '–' : `${Math.round(v)}%`)
const kw = (w) => (w == null ? '–' : w >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${Math.round(w)} W`)
const hm = (min) => {
  if (min == null || min <= 0) return null
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}
const clock = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const dayShort = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

function ago(iso) {
  if (!iso) return null
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

function Card({ children, style }) {
  return <div className="tide-card" style={{ padding: 16, ...style }}>{children}</div>
}

function Chip({ children, tone }) {
  const tones = {
    good: { background: 'rgba(63,157,120,0.14)', color: C_EXPORT },
    warn: { background: 'rgba(224,112,63,0.14)', color: 'var(--tide-accent-ink)' },
  }
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap',
      background: 'var(--tide-hair)', color: 'var(--tide-ink)', ...(tones[tone] || {}),
    }}>{children}</span>
  )
}

// ---------------- hero: battery ring + what the car is doing ----------------

function BatteryRing({ soc, target, charging, size = 176 }) {
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, (soc || 0) / 100))
  const tAng = ((target || 80) / 100) * 2 * Math.PI - Math.PI / 2
  const tx = (rad) => size / 2 + rad * Math.cos(tAng)
  const ty = (rad) => size / 2 + rad * Math.sin(tAng)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: 'none' }}
      role="img" aria-label={`battery ${pct(soc)}, charge limit ${pct(target)}`}>
      <defs>
        <linearGradient id="car-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f08c5a" />
          <stop offset="100%" stopColor="#d96d8f" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--tide-hair)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#car-ring)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className={charging ? 'car-ring-charging' : undefined}
        style={{ transition: 'stroke-dasharray 800ms ease' }}
      />
      {target != null && (
        <line x1={tx(r - stroke / 2 - 3)} y1={ty(r - stroke / 2 - 3)} x2={tx(r + stroke / 2 + 3)} y2={ty(r + stroke / 2 + 3)}
          stroke="var(--tide-ink)" strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
          <title>{`charge limit ${target}%`}</title>
        </line>
      )}
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle"
        style={{ fill: 'var(--tide-ink)', fontSize: 40, fontWeight: 800 }}>
        {soc == null ? '–' : Math.round(soc)}<tspan style={{ fontSize: 18, fill: 'var(--tide-muted)' }}>%</tspan>
      </text>
      <text x="50%" y="66%" textAnchor="middle" style={{ fill: 'var(--tide-muted)', fontSize: 12, fontWeight: 600 }}>
        {charging ? '⚡ charging' : `limit ${pct(target)}`}
      </text>
    </svg>
  )
}

function headline(car, charger) {
  const charging = /charging/i.test(car.status || '') && !/not|stop|complete/i.test(car.status || '')
  const toGo = hm(car.remainingMin)
  if (charging) {
    return {
      charging,
      title: car.home ? 'charging at home' : 'charging away',
      sub: `${car.powerKw ? `${car.powerKw} kW` : 'topping up'}${toGo ? ` · ${pct(car.target)} in about ${toGo}` : ''}`,
    }
  }
  if (car.home && (car.plugged || charger.cable)) {
    if (charger.status === 'waiting-for-schedule') {
      return { charging, title: 'plugged in, waiting', sub: `charges from 00:30 at ${charger.nightRate ?? 9.5}p` }
    }
    if ((car.soc ?? 0) >= (car.target ?? 80) - 1) return { charging, title: 'plugged in and full', sub: `sat at its ${pct(car.target)} limit` }
    return { charging, title: 'plugged in', sub: charger.status ? charger.status.replace(/-/g, ' ') : '' }
  }
  if (car.home) return { charging, title: 'parked at home', sub: 'not plugged in' }
  return { charging, title: 'out and about', sub: car.plugged ? 'plugged in somewhere else' : 'away from home' }
}

function Hero({ car, charger }) {
  const h = headline(car, charger)
  return (
    <Card style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 'auto -60px -90px auto', width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(240,140,90,0.18), transparent 70%)', pointerEvents: 'none',
      }} />
      <BatteryRing soc={car.soc} target={car.target} charging={h.charging} />
      <div style={{ flex: '1 1 200px', minWidth: 0, position: 'relative' }}>
        <Label style={{ marginBottom: 4 }}>mg4 · orange one</Label>
        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>{h.title}</div>
        <div className="tide-sub" style={{ fontSize: 14, marginTop: 4 }}>{h.sub}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 14 }}>
          <span style={{ fontSize: 30, fontWeight: 800 }}>{car.rangeMiles ?? '–'}</span>
          <span className="tide-sub" style={{ fontSize: 14 }}>miles of range</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          <Chip tone={car.home ? 'good' : undefined}>{car.home ? '🏠 home' : '📍 away'}</Chip>
          <Chip tone={car.locked ? 'good' : 'warn'}>{car.locked ? '🔒 locked' : '🔓 unlocked'}</Chip>
          {car.amps && <Chip tone={car.amps !== 'Max' ? 'warn' : undefined}>⚡ speed {car.amps}</Chip>}
          {car.open?.length > 0 && <Chip tone="warn">⚠️ open: {car.open.join(', ')}</Chip>}
        </div>
        {car.updated && <div className="tide-sub" style={{ fontSize: 11, marginTop: 10 }}>car checked in {ago(car.updated)}</div>}
      </div>
    </Card>
  )
}

// ---------------- tariff strip: where we are in the Go day ----------------

function toMin(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

function TariffCard({ charger, window }) {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const ns = toMin(window.start), ne = toMin(window.end)
  const night = nowMin >= ns && nowMin < ne
  const nextSwitch = night ? ne : ns
  const minsTo = (nextSwitch - nowMin + 1440) % 1440
  const live = charger.watts ?? 0
  const sessionAtNight = charger.session?.kwh != null && charger.nightRate != null
    ? (charger.session.kwh * charger.nightRate) / 100 : null

  return (
    <Card style={{ flex: '1 1 300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Label style={{ marginBottom: 0 }}>electricity price now</Label>
        <Chip tone={night ? 'good' : 'warn'}>{night ? '🌙 cheap window' : '☀️ day rate'}</Chip>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
        <span style={{ fontSize: 34, fontWeight: 800 }}>{charger.rate ?? '–'}</span>
        <span className="tide-sub">p/kWh</span>
      </div>
      <div className="tide-sub" style={{ fontSize: 13 }}>
        {night ? `${charger.dayRate}p` : `${charger.nightRate}p`} in {hm(minsTo)} (at {night ? window.end : window.start})
      </div>

      <div style={{ position: 'relative', height: 26, marginTop: 14, borderRadius: 8, overflow: 'hidden', background: 'rgba(224,112,63,0.16)' }}>
        <div title={`${window.start}–${window.end} · ${charger.nightRate}p`} style={{
          position: 'absolute', top: 0, bottom: 0, left: `${(ns / 1440) * 100}%`, width: `${((ne - ns) / 1440) * 100}%`,
          background: 'rgba(74,127,214,0.45)',
        }} />
        <div style={{
          position: 'absolute', top: -2, bottom: -2, left: `calc(${(nowMin / 1440) * 100}% - 1px)`, width: 2,
          background: 'var(--tide-ink)', borderRadius: 2,
        }} />
      </div>
      <div className="tide-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4 }}>
        <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
      </div>
      <div className="tide-sub" style={{ display: 'flex', gap: 14, fontSize: 12, marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(74,127,214,0.6)' }} />night {charger.nightRate}p</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(224,112,63,0.35)' }} />day {charger.dayRate}p</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        <div>
          <div className="tide-sub" style={{ fontSize: 12 }}>charger now</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{live > 50 ? kw(live) : 'idle'}</div>
          {live > 50 && charger.perHour != null && <div className="tide-sub" style={{ fontSize: 12 }}>{formatGBP(charger.perHour)} an hour</div>}
        </div>
        <div>
          <div className="tide-sub" style={{ fontSize: 12 }}>last session</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{charger.session?.cost != null ? formatGBP(charger.session.cost) : '–'}</div>
          <div className="tide-sub" style={{ fontSize: 12 }}>
            {charger.session?.kwh ?? '–'} kWh{sessionAtNight != null && charger.session.cost > sessionAtNight + 0.05 ? ` · ${formatGBP(sessionAtNight)} at night` : ''}
          </div>
        </div>
      </div>
      <div className="tide-sub" style={{ fontSize: 11, marginTop: 12 }}>
        pod point {charger.online ? 'online' : 'offline ⚠️'} · {charger.smart ? 'smart schedule on' : 'manual: charges any time'}
      </div>
    </Card>
  )
}

// ---------------- spend tiles ----------------

function SpendTiles({ spend, kwhMonth }) {
  const tiles = [
    ['today', spend.today], ['yesterday', spend.yesterday], ['this week', spend.week], ['this month', spend.month],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
      {tiles.map(([label, v], i) => (
        <Card key={label} style={{ padding: 14 }}>
          <div className="tide-sub" style={{ fontSize: 12 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }} className={i === 3 ? 'tide-grad' : undefined}>{formatGBP(v)}</div>
          {i === 3 && <div className="tide-sub" style={{ fontSize: 11 }}>{Math.round(kwhMonth)} kWh into the car</div>}
        </Card>
      ))}
    </div>
  )
}

// ---------------- charging per day (30 days) ----------------

function DailyCharging({ days }) {
  const [mode, setMode] = useState('cost')
  const [hover, setHover] = useState(null)
  const val = (d) => (mode === 'cost' ? (d.date >= TARIFF_START ? d.cost : null) : d.car)
  const max = Math.max(0.01, ...days.map((d) => val(d) || 0))
  const fmt = (v) => (mode === 'cost' ? formatGBP(v) : `${Math.round(v * 10) / 10} kWh`)
  const h = hover != null ? days[hover] : null

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Label style={{ marginBottom: 0, flex: 1 }}>charging · last 30 days</Label>
        {['cost', 'kWh'].map((m) => (
          <button key={m} className="tide-pill" onClick={() => setMode(m === 'cost' ? 'cost' : 'kwh')}
            aria-pressed={(m === 'cost') === (mode === 'cost')}
            style={(m === 'cost') === (mode === 'cost') ? { background: 'var(--tide-grad)', color: '#fff', borderColor: 'transparent' } : {}}>
            {m === 'cost' ? '£' : 'kWh'}
          </button>
        ))}
      </div>
      <div className="tide-sub" style={{ fontSize: 13, minHeight: 20, marginTop: 8 }}>
        {h ? <><b style={{ color: 'var(--tide-ink)' }}>{dayShort(h.date)}</b> · {val(h) == null ? 'before the Go tariff' : fmt(val(h))}{mode === 'cost' && val(h) != null ? ` · ${Math.round(h.car * 10) / 10} kWh` : ''}</> : 'tap a bar for the day'}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 130, marginTop: 6 }} onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => {
          const v = val(d)
          return (
            <div key={d.date} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}
              style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'pointer', minWidth: 0 }}>
              <div style={{
                width: '100%', height: v ? `${Math.max(3, (v / max) * 100)}%` : 2,
                borderRadius: '4px 4px 0 0',
                background: v ? C_CAR : 'var(--tide-hair)',
                opacity: hover == null || hover === i ? 1 : 0.45, transition: 'height .4s ease, opacity .15s',
              }} />
            </div>
          )
        })}
      </div>
      <div className="tide-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4 }}>
        <span>{days[0] && dayShort(days[0].date)}</span><span>today</span>
      </div>
      {mode === 'cost' && <div className="tide-sub" style={{ fontSize: 11, marginTop: 8 }}>real Octopus Go prices from 10 Oct · standing charge left out (you pay it car or no car)</div>}
    </Card>
  )
}

// ---------------- house electricity, last 24h ----------------

function Electricity24h({ hours, houseW, chargerW }) {
  const [hover, setHover] = useState(null)
  const up = hours.map((h) => h.car + h.house)
  const maxUp = Math.max(0.1, ...up)
  const maxDown = Math.max(0, ...hours.map((h) => h.exported))
  const total = maxUp + maxDown || 1
  const H = 150
  const upH = (maxUp / total) * H
  const h = hover != null ? hours[hover] : null
  const totals = hours.reduce((t, x) => ({ car: t.car + x.car, house: t.house + x.house, exp: t.exp + x.exported }), { car: 0, house: 0, exp: 0 })
  const exporting = houseW != null && houseW < 0

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <Label style={{ marginBottom: 0, flex: 1 }}>electricity · last 24 hours</Label>
        <Chip tone={exporting ? 'good' : undefined}>
          {exporting ? `☀️ sending ${kw(-houseW)} to grid` : `🏠 house ${kw(houseW)}`}{chargerW > 50 ? ` · 🚗 ${kw(chargerW)}` : ''}
        </Chip>
      </div>
      <div className="tide-sub" style={{ fontSize: 13, minHeight: 20, marginTop: 8 }}>
        {h ? <><b style={{ color: 'var(--tide-ink)' }}>{clock(h.t)}</b> · car {h.car} · house {h.house} · sent out {h.exported} kWh</> : 'tap an hour for the detail'}
      </div>
      <div style={{ display: 'flex', gap: 2, height: H, marginTop: 6, position: 'relative' }} onMouseLeave={() => setHover(null)}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: upH, height: 1, background: 'var(--tide-hair)' }} />
        {hours.map((x, i) => (
          <div key={x.t} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}
            style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', cursor: 'pointer', opacity: hover == null || hover === i ? 1 : 0.45, transition: 'opacity .15s' }}>
            <div style={{ height: upH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2 }}>
              {x.car > 0 && <div style={{ height: (x.car / total) * H, background: C_CAR, borderRadius: '4px 4px 0 0' }} />}
              {x.house > 0 && <div style={{ height: Math.max(1, (x.house / total) * H - 2), background: C_HOUSE, borderRadius: x.car > 0 ? 0 : '4px 4px 0 0' }} />}
            </div>
            {x.exported > 0 && <div style={{ height: (x.exported / total) * H, background: C_EXPORT, borderRadius: '0 0 4px 4px' }} />}
          </div>
        ))}
      </div>
      <div className="tide-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4 }}>
        <span>{hours[0] && clock(hours[0].t)}</span><span>{hours.length > 12 && clock(hours[Math.floor(hours.length / 2)].t)}</span><span>now</span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {[[C_CAR, 'car', totals.car], [C_HOUSE, 'house from grid', totals.house], [C_EXPORT, 'solar sent out', totals.exp]].map(([c, l, v]) => (
          <span key={l} className="tide-sub" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} /> {l} {Math.round(v * 10) / 10} kWh
          </span>
        ))}
      </div>
    </Card>
  )
}

// ---------------- battery % over 48h ----------------

function BatteryLine({ points, target }) {
  const [hover, setHover] = useState(null)
  const W = 600, H = 140, pad = 4
  const now = Date.now(), t0 = now - 48 * 3600 * 1000
  const pts = useMemo(() => {
    const p = points.filter((x) => x.t >= t0)
    if (p.length && p[p.length - 1].t < now) p.push({ t: now, v: p[p.length - 1].v })
    return p
  }, [points]) // eslint-disable-line react-hooks/exhaustive-deps
  if (pts.length < 2) return null
  const x = (t) => ((t - t0) / (now - t0)) * W
  const y = (v) => pad + (1 - v / 100) * (H - pad * 2)
  // step line: the car reports in jumps, so hold each value until the next
  let d = `M${x(pts[0].t)},${y(pts[0].v)}`
  for (let i = 1; i < pts.length; i++) d += ` H${x(pts[i].t)} V${y(pts[i].v)}`
  const area = `${d} V${H} H${x(pts[0].t)} Z`
  const hp = hover != null ? pts[hover] : null

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const t = t0 + ((e.clientX - r.left) / r.width) * (now - t0)
    let best = 0
    for (let i = 0; i < pts.length; i++) if (pts[i].t <= t) best = i
    setHover(best)
  }

  return (
    <Card>
      <Label style={{ marginBottom: 0 }}>battery · last 48 hours</Label>
      <div className="tide-sub" style={{ fontSize: 13, minHeight: 20, marginTop: 8 }}>
        {hp ? <><b style={{ color: 'var(--tide-ink)' }}>{pct(hp.v)}</b> at {new Date(hp.t).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</> : 'drag across for the battery at any time'}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, marginTop: 6, display: 'block', touchAction: 'pan-y' }}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="soc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f08c5a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#d96d8f" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="soc-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f08c5a" />
            <stop offset="100%" stopColor="#d96d8f" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((g) => <line key={g} x1="0" x2={W} y1={y(g)} y2={y(g)} stroke="var(--tide-hair)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        {target != null && <line x1="0" x2={W} y1={y(target)} y2={y(target)} stroke="var(--tide-muted)" strokeDasharray="5 5" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        <path d={area} fill="url(#soc-fill)" />
        <path d={d} fill="none" stroke="url(#soc-line)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hp && <line x1={x(hp.t)} x2={x(hp.t)} y1="0" y2={H} stroke="var(--tide-ink)" strokeOpacity="0.4" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="tide-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4 }}>
        <span>2 days ago</span><span>yesterday</span><span>now</span>
      </div>
      {target != null && <div className="tide-sub" style={{ fontSize: 11, marginTop: 6 }}>dashed line = the {target}% charge limit</div>}
    </Card>
  )
}

// ---------------- car health: tyres, 12V, temps ----------------

function Tyre({ v, unit, side }) {
  const low = v != null && v < 2.2
  return (
    <div style={{ textAlign: side === 'L' ? 'right' : 'left' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: low ? 'var(--tide-accent-ink)' : 'var(--tide-ink)' }}>{v ?? '–'}{low ? ' ⚠️' : ''}</div>
      <div className="tide-sub" style={{ fontSize: 10 }}>{unit}</div>
    </div>
  )
}

function CarHealth({ car }) {
  const t = car.tyres || {}
  const stats = [
    ['odometer', car.mileage != null ? `${car.mileage.toLocaleString('en-GB')} mi` : '–'],
    ['12V battery', car.auxV != null ? `${car.auxV} V` : '–'],
    ['inside / outside', car.insideC != null ? `${car.insideC}° / ${car.outsideC ?? '–'}°` : '–'],
    ...(car.efficiency != null ? [['efficiency', `${car.efficiency} mi/kWh`]] : []),
  ]
  return (
    <Card style={{ flex: '1 1 300px' }}>
      <Label>car health</Label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 74px 1fr', alignItems: 'center', gap: 12, maxWidth: 260, margin: '4px auto 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 46 }}>
          <Tyre v={t.FL} unit={car.tyreUnit} side="L" />
          <Tyre v={t.RL} unit={car.tyreUnit} side="L" />
        </div>
        <svg viewBox="0 0 74 150" width="74" height="150" aria-label="tyre pressures, car seen from above">
          <defs>
            <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f08c5a" />
              <stop offset="100%" stopColor="#d96d8f" />
            </linearGradient>
          </defs>
          {[[2, 22], [62, 22], [2, 104], [62, 104]].map(([cx, cy]) => <rect key={`${cx}${cy}`} x={cx} y={cy} width="10" height="24" rx="4" fill="var(--tide-ink)" opacity="0.75" />)}
          <rect x="8" y="4" width="58" height="142" rx="22" fill="url(#car-body)" />
          <rect x="15" y="34" width="44" height="26" rx="8" fill="var(--tide-ground)" opacity="0.55" />
          <rect x="15" y="100" width="44" height="18" rx="7" fill="var(--tide-ground)" opacity="0.45" />
          <rect x="18" y="64" width="38" height="32" rx="6" fill="#fff" opacity="0.12" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 46 }}>
          <Tyre v={t.FR} unit={car.tyreUnit} side="R" />
          <Tyre v={t.RR} unit={car.tyreUnit} side="R" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        {stats.map(([l, v]) => (
          <div key={l}>
            <div className="tide-sub" style={{ fontSize: 12 }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ---------------- page ----------------

export default function TideCar() {
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    const load = () => haCar().then((d) => { if (alive) { setData(d); setLoaded(true) } })
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  if (!loaded) return <Card style={{ marginTop: 16 }}><EmptyHint>finding the car…</EmptyHint></Card>
  if (!data) return <Card style={{ marginTop: 16 }}><EmptyHint>can't reach the car or home assistant right now.</EmptyHint></Card>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16, maxWidth: 820 }}>
      <style>{`
        @keyframes car-pulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
        .car-ring-charging { animation: car-pulse 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .car-ring-charging { animation: none } }
      `}</style>
      <Hero car={data.car} charger={data.charger} />
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <TariffCard charger={data.charger} window={data.window} />
        <CarHealth car={data.car} />
      </div>
      <SpendTiles spend={data.spend} kwhMonth={data.kwhMonth} />
      <DailyCharging days={data.days} />
      <Electricity24h hours={data.hours} houseW={data.house.watts} chargerW={data.charger.watts} />
      <BatteryLine points={data.soc} target={data.car.target} />
    </div>
  )
}
