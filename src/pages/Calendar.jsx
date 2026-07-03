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
// Monday on/before the 1st of d's month (top-left of the month grid)
function monthGridStart(d) {
  return weekStart(new Date(d.getFullYear(), d.getMonth(), 1))
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

export default function CalendarPage() {
  const { now } = useTideTheme()
  const [view, setView] = useState('week')
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })
  const [state, setState] = useState({ loading: true, events: [], configured: true })

  const start = view === 'month' ? monthGridStart(anchor) : view === 'week' ? weekStart(anchor) : anchor
  const days = view === 'month' ? 42 : view === 'week' ? 7 : 1

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    const res = await getCalendarEvents({ date: iso(start), days })
    setState({ loading: false, events: res.events || [], configured: res.configured !== false })
  }, [iso(start), days]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const step = (dir) => setAnchor((d) => {
    if (view === 'month') return new Date(d.getFullYear(), d.getMonth() + dir, Math.min(d.getDate(), 28))
    return addDays(d, dir * (view === 'week' ? 7 : 1))
  })
  const goToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setAnchor(d) }
  const openDay = (d) => { setAnchor(d); setView('day') }

  const nm = now.getHours() * 60 + now.getMinutes()
  const todayIso = iso(now)
  const byDay = {}
  for (const e of state.events) (byDay[e.date] ||= []).push(e)

  const rangeLabel = view === 'month'
    ? anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toLowerCase()
    : view === 'week'
      ? `${fmtDay(weekStart(anchor), { day: 'numeric', month: 'short' })} – ${fmtDay(addDays(weekStart(anchor), 6), { day: 'numeric', month: 'short' })}`
      : fmtDay(anchor)

  return (
    <div>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">calendar</span></div>
      <p className="tide-sub" style={{ marginTop: 6 }}>{rangeLabel}</p>

      {/* controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--tide-card)', border: '1px solid var(--tide-card-border)', borderRadius: 999, padding: 3 }}>
          {['day', 'week', 'month'].map((v) => (
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

      {!state.configured && <div style={{ marginTop: 16 }}><EmptyHint>the family calendar isn't connected on this server yet (needs CALENDAR_ICS_URL).</EmptyHint></div>}

      {state.loading ? (
        <p className="tide-sub" style={{ marginTop: 18 }}>loading…</p>
      ) : view === 'day' ? (
        <div style={{ marginTop: 18 }}>
          <Label>{fmtDay(anchor, { weekday: 'long' })}</Label>
          {(() => {
            const evs = byDay[iso(anchor)] || []
            if (evs.length === 0) return <EmptyHint>nothing on.</EmptyHint>
            const timed = evs.filter((e) => !e.allDay)
            const rows = []
            evs.filter((e) => e.allDay).forEach((e, i) => rows.push(<EventLine key={`a${i}`} e={e} />))
            const isToday = iso(anchor) === todayIso
            let placed = false
            timed.forEach((e, i) => {
              if (isToday && !placed && e.sortKey >= nm) { rows.push(<div key="now" className="tide-nowline" />); placed = true }
              rows.push(<EventLine key={`t${i}`} e={e} />)
            })
            if (isToday && !placed && timed.length > 0) rows.push(<div key="now" className="tide-nowline" />)
            return rows
          })()}
        </div>
      ) : view === 'week' ? (
        <div className="tide-week-cols" style={{ marginTop: 18 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart(anchor), i)
            const key = iso(d)
            const evs = byDay[key] || []
            const isToday = key === todayIso
            return (
              <button key={key} onClick={() => openDay(d)} className="tide-daycol" style={{ borderTop: `2px solid ${isToday ? 'var(--tide-accent-ink)' : 'var(--tide-hair)'}` }}>
                <div className="tide-lbl" style={{ marginBottom: 8, color: isToday ? 'var(--tide-accent-ink)' : undefined }}>
                  {d.toLocaleDateString('en-GB', { weekday: 'short' }).toLowerCase()} {d.getDate()}
                </div>
                {evs.length === 0 && <div className="tide-sub" style={{ fontSize: 12 }}>—</div>}
                {evs.map((e, j) => (
                  <div key={j} style={{ display: 'flex', gap: 6, alignItems: 'baseline', padding: '3px 0', fontSize: 12.5 }}>
                    <Pip person={e.person} size={7} />
                    <span style={{ minWidth: 0 }}>{!e.allDay && <span className="tide-mono" style={{ fontSize: 11, color: 'var(--tide-muted)' }}>{e.time} </span>}{e.summary}</span>
                  </div>
                ))}
              </button>
            )
          })}
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <div className="tide-month-head">
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => <div key={d} className="tide-lbl" style={{ textAlign: 'center' }}>{d}</div>)}
          </div>
          <div className="tide-month-grid">
            {Array.from({ length: 42 }, (_, i) => {
              const d = addDays(monthGridStart(anchor), i)
              const key = iso(d)
              const evs = byDay[key] || []
              const inMonth = d.getMonth() === anchor.getMonth()
              const isToday = key === todayIso
              return (
                <button key={key} onClick={() => openDay(d)} className="tide-monthcell" style={{ opacity: inMonth ? 1 : 0.35 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? '#fff' : 'var(--tide-ink)', background: isToday ? 'var(--tide-grad-135)' : 'transparent', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    {d.getDate()}
                  </div>
                  {evs.slice(0, 3).map((e, j) => (
                    <div key={j} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 10.5, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      <Pip person={e.person} size={6} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.allDay ? e.summary : e.summary}</span>
                    </div>
                  ))}
                  {evs.length > 3 && <div className="tide-sub" style={{ fontSize: 10 }}>+{evs.length - 3} more</div>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
