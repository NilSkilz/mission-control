// Minimal ICS reader for the family's published iCloud calendar.
// Ported from Jarvis/bin/calendar_ics.py (the parser already proven against the
// real calendar): handles single events + the recurrence actually present
// (YEARLY birthdays, WEEKLY[/BYDAY][/UNTIL], basic MONTHLY/DAILY). Read-only.
//
// Events are lightly person-tagged by name match so the Tide UI can colour the
// pips (dexter/logan/aimee/rob), defaulting to "everyone".

import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 900 }) // 15 min
const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] // JS getDay(): 0=Sun

// name -> canonical username, for pip colouring
const NAME_ALIASES = {
  dexter: 'dexter', dex: 'dexter',
  logan: 'logan', logie: 'logan',
  aimee: 'aimee', mum: 'aimee', mummy: 'aimee', mam: 'aimee',
  rob: 'rob', dad: 'rob', daddy: 'rob',
}

function unfold(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const out = []
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) {
      out[out.length - 1] += line.slice(1)
    } else {
      out.push(line)
    }
  }
  return out
}

// Returns { y, m, d, hh, mm, allDay }
function parseDt(value, params) {
  value = value.trim()
  const dateOnly = params.VALUE === 'DATE' || (value.length === 8 && !value.includes('T'))
  if (dateOnly) {
    return { y: +value.slice(0, 4), m: +value.slice(4, 6), d: +value.slice(6, 8), hh: 0, mm: 0, allDay: true }
  }
  value = value.replace(/Z$/, '')
  return {
    y: +value.slice(0, 4), m: +value.slice(4, 6), d: +value.slice(6, 8),
    hh: +value.slice(9, 11), mm: +value.slice(11, 13), allDay: false,
  }
}

function parsePropLine(line) {
  const idx = line.indexOf(':')
  if (idx === -1) return { name: null }
  const head = line.slice(0, idx)
  const value = line.slice(idx + 1)
  const parts = head.split(';')
  const params = {}
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=')
    if (eq !== -1) params[p.slice(0, eq)] = p.slice(eq + 1)
  }
  return { name: parts[0], params, value }
}

function parseRrule(value) {
  const rule = {}
  for (const part of value.split(';')) {
    const eq = part.indexOf('=')
    if (eq !== -1) rule[part.slice(0, eq)] = part.slice(eq + 1)
  }
  return rule
}

export function parseEvents(text) {
  const events = []
  let cur = null
  let inEvent = false
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; cur = { exdate: [] }; continue }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); inEvent = false; cur = null; continue }
    if (!inEvent) continue
    const { name, params, value } = parsePropLine(line)
    if (!name) continue
    if (name === 'DTSTART') cur.dtstart = parseDt(value, params)
    else if (name === 'DTEND') cur.dtend = parseDt(value, params)
    else if (name === 'SUMMARY') cur.summary = value.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/gi, ' ').trim()
    else if (name === 'LOCATION') cur.location = value.replace(/\\,/g, ',').trim()
    else if (name === 'RRULE') cur.rrule = parseRrule(value)
    else if (name === 'EXDATE') { try { cur.exdate.push(dateKey(parseDt(value, params))) } catch { /* skip */ } }
    else if (name === 'UID') cur.uid = value
  }
  return events
}

// midnight-anchored day number for date maths, and a YYYY-MM-DD key
const dayNum = (p) => Math.floor(Date.UTC(p.y, p.m - 1, p.d) / 86400000)
const dateKey = (p) => `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
const weekdayOf = (p) => (new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() + 6) % 7 // 0=Mon

function occursOn(ev, target) {
  const start = ev.dtstart
  if (!start) return false
  if (ev.exdate.includes(dateKey(target))) return false

  const startN = dayNum(start)
  const targetN = dayNum(target)
  const rrule = ev.rrule

  if (!rrule) {
    if (ev.allDay || start.allDay) {
      const endN = ev.dtend ? dayNum(ev.dtend) : startN + 1
      const span = Math.max(endN - startN, 1)
      return targetN >= startN && targetN < startN + span
    }
    return startN === targetN
  }

  if (targetN < startN) return false
  const interval = parseInt(rrule.INTERVAL || '1', 10)
  if (rrule.UNTIL) {
    try {
      const untilN = dayNum(parseDt(rrule.UNTIL, {}))
      if (targetN > untilN) return false
    } catch { /* ignore malformed UNTIL */ }
  }

  switch (rrule.FREQ) {
    case 'YEARLY':
      if (target.m !== start.m || target.d !== start.d) return false
      return (target.y - start.y) % interval === 0
    case 'WEEKLY': {
      if (rrule.BYDAY) {
        const codes = rrule.BYDAY.split(',').map((c) => c.slice(-2))
        if (!codes.includes(WEEKDAY_CODES[weekdayOf(target)])) return false
      } else if (weekdayOf(target) !== weekdayOf(start)) return false
      return Math.floor((targetN - startN) / 7) % interval === 0
    }
    case 'MONTHLY': {
      if (target.d !== start.d) return false
      const months = (target.y - start.y) * 12 + (target.m - start.m)
      return months >= 0 && months % interval === 0
    }
    case 'DAILY':
      return (targetN - startN) % interval === 0
    default:
      return false
  }
}

function tagPerson(summary = '') {
  const words = summary.toLowerCase().match(/[a-z']+/g) || []
  for (const w of words) if (NAME_ALIASES[w]) return NAME_ALIASES[w]
  return null // everyone
}

async function fetchIcs(url) {
  const cached = cache.get('ics')
  if (cached) return cached
  const res = await fetch(url, { headers: { 'User-Agent': 'stokeshq-calendar/1.0' } })
  if (!res.ok) throw new Error(`ICS fetch failed: HTTP ${res.status}`)
  const text = await res.text()
  cache.set('ics', text)
  return text
}

/**
 * Events for a run of days starting at `startDate` (a YYYY-MM-DD string).
 * Returns [{ date, time, allDay, summary, location, person, sortKey }] sorted
 * within each day (all-day first, then by time).
 */
export async function getEvents({ url, startDate, days = 1 } = {}) {
  if (!url) throw new Error('CALENDAR_ICS_URL not configured')
  const text = await fetchIcs(url)
  const events = parseEvents(text)

  const [sy, sm, sd] = startDate.split('-').map(Number)
  const out = []
  for (let i = 0; i < days; i++) {
    const base = new Date(Date.UTC(sy, sm - 1, sd + i))
    const target = { y: base.getUTCFullYear(), m: base.getUTCMonth() + 1, d: base.getUTCDate() }
    const key = dateKey(target)
    const dayEvents = []
    for (const ev of events) {
      if (!ev.summary) continue
      try {
        if (occursOn(ev, target)) {
          const allDay = !!(ev.allDay || ev.dtstart.allDay)
          const time = allDay ? null : `${String(ev.dtstart.hh).padStart(2, '0')}:${String(ev.dtstart.mm).padStart(2, '0')}`
          dayEvents.push({
            date: key,
            time,
            allDay,
            summary: ev.summary,
            location: ev.location || null,
            person: tagPerson(ev.summary),
            sortKey: allDay ? -1 : ev.dtstart.hh * 60 + ev.dtstart.mm,
          })
        }
      } catch { /* skip malformed */ }
    }
    dayEvents.sort((a, b) => a.sortKey - b.sortKey)
    out.push(...dayEvents)
  }
  return out
}
