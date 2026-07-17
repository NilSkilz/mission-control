// Nest-style thermostat dial for the house screen. Drives the living-room
// climate entity: shows the current room temperature big in the middle, a warm
// arc up to the setpoint, and -/+ controls plus a heat/off toggle. Nudging the
// dial up from off turns the heating on, the way a Nest does.
import { useEffect, useState, useCallback } from 'react'
import { Label, EmptyHint } from './widgets'
import { haClimate, haCall } from '../lib/data'

const SWEEP = 270          // degrees of arc (90deg gap at the bottom)
const START = 135          // start angle (lower-left), sweeping clockwise
const R = 82               // arc radius
const CX = 100
const CY = 100

function polar(angleDeg, r = R) {
  const a = (angleDeg * Math.PI) / 180
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

function arcPath(fromAngle, toAngle, r = R) {
  const s = polar(fromAngle, r)
  const e = polar(toAngle, r)
  const large = toAngle - fromAngle > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)) }

export default function TideThermostat() {
  const [c, setC] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [sp, setSp] = useState(null)   // local setpoint (optimistic)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const data = await haClimate()
    setC(data)
    setLoaded(true)
    if (data?.available) {
      setSp((prev) => {
        // adopt the real target once we have one; otherwise seed near current
        if (data.target != null) return data.target
        if (prev != null) return prev
        return data.current != null ? Math.round(data.current) : 20
      })
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  if (!loaded) {
    return (
      <div className="tide-card" style={{ padding: 20, marginTop: 16, maxWidth: 300 }}>
        <Label>thermostat</Label>
        <EmptyHint>reading the thermostat…</EmptyHint>
      </div>
    )
  }
  if (!c?.available) {
    return (
      <div className="tide-card" style={{ padding: 20, marginTop: 16, maxWidth: 300 }}>
        <Label>thermostat</Label>
        <EmptyHint>the thermostat isn't answering right now.</EmptyHint>
      </div>
    )
  }

  const { min, max, step, unit, current, humidity, mode, action } = c
  const heating = mode === 'heat'
  const isHeatingNow = action === 'heating'
  const setpoint = sp ?? (current != null ? Math.round(current) : 20)

  const frac = clamp((setpoint - min) / (max - min || 1), 0, 1)
  const setAngle = START + frac * SWEEP
  const curFrac = current != null ? clamp((current - min) / (max - min || 1), 0, 1) : null
  const curAngle = curFrac != null ? START + curFrac * SWEEP : null
  const knob = polar(setAngle)
  const curTick = curAngle != null ? { a: polar(curAngle, R + 12), b: polar(curAngle, R - 12) } : null

  const unitShort = `°${(unit || '°C').replace('°', '') || 'C'}`

  const push = async (nextSp, wantHeat) => {
    setBusy(true)
    try {
      if (wantHeat && !heating) {
        await haCall('climate', 'set_hvac_mode', c.entity_id, { hvac_mode: 'heat' })
      }
      if (nextSp != null) {
        await haCall('climate', 'set_temperature', c.entity_id, { temperature: nextSp })
      }
    } catch { /* refetch below shows the true state */ }
    setBusy(false)
    setTimeout(load, 900)
  }

  const nudge = (dir) => {
    const next = clamp(Math.round((setpoint + dir * step) / step) * step, min, max)
    setSp(next)
    // turning the dial up from off fires up the heating, Nest-style
    push(next, true)
  }

  const toggleMode = () => {
    if (heating) {
      setC((p) => ({ ...p, mode: 'off', action: 'off' }))
      setBusy(true)
      haCall('climate', 'set_hvac_mode', c.entity_id, { hvac_mode: 'off' })
        .catch(() => {})
        .finally(() => { setBusy(false); setTimeout(load, 900) })
    } else {
      setC((p) => ({ ...p, mode: 'heat' }))
      push(setpoint, true)
    }
  }

  const arcColor = heating ? 'url(#thermoGrad)' : 'var(--tide-hair)'
  const statusLine = !heating
    ? 'off'
    : isHeatingNow
      ? `heating to ${setpoint}${unitShort}`
      : `set to ${setpoint}${unitShort}`

  const roundBtn = {
    width: 46, height: 46, borderRadius: '50%', flex: 'none', fontSize: 22, lineHeight: 1,
    border: '1px solid var(--tide-hair)', background: 'var(--tide-card-bg, transparent)',
    color: 'var(--tide-ink)', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1,
  }

  return (
    <div className="tide-card" style={{ padding: 20, marginTop: 16, maxWidth: 300 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Label style={{ marginBottom: 0 }}>living room</Label>
        <span className="tide-sub" style={{ fontSize: 12 }}>
          {humidity != null ? `💧 ${Math.round(humidity)}%` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <svg width="100%" viewBox="0 0 200 200" style={{ maxWidth: 220 }}>
          <defs>
            <linearGradient id="thermoGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f08c5a" />
              <stop offset="100%" stopColor="#d96d8f" />
            </linearGradient>
          </defs>
          {/* track */}
          <path d={arcPath(START, START + SWEEP)} fill="none" stroke="var(--tide-hair)" strokeWidth="10" strokeLinecap="round" />
          {/* fill up to setpoint */}
          {heating && (
            <path d={arcPath(START, setAngle)} fill="none" stroke={arcColor} strokeWidth="10" strokeLinecap="round"
              style={{ transition: 'stroke-dasharray .4s ease' }} />
          )}
          {/* current-temperature tick on the track */}
          {curTick && (
            <line x1={curTick.a.x} y1={curTick.a.y} x2={curTick.b.x} y2={curTick.b.y}
              stroke="var(--tide-muted)" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
          )}
          {/* setpoint knob */}
          {heating && <circle cx={knob.x} cy={knob.y} r="7" fill="#fff" stroke="#d96d8f" strokeWidth="2.5" />}
          {/* centre readout */}
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="46" fontWeight="800" fill="var(--tide-ink)">
            {current != null ? Math.round(current) : '--'}
            <tspan fontSize="20" dy="-14" fill="var(--tide-muted)">{unitShort}</tspan>
          </text>
          <text x={CX} y={CY + 30} textAnchor="middle" fontSize="13" fill="var(--tide-muted)">
            {statusLine}
          </text>
        </svg>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 4 }}>
        <button aria-label="cooler" onClick={() => nudge(-1)} disabled={busy} style={roundBtn}>−</button>
        <button onClick={toggleMode} disabled={busy} className="tide-pill"
          style={{ border: 'none', cursor: busy ? 'default' : 'pointer',
            background: heating ? 'var(--tide-grad)' : 'var(--tide-hair)',
            color: heating ? '#fff' : 'var(--tide-ink)', minWidth: 84 }}>
          {heating ? (isHeatingNow ? '🔥 heating' : 'heat') : 'off'}
        </button>
        <button aria-label="warmer" onClick={() => nudge(1)} disabled={busy} style={roundBtn}>+</button>
      </div>
    </div>
  )
}
