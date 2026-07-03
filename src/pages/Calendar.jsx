import { useEffect, useState, useCallback } from 'react'
import { useTideTheme } from '../tide/TideThemeProvider'
import { Label, Pip, EmptyHint } from '../tide/widgets'
import { getCalendarEvents } from '../lib/data'

const DAY_MS = 86400000
const iso = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS)

// Monday of the week containing d
function weekStart(d) {
  const x = new Date(d)
  const dow = (x.getDay() + 6) % 7 // 0 = Mon
  x.setHours(0, 0, 0, 0)
  return addDays(x, -dow)
}

function fmtDay(d, opts = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return d.toLocaleDateString('en-GB', opts).toLowerCase()
}

function EventLine({ e }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '4px 0', fontSize: 14 }}>
      <span className="tide-mono" style={{ fontSize: 12, minWidth: 38, color: 'var(--tide-muted)' }}>{e.allDay ? '·' : e.time}</span>
      <Pip person={e.person} />
      <span style={{ opacity: 0.92 }}>{e.summary}{e.location ? <span className="tide-sub" style={{ fontSize: 12 }}> · {e.location}</span> : null}</span>
    </div>
  )
}

function NowLineIf({ show }) {
  return show ? <div className="tide-nowline" /> : null
}

export default function CalendarPage() {
  const { now } = useTideTheme()
  const [view, setView] = useState('day')
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })
  const [state, setState] = useState({ loading: true, events: [], configured: true })

  const start = view === 'week' ? weekStart(anchor) : anchor
  const days = view === 'week' ? 7 : 1

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    const res = await getCalendarEvents({ date: iso(start), days })
    setState({ loading: false, events: res.events || [], configured: res.configured !== false })
  }, [iso(start), days]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const step = (dir) => setAnchor((d) => addDays(d, dir * (view === 'week' ? 7 : 1)))
  const goToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setAnchor(d) }

  const nm = now.getHours() * 60 + now.getMinutes()
  const todayIso = iso(now)

  const byDay = {}
  for (const e of state.events) (byDay[e.date] ||= []).push(e)

  const rangeLabel = view === 'week'
    ? `${fmtDay(start, { day: 'numeric', month: 'short' })} – ${fmtDay(addDays(start, 6), { day: 'numeric', month: 'short' })}`
    : fmtDay(anchor)

  return (
    <div>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">calendar</span></div>
      <p className="tide-sub" style={{ marginTop: 6 }}>{rangeLabel}</p>

      {/* controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--tide-card)', border: '1px solid var(--tide-card-border)', borderRadius: 999, padding: 3 }}>
          {['day', 'week'].map((v) => (
            <button key={v} onClick={() => setView(v)} className="tide-btn" style={{
              padding: '5px 14px', fontSize: 13,
              background: view === v ? 'var(--tide-grad-135)' : 'transparent',
              color: view === v ? '#fff' : 'var(--tide-muted)',
            }}>{v}</button>
          ))}
        </div>
        <button onClick={() => step(-1)} className="tide-btn tide-btn-ghost" style={{ padding: '6px 12px' }}>‹</button>
        <button onClick={goToday} className="tide-btn tide-btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }}>today</button>
        <button onClick={() => step(1)} className="tide-btn tide-btn-ghost" style={{ padding: '6px 12px' }}>›</button>
      </div>

      {!state.configured && (
        <div className="tide-card" style={{ padding: 16, marginTop: 16 }}>
          <EmptyHint>the family calendar isn't connected on this server yet (needs CALENDAR_ICS_URL).</EmptyHint>
        </div>
      )}

      {state.loading ? (
        <p className="tide-sub" style={{ marginTop: 18 }}>loading…</p>
      ) : view === 'day' ? (
        <div className="tide-card" style={{ padding: 16, marginTop: 16, maxWidth: 620 }}>
          <Label>{fmtDay(anchor, { weekday: 'long' })}</Label>
          {(byDay[iso(anchor)] || []).length === 0 && <EmptyHint>nothing on.</EmptyHint>}
          {(() => {
            const evs = byDay[iso(anchor)] || []
            const timed = evs.filter((e) => !e.allDay)
            const rows = []
            evs.filter((e) => e.allDay).forEach((e, i) => rows.push(<EventLine key={`a${i}`} e={e} />))
            const isToday = iso(anchor) === todayIso
            let placed = false
            timed.forEach((e, i) => {
              if (isToday && !placed && e.sortKey >= nm) { rows.push(<NowLineIf key="n" show />); placed = true }
              rows.push(<EventLine key={`t${i}`} e={e} />)
            })
            if (isToday && !placed && timed.length > 0) rows.push(<NowLineIf key="n" show />)
            return rows
          })()}
        </div>
      ) : (
        <div className="tide-week" style={{ marginTop: 16 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(start, i)
            const key = iso(d)
            const evs = byDay[key] || []
            const isToday = key === todayIso
            return (
              <div key={key} className="tide-card" style={{ padding: 12, outline: isToday ? '1.5px solid var(--tide-accent-ink)' : 'none' }}>
                <div className="tide-lbl" style={{ marginBottom: 8, color: isToday ? 'var(--tide-accent-ink)' : undefined }}>
                  {d.toLocaleDateString('en-GB', { weekday: 'short' }).toLowerCase()} {d.getDate()}
                </div>
                {evs.length === 0 && <div className="tide-sub" style={{ fontSize: 12 }}>—</div>}
                {evs.map((e, j) => (
                  <div key={j} style={{ display: 'flex', gap: 6, alignItems: 'baseline', padding: '3px 0', fontSize: 12.5 }}>
                    <Pip person={e.person} size={7} />
                    <span style={{ minWidth: 0 }}>
                      {!e.allDay && <span className="tide-mono" style={{ fontSize: 11, color: 'var(--tide-muted)' }}>{e.time} </span>}
                      {e.summary}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
