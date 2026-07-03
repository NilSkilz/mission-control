import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useTideTheme } from './TideThemeProvider'
import { firstName, personColor } from './people'
import { Label, Ring, EmptyHint, Pip, formatGBP } from './widgets'
import {
  getUsers, getChores, getChoreCompletions, getNotes, getMeals,
  getCalendarEvents, getToday, getTodayCompletion,
} from '../lib/data'

const MEAL_EMOJI = { fajitas: '🌮', pizza: '🍕', pasta: '🍝', curry: '🍛', roast: '🍗', fish: '🐟' }
function mealEmoji(name = '') {
  const key = Object.keys(MEAL_EMOJI).find((k) => name.toLowerCase().includes(k))
  return key ? MEAL_EMOJI[key] : '🍽️'
}

// current time as minutes-from-midnight, for placing the NOW line in the rail
function nowMinutes(now) {
  return now.getHours() * 60 + now.getMinutes()
}

const DAY_MS = 86400000
function to12h(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const ap = h < 12 ? 'am' : 'pm'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}${ap}`
}
function agendaLabel(dateStr, todayStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const tomorrow = new Date(Date.now() + DAY_MS).toISOString().slice(0, 10)
  if (dateStr === todayStr) return 'today'
  if (dateStr === tomorrow) return 'tomorrow'
  return dt.toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase()
}

// DAKboard-style agenda (compact): big thin day numbers, a rule, then event
// rows with a person-coloured bar. Skips empty days; shows the next few that
// have something on.
function WeekAgenda({ events, today }) {
  const byDay = {}
  for (const e of events) (byDay[e.date] ||= []).push(e)
  const dates = Object.keys(byDay).sort().slice(0, 6)
  if (dates.length === 0) return <EmptyHint>nothing coming up.</EmptyHint>

  return (
    <div className="tide-agenda sm">
      {dates.map((key) => {
        const dd = Number(key.split('-')[2])
        return (
          <div key={key} className="tide-agenda-day">
            <div className="tide-agenda-head">
              <span className="tide-agenda-num">{String(dd).padStart(2, '0')}</span>
              <span className="tide-agenda-label">{agendaLabel(key, today)}</span>
            </div>
            <hr className="tide-agenda-rule" />
            {byDay[key].map((e, i) => (
              <div key={i} className="tide-agenda-ev">
                <span className="tide-agenda-bar" style={{ background: personColor(e.person) }} />
                <span className="tide-agenda-time">{e.allDay ? 'all day' : to12h(e.time)}</span>
                <span className="tide-agenda-title">{e.summary}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function TideHome() {
  const { user } = useUser()
  const { greeting, now } = useTideTheme()
  const [state, setState] = useState({ loading: true })

  const isParent = user?.role === 'parent'

  useEffect(() => {
    let alive = true
    async function load() {
      const today = getToday()
      const [users, chores, completions, notes, meals, cal] = await Promise.all([
        getUsers(), getChores(), getChoreCompletions(), getNotes(),
        getMeals(), getCalendarEvents({ days: 30 }),
      ])
      if (!alive) return
      setState({ loading: false, users, chores, completions, notes, meals, today, events: cal.events || [] })
    }
    load()
    return () => { alive = false }
  }, [])

  if (state.loading) {
    return <p className="tide-sub" style={{ paddingTop: 20 }}>loading…</p>
  }

  const { users, chores, completions, notes, meals, today, events } = state
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))

  // chores in scope: whole family for parents, just yours for a child
  const scopedChores = isParent ? chores : chores.filter((c) => c.assignedTo === user.id)
  const choreRows = scopedChores.map((c) => {
    const completion = getTodayCompletion(completions, c.id)
    return {
      ...c,
      done: !!completion,
      approved: completion?.approved,
      person: userById[c.assignedTo],
    }
  })
  const doneCount = choreRows.filter((r) => r.done).length
  const upForGrabs = choreRows.filter((r) => !r.done && r.paid).reduce((s, r) => s + (r.amount || 0), 0)

  // dinner for today
  const dinner = meals.find((m) => m.date === today && (m.mealType || '').toLowerCase() === 'dinner')

  // notes for this viewer: to everyone, to them, or written by them. freshest first.
  const freshNotes = notes
    .filter((n) => !n.targetUserId || n.targetUserId === user.id || n.authorId === user.id)
    .sort((a, b) => (b.pinned - a.pinned) || (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 3)

  // headline for the greeting sub-line
  const nextEvent = events.find((e) => !e.allDay && e.sortKey >= nowMinutes(now))
  const bits = [
    now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }).toLowerCase(),
    dinner ? `dinner: ${dinner.meal}` : null,
    nextEvent ? `next: ${nextEvent.summary} ${nextEvent.time}` : null,
  ].filter(Boolean)

  const greetName = isParent ? 'stokes family' : firstName(user).toLowerCase()

  return (
    <div style={{ paddingTop: 6 }}>
      {/* greeting */}
      <div className="tide-greet" style={{ fontSize: 'clamp(26px, 5vw, 34px)' }}>
        {greeting},<br /><span className="tide-grad">{greetName}</span>
      </div>
      <p className="tide-sub" style={{ marginTop: 6 }}>{bits.join(' · ')}</p>

      {/* three-column rhythm on desktop, stacked on phone */}
      <div className="tide-home-grid">
        {/* week agenda — borderless, fills the left column */}
        <div className="tide-week-agenda">
          <Label style={{ marginBottom: 14 }}>coming up</Label>
          <WeekAgenda events={events} today={today} />
          <Link to="/calendar" className="tide-sub" style={{ fontSize: 12, display: 'inline-block', marginTop: 10 }}>full calendar →</Link>
        </div>

        {/* chores */}
        <div className="tide-card" style={{ padding: 16 }}>
          <Label>chores{isParent ? '' : ' · yours'}</Label>
          {choreRows.length === 0 ? (
            <EmptyHint>no chores yet. {isParent && <Link to="/chores" className="tide-grad" style={{ fontWeight: 700 }}>set some up →</Link>}</EmptyHint>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Ring done={doneCount} total={choreRows.length} />
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <b>{doneCount} of {choreRows.length} done</b><br />
                  <span className="tide-sub">{formatGBP(upForGrabs)} up for grabs</span>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                {choreRows.slice(0, 5).map((r) => (
                  <div key={r.id} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '4px 0', fontSize: 14, opacity: r.done ? 0.5 : 1 }}>
                    <span style={{
                      width: 15, height: 15, borderRadius: 5, flex: 'none',
                      border: r.done ? 'none' : '1.6px solid var(--tide-accent-ink)',
                      background: r.done ? 'var(--tide-grad-135)' : 'transparent',
                    }} />
                    <span style={{ textDecoration: r.done ? 'line-through' : 'none' }}>{r.title}</span>
                    {isParent && r.person && <span style={{ marginLeft: 6, display: 'inline-flex', gap: 5, alignItems: 'center' }}><Pip person={r.person} size={7} /><span className="tide-sub" style={{ fontSize: 12 }}>{firstName(r.person).toLowerCase()}</span></span>}
                    {r.paid && !r.done && <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--tide-accent-ink)' }}>+{formatGBP(r.amount)}</span>}
                    {r.done && r.approved && <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--p-logan)' }}>approved ✓</span>}
                    {r.done && !r.approved && <span style={{ marginLeft: 'auto', fontSize: 12 }}>⏳</span>}
                  </div>
                ))}
              </div>
              <Link to="/chores" className="tide-sub" style={{ fontSize: 12, display: 'inline-block', marginTop: 8 }}>open chores →</Link>
            </>
          )}
        </div>

        {/* right column: notes + dinner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="tide-card" style={{ padding: 16 }}>
            <Label>notice board</Label>
            {freshNotes.length === 0 ? (
              <EmptyHint>no notes right now.</EmptyHint>
            ) : (
              freshNotes.map((n) => {
                const author = userById[n.authorId]
                return (
                  <div key={n.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{n.body}</div>
                    <div className="tide-sub" style={{ fontSize: 11, marginTop: 3 }}>
                      {author ? firstName(author).toLowerCase() : ''}
                      {n.expiresAt ? ' · expires ' + new Date(n.expiresAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                )
              })
            )}
            <Link to="/notes" className="tide-sub" style={{ fontSize: 12 }}>all notes →</Link>
          </div>

          <div className="tide-card" style={{ padding: 16 }}>
            <Label>dinner</Label>
            {dinner ? (
              <div style={{ fontSize: 15 }}>{dinner.meal} <span style={{ fontSize: 18 }}>{mealEmoji(dinner.meal)}</span></div>
            ) : (
              <EmptyHint>not planned yet. <Link to="/meals" className="tide-grad" style={{ fontWeight: 700 }}>pick something →</Link></EmptyHint>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
