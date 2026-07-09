import { useEffect, useState, useCallback } from 'react'
import { useUser } from '../context/UserContext'
import { firstName } from './people'
import { Label, EmptyHint } from './widgets'
import { getLifts, addLift, respondToLift, cancelLift, getUsers } from '../lib/data'
import { getPushState, enablePush, disablePush } from '../lib/push'

const SLOT_MIN = 15   // 15-minute pickup slots
const LEAD_MIN = 30   // must be at least this far in the future

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 15-min slots across the day; for today, only those >= now + 30 min.
function buildSlots(dateStr) {
  const out = []
  const isToday = dateStr === todayStr()
  const earliest = new Date(Date.now() + LEAD_MIN * 60000)
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += SLOT_MIN) {
      const hhmm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      if (isToday && new Date(`${dateStr}T${hhmm}:00`) < earliest) continue
      out.push(hhmm)
    }
  }
  return out
}

function whenLabel(iso) {
  const d = new Date(iso)
  const t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const isToday = d.toDateString() === new Date().toDateString()
  const day = isToday ? 'today' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${day}, ${t}`
}

const STATUS = {
  accepted: { label: 'on its way ✓', color: 'var(--p-logan)' },
  denied: { label: 'not this time', color: 'var(--tide-faint)' },
  cancelled: { label: 'cancelled', color: 'var(--tide-faint)' },
}

export default function TideLifts() {
  const { user } = useUser()
  const isParent = user?.role === 'parent'
  const [lifts, setLifts] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [coords, setCoords] = useState(null)
  const [extras, setExtras] = useState('')
  const [note, setNote] = useState('')
  const [gps, setGps] = useState('')        // '' | 'locating' | 'ok' | 'error'
  const [error, setError] = useState('')
  const [respNotes, setRespNotes] = useState({}) // per-request parent note
  const [pushState, setPushState] = useState('unsupported') // unsupported|denied|on|off|working
  const [pushErr, setPushErr] = useState('')

  const reload = useCallback(async () => setLifts(await getLifts()), [])
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))
  const slots = buildSlots(date)

  useEffect(() => {
    let alive = true
    Promise.all([getLifts(), getUsers()]).then(([l, u]) => {
      if (!alive) return
      setLifts(l); setUsers(u); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => { getPushState().then(setPushState) }, [])

  // If the day changes and the chosen time is no longer offered, clear it.
  useEffect(() => {
    if (time && !slots.includes(time)) setTime('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setGps('error'); return }
    setGps('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        if (!location.trim()) setLocation('Current location')
        setGps('ok')
      },
      () => setGps('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!date || !time || !location.trim()) { setError('Pick a day, a time, and where to pick you up.'); return }
    const dateTime = new Date(`${date}T${time}:00`).toISOString()
    try {
      await addLift({
        createdBy: user.id, dateTime, location: location.trim(),
        lat: coords?.lat ?? null, lng: coords?.lng ?? null,
        extras: extras.trim() || null, note: note.trim() || null,
      })
      setTime(''); setLocation(''); setCoords(null); setExtras(''); setNote(''); setGps('')
      reload()
    } catch (err) {
      setError(err.message || 'Could not send that — try again.')
    }
  }

  // On a 409 (someone got there first) just reload — the list shows the real state.
  const respond = async (r, decision) => {
    try { await respondToLift(r.id, decision, user.id, respNotes[r.id]) } finally { reload() }
  }
  const cancel = async (r) => { try { await cancelLift(r.id, user.id) } finally { reload() } }

  const togglePush = async () => {
    setPushErr('')
    const prev = pushState
    setPushState('working')
    try { setPushState(prev === 'on' ? await disablePush() : await enablePush()) }
    catch (e) { setPushState(prev); setPushErr(e.message) }
  }

  const open = lifts.filter((l) => l.status === 'open').sort((a, b) => a.dateTime.localeCompare(b.dateTime))
  const done = lifts.filter((l) => l.status !== 'open').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))

  return (
    <div>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">lifts</span></div>
      <p className="tide-sub" style={{ marginTop: 6 }}>ask for a lift, a grown-up picks it up</p>

      {pushState !== 'unsupported' && (
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={togglePush} className="tide-btn tide-btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} disabled={pushState === 'working' || pushState === 'denied'}>
            {pushState === 'on' ? '🔔 alerts on — tap to turn off'
              : pushState === 'denied' ? '🔕 alerts blocked in browser'
              : pushState === 'working' ? '…'
              : '🔔 turn on lift alerts'}
          </button>
          {pushErr && <span className="tide-sub" style={{ fontSize: 12, marginLeft: 10 }}>{pushErr}</span>}
        </div>
      )}

      {loading ? (
        <p className="tide-sub" style={{ marginTop: 18 }}>loading…</p>
      ) : (
        <>
          {/* request form */}
          <div style={{ marginTop: 20, maxWidth: 560 }}>
            <Label>ask for a lift</Label>
            <form onSubmit={submit} className="tide-card" style={{ padding: 14, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="tide-lbl">day</span>
                  <input type="date" className="tide-input" style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }} min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="tide-lbl">time</span>
                  <select className="tide-input" style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }} value={time} onChange={(e) => setTime(e.target.value)}>
                    <option value="">pick…</option>
                    {slots.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              {slots.length === 0 && <p className="tide-sub" style={{ fontSize: 12, margin: 0 }}>no slots left today — pick another day.</p>}

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="tide-lbl">pick up from</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="tide-input" style={{ flex: 1 }} placeholder="where are you?" value={location} onChange={(e) => setLocation(e.target.value)} />
                  <button type="button" onClick={useCurrentLocation} className="tide-btn tide-btn-ghost" style={{ padding: '0 12px', whiteSpace: 'nowrap' }}>📍 here</button>
                </div>
                {gps === 'locating' && <span className="tide-sub" style={{ fontSize: 12 }}>finding you…</span>}
                {gps === 'ok' && <span className="tide-sub" style={{ fontSize: 12 }}>📍 location added</span>}
                {gps === 'error' && <span className="tide-sub" style={{ fontSize: 12 }}>couldn’t get location — type it instead</span>}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="tide-lbl">anything else?</span>
                <input className="tide-input" placeholder="e.g. bike rack" value={extras} onChange={(e) => setExtras(e.target.value)} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="tide-lbl">note (optional)</span>
                <input className="tide-input" placeholder="e.g. by the side gate" value={note} onChange={(e) => setNote(e.target.value)} />
              </label>

              {error && <p style={{ color: 'var(--p-aimee, #C25E7E)', fontSize: 13, margin: 0 }}>{error}</p>}
              <button className="tide-btn tide-btn-primary" style={{ padding: '10px 18px', alignSelf: 'flex-start' }} disabled={!date || !time || !location.trim()}>ask for a lift</button>
            </form>
          </div>

          {/* open requests */}
          <div style={{ marginTop: 24, maxWidth: 560 }}>
            <Label>{isParent ? 'who needs a lift' : 'waiting for a grown-up'}</Label>
            {open.length === 0 ? (
              <EmptyHint>no lift requests right now.</EmptyHint>
            ) : open.map((r) => {
              const who = userById[r.createdBy]
              const mine = r.createdBy === user.id
              return (
                <div key={r.id} className="tide-card" style={{ padding: 14, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700 }}>{who ? firstName(who) : 'someone'}</span>
                    <span className="tide-sub">{whenLabel(r.dateTime)}</span>
                  </div>
                  <div style={{ marginTop: 4 }}>📍 {r.location}
                    {(r.lat != null && r.lng != null) && (
                      <a href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer" className="tide-sub" style={{ marginLeft: 8, fontSize: 12 }}>map ↗</a>
                    )}
                  </div>
                  {r.extras && <div className="tide-sub" style={{ marginTop: 2 }}>needs: {r.extras}</div>}
                  {r.note && <div className="tide-sub" style={{ marginTop: 2 }}>“{r.note}”</div>}

                  {isParent && !mine && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input className="tide-input" placeholder="add a note (optional)" value={respNotes[r.id] || ''} onChange={(e) => setRespNotes((n) => ({ ...n, [r.id]: e.target.value }))} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => respond(r, 'accepted')} className="tide-btn tide-btn-primary" style={{ padding: '8px 16px' }}>I’ll take it</button>
                        <button onClick={() => respond(r, 'denied')} className="tide-btn tide-btn-ghost" style={{ padding: '8px 14px' }}>can’t</button>
                      </div>
                    </div>
                  )}
                  {mine && (
                    <button onClick={() => cancel(r)} className="tide-btn tide-btn-ghost" style={{ marginTop: 10, padding: '6px 12px', fontSize: 13 }}>cancel</button>
                  )}
                  {!isParent && !mine && <div className="tide-sub" style={{ marginTop: 8, fontSize: 12 }}>⏳ waiting for a grown-up</div>}
                </div>
              )
            })}
          </div>

          {/* resolved */}
          {done.length > 0 && (
            <div style={{ marginTop: 24, maxWidth: 560 }}>
              <Label>recent</Label>
              {done.slice(0, 12).map((r) => {
                const who = userById[r.createdBy]
                const by = userById[r.respondedBy]
                const st = STATUS[r.status] || { label: r.status, color: 'var(--tide-faint)' }
                return (
                  <div key={r.id} className="tide-card" style={{ padding: '10px 14px', marginTop: 8, opacity: r.status === 'accepted' ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700 }}>{who ? firstName(who) : 'someone'}</span>
                      <span className="tide-sub" style={{ fontSize: 12 }}>{whenLabel(r.dateTime)} · {r.location}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 13, color: st.color }}>{st.label}</span>
                    </div>
                    {r.status === 'accepted' && by && <div className="tide-sub" style={{ fontSize: 12, marginTop: 2 }}>{firstName(by)} is driving{r.responseNote ? ` — “${r.responseNote}”` : ''}</div>}
                    {r.status === 'denied' && r.responseNote && <div className="tide-sub" style={{ fontSize: 12, marginTop: 2 }}>“{r.responseNote}”</div>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
