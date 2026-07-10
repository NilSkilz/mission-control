import { useEffect, useState, useCallback } from 'react'
import { useUser } from '../context/UserContext'
import { Label, EmptyHint } from './widgets'
import { haStates, haCall } from '../lib/data'
import { controlsFor, HOUSE_TEMP_SENSOR, HA_LINK } from './houseConfig'

const ON_STATES = new Set(['on', 'open', 'home', 'playing', 'heat', 'cool'])

function Toggle({ on }) {
  return (
    <span style={{
      marginLeft: 'auto', width: 40, height: 23, borderRadius: 999, flex: 'none', position: 'relative',
      background: on ? 'var(--tide-grad)' : 'var(--tide-hair)', transition: 'background 200ms ease',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 19 : 2, width: 19, height: 19, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 180ms ease',
      }} />
    </span>
  )
}

export default function TideHouse() {
  const { user } = useUser()
  const controls = controlsFor(user)
  const [states, setStates] = useState({})
  const [temp, setTemp] = useState(null)
  const [offline, setOffline] = useState(false)
  const [busy, setBusy] = useState(null)

  const entityIds = controls.map((c) => c.entity_id)

  const load = useCallback(async () => {
    const ids = [...entityIds, HOUSE_TEMP_SENSOR].filter(Boolean)
    const rows = await haStates(ids)
    if (rows.length === 0 && ids.length > 0) setOffline(true)
    else setOffline(false)
    const map = {}
    for (const s of rows) map[s.entity_id] = s
    setStates(map)
    if (HOUSE_TEMP_SENSOR && map[HOUSE_TEMP_SENSOR]) setTemp(map[HOUSE_TEMP_SENSOR])
  }, [entityIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const isOn = (c) => ON_STATES.has(states[c.entity_id]?.state)

  const toggle = async (c) => {
    setBusy(c.entity_id)
    const turnOn = !isOn(c)
    // optimistic
    setStates((m) => ({ ...m, [c.entity_id]: { ...m[c.entity_id], state: turnOn ? 'on' : 'off' } }))
    try {
      await haCall(c.domain, turnOn ? 'turn_on' : 'turn_off', c.entity_id)
    } catch { /* revert on failure */ setStates((m) => ({ ...m, [c.entity_id]: { ...m[c.entity_id], state: turnOn ? 'off' : 'on' } })) }
    setBusy(null)
    setTimeout(load, 800)
  }

  const goodnight = async () => {
    setBusy('goodnight')
    for (const c of controls) {
      try { await haCall(c.domain, 'turn_off', c.entity_id) } catch { /* keep going */ }
    }
    setBusy(null)
    setTimeout(load, 800)
  }

  // group controls by room
  const rooms = {}
  for (const c of controls) (rooms[c.room] ||= []).push(c)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">house</span></div>
        <a href={HA_LINK} target="_blank" rel="noreferrer" className="tide-pill" style={{ marginLeft: 'auto', textDecoration: 'none' }}>open home assistant ↗</a>
      </div>
      <p className="tide-sub" style={{ marginTop: 6 }}>your corner of the house · everything else lives in HA</p>

      {temp && (
        <div className="tide-card" style={{ padding: 16, marginTop: 16, maxWidth: 240 }}>
          <Label>house temperature</Label>
          <div style={{ fontSize: 30, fontWeight: 800 }}>
            {Math.round(parseFloat(temp.state))}<span style={{ fontSize: 18, color: 'var(--tide-muted)' }}>°{temp.attributes?.unit_of_measurement?.replace('°', '') || 'C'}</span>
          </div>
        </div>
      )}

      {offline && (
        <div className="tide-card" style={{ padding: 16, marginTop: 16 }}>
          <EmptyHint>home assistant isn't answering right now.</EmptyHint>
        </div>
      )}

      {controls.length === 0 ? (
        <div className="tide-card" style={{ padding: 16, marginTop: 16, maxWidth: 480 }}>
          <EmptyHint>nothing's been shared with you yet. a grown-up can add your bedroom light to the house list.</EmptyHint>
        </div>
      ) : (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
          {Object.entries(rooms).map(([room, list]) => (
            <div key={room} className="tide-card" style={{ padding: 16 }}>
              <Label>{room.toLowerCase()}</Label>
              {list.map((c) => (
                <button key={c.entity_id} onClick={() => toggle(c)} disabled={busy === c.entity_id || offline}
                  style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', padding: '9px 0', background: 'none', border: 'none', cursor: offline ? 'default' : 'pointer', color: 'var(--tide-ink)', fontSize: 15, textAlign: 'left' }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: isOn(c) ? 'linear-gradient(135deg, rgba(240,140,90,0.22), rgba(217,109,143,0.22))' : 'var(--tide-hair)' }}>{c.icon}</span>
                  <span>{c.label}<br /><span className="tide-sub" style={{ fontSize: 12 }}>{isOn(c) ? 'on' : 'off'}</span></span>
                  <Toggle on={isOn(c)} />
                </button>
              ))}
            </div>
          ))}

          <button onClick={goodnight} disabled={busy === 'goodnight' || offline} className="tide-btn tide-btn-ghost" style={{ padding: '12px', fontSize: 15, alignSelf: 'flex-start' }}>
            🌙 goodnight — turn everything off
          </button>
        </div>
      )}
    </div>
  )
}
