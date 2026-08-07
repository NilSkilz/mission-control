import { useEffect, useState, useCallback } from 'react'
import { Label, EmptyHint } from './widgets'
import { getJournal, addJournalEntry, updateJournalEntry, deleteJournalEntry } from '../lib/data'

// 1 rough … 5 great. Colours run coral (low) -> green (high) to match Tide.
const MOODS = [
  { score: 1, label: 'rough', emoji: '😞', color: '#d96d8f' },
  { score: 2, label: 'low', emoji: '😕', color: '#d98a6d' },
  { score: 3, label: 'ok', emoji: '😐', color: '#c9a24b' },
  { score: 4, label: 'good', emoji: '🙂', color: '#7fae5f' },
  { score: 5, label: 'great', emoji: '😄', color: '#4fb477' },
]
const moodOf = (s) => MOODS.find((m) => m.score === Math.round(s)) || null
const RANGES = [7, 30, 90]

function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function dateStr(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Row of five mood faces. `value` is the selected score (or null).
function MoodPicker({ value, onPick, size = 46 }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {MOODS.map((m) => {
        const on = value === m.score
        return (
          <button
            key={m.score}
            type="button"
            onClick={() => onPick(on ? null : m.score)}
            title={m.label}
            aria-label={m.label}
            aria-pressed={on}
            style={{
              width: size, height: size, borderRadius: 12, cursor: 'pointer', fontSize: size * 0.5,
              lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? m.color : 'transparent',
              border: `1px solid ${on ? m.color : 'var(--tide-hair)'}`,
              filter: on ? 'none' : 'grayscale(0.5)', opacity: on ? 1 : 0.75,
              transition: 'all 160ms ease',
            }}
          >
            {m.emoji}
          </button>
        )
      })}
    </div>
  )
}

// Line chart of average daily mood across the range. Time runs left->right along
// the bottom; mood runs high (top) -> low (bottom) up the side. Nulls (no entry)
// are gaps; each logged day is a dot coloured by its mood. The viewBox keeps a
// fixed aspect and scales uniformly, so dots stay round (no horizontal stretch).
function MoodChart({ mood, range }) {
  const W = 640, H = 240, padL = 30, padR = 16, padT = 18, padB = 34
  const n = mood.length
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const x = (i) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v) => padT + (1 - (v - 1) / 4) * plotH // mood 1..5 -> bottom..top
  const pts = mood.map((d, i) => (d.avg != null ? { i, ...d, cx: x(i), cy: y(d.avg) } : null)).filter(Boolean)
  const line = pts.map((p) => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' ')
  const first = mood[0]?.date
  const last = mood[n - 1]?.date
  const fmt = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')

  return (
    <div>
      <Label>mood · last {range} days</Label>
      {pts.length === 0 ? (
        <EmptyHint>no mood logged in this window yet.</EmptyHint>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" preserveAspectRatio="xMidYMid meet" style={{ marginTop: 6, display: 'block', overflow: 'visible' }}>
            {/* vertical axis title: mood, high -> low */}
            <text x={13} y={padT} fontSize="11" fontWeight="600" fill="var(--tide-faint)" textAnchor="middle">high</text>
            <text x={13} y={H - padB + 2} fontSize="11" fontWeight="600" fill="var(--tide-faint)" textAnchor="middle">low</text>
            {/* gridlines at each mood level */}
            {[1, 2, 3, 4, 5].map((lvl) => (
              <line key={lvl} x1={padL} x2={W - padR} y1={y(lvl)} y2={y(lvl)} stroke="var(--tide-hair)" strokeWidth="1" opacity={lvl === 3 ? 0.6 : 0.28} />
            ))}
            {pts.length > 1 && (
              <polyline points={line} fill="none" stroke="var(--tide-accent-ink)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
            )}
            {pts.map((p) => (
              <circle key={p.i} cx={p.cx} cy={p.cy} r={pts.length > 40 ? 3 : 5} fill={moodOf(p.avg).color} stroke="var(--tide-bg, #fff)" strokeWidth="1.5">
                <title>{`${dateStr(p.date + 'T12:00:00')}: ${moodOf(p.avg).label} (${p.avg})`}</title>
              </circle>
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, paddingLeft: 44 }}>
            <span className="tide-sub" style={{ fontSize: 11 }}>{fmt(first)}</span>
            <span className="tide-sub" style={{ fontSize: 11 }}>{fmt(last)}</span>
          </div>
        </>
      )}
    </div>
  )
}

// Quick mood check-in: tap a face (optionally add a line), it logs straight away.
function MoodCheckIn({ onLog }) {
  const [score, setScore] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!score) return
    setBusy(true)
    await onLog({ mood: score, body: note.trim() || null })
    setScore(null); setNote(''); setBusy(false)
  }
  return (
    <div className="tide-card" style={{ padding: 16 }}>
      <Label>how are you right now?</Label>
      <div style={{ marginTop: 4 }}>
        <MoodPicker value={score} onPick={setScore} />
      </div>
      {score && (
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="tide-input" style={{ flex: 1, minWidth: 160 }} placeholder="a word on why (optional)" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <button className="tide-btn tide-btn-primary" style={{ padding: '9px 18px' }} disabled={busy} onClick={submit}>log</button>
        </div>
      )}
    </div>
  )
}

// Full journal entry: optional title, body, optional mood.
function WriteEntry({ onSave }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [mood, setMood] = useState(null)
  const [busy, setBusy] = useState(false)
  const reset = () => { setTitle(''); setBody(''); setMood(null); setOpen(false) }
  const submit = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    await onSave({ title: title.trim() || null, body: body.trim(), mood })
    setBusy(false); reset()
  }
  if (!open) {
    return (
      <button className="tide-btn tide-btn-primary" style={{ padding: '11px 18px', width: '100%' }} onClick={() => setOpen(true)}>
        ✍️ new journal entry
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="tide-card" style={{ padding: 16 }}>
      <Label>new entry</Label>
      <input className="tide-input" style={{ marginTop: 4 }} placeholder="title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="tide-input" style={{ marginTop: 10, minHeight: 140, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} placeholder="write it out…" value={body} onChange={(e) => setBody(e.target.value)} autoFocus />
      <div style={{ marginTop: 12 }}>
        <span className="tide-sub" style={{ fontSize: 12 }}>mood (optional)</span>
        <div style={{ marginTop: 6 }}><MoodPicker value={mood} onPick={setMood} size={40} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
        <button type="button" className="tide-btn tide-btn-ghost" style={{ padding: '9px 16px' }} onClick={reset}>cancel</button>
        <button className="tide-btn tide-btn-primary" style={{ padding: '9px 18px' }} disabled={busy || !body.trim()}>save</button>
      </div>
    </form>
  )
}

function EntryCard({ entry, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const m = entry.mood ? moodOf(entry.mood) : null
  const long = (entry.body || '').length > 280
  const shown = expanded || !long ? entry.body : entry.body.slice(0, 280) + '…'
  return (
    <div className="tide-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {m && <span title={m.label} style={{ fontSize: 20, lineHeight: 1 }}>{m.emoji}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          {entry.title && <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tide-ink)' }}>{entry.title}</div>}
          <div className="tide-sub" style={{ fontSize: 12 }}>{dateStr(entry.createdAt)} · {timeStr(entry.createdAt)}</div>
        </div>
        <button onClick={onDelete} title="delete" style={{ background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer', fontSize: 13 }}>✕</button>
      </div>
      {entry.body && (
        <div style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.55, color: 'var(--tide-ink)', whiteSpace: 'pre-wrap' }}>
          {shown}
          {long && (
            <button onClick={() => setExpanded((v) => !v)} className="tide-sub" style={{ display: 'block', marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--tide-accent-ink)', padding: 0 }}>
              {expanded ? 'show less' : 'read more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function TideJournal() {
  const [range, setRange] = useState(30)
  const [state, setState] = useState({ loading: true, entries: [], mood: [] })

  const reload = useCallback(async () => {
    const data = await getJournal(range)
    setState({ loading: false, entries: data.entries || [], mood: data.mood || [] })
  }, [range])
  useEffect(() => { reload() }, [reload])

  const logMood = async (entry) => { await addJournalEntry(entry); reload() }
  const saveEntry = async (entry) => { await addJournalEntry(entry); reload() }
  const removeEntry = async (id) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this entry? This can’t be undone.')) return
    await deleteJournalEntry(id); reload()
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">journal</span></div>
      <p className="tide-sub" style={{ marginTop: 6 }}>🔒 private to you · nobody else can see these, not even the other parent</p>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <MoodCheckIn onLog={logMood} />

        <div className="tide-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 4 }}>
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)} className="tide-btn tide-btn-ghost"
                style={{ padding: '5px 12px', fontSize: 13, color: r === range ? 'var(--tide-accent-ink)' : 'var(--tide-ink)', borderColor: r === range ? 'var(--tide-accent-ink)' : 'var(--tide-hair)' }}>
                {r}d
              </button>
            ))}
          </div>
          {state.loading ? <p className="tide-sub">loading…</p> : <MoodChart mood={state.mood} range={range} />}
        </div>

        <WriteEntry onSave={saveEntry} />

        <div>
          <Label>entries</Label>
          {state.loading ? (
            <p className="tide-sub" style={{ marginTop: 8 }}>loading…</p>
          ) : state.entries.length === 0 ? (
            <EmptyHint>nothing written yet. the blank page is yours.</EmptyHint>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {state.entries.map((e) => <EntryCard key={e.id} entry={e} onDelete={() => removeEntry(e.id)} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
