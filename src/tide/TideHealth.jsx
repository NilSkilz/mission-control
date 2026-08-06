import { useEffect, useState, useCallback } from 'react'
import { useUser } from '../context/UserContext'
import { Label, Ring, EmptyHint } from './widgets'
import {
  getHealthDay, addFood, addExercise, deleteFood, deleteExercise, setCalorieTarget,
} from '../lib/data'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const UNDER = '#5fae7f' // calm green: net within target
const OVER = 'var(--tide-accent-ink)' // coral: over target
const STEPS = '#4fb477' // green: steps ring around the calorie dial

function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// Concentric green ring showing steps against the daily goal. Sits outside the
// calorie ring so both read as one dial.
function StepsRing({ steps, goal, size, stroke }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const frac = goal > 0 ? Math.min(steps / goal, 1) : 0
  const mid = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--tide-hair)" strokeWidth={stroke} />
      <circle
        cx={mid} cy={mid} r={r} fill="none" stroke={STEPS} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`} transform={`rotate(-90 ${mid} ${mid})`}
        style={{ transition: 'stroke-dasharray 500ms ease' }}
      />
    </svg>
  )
}

// Big calorie budget card: the inner ring reflects net (eaten - burned) against
// target; the outer green ring reflects steps against the daily goal.
function BudgetCard({ person }) {
  const { target, eaten, burned, net, steps, stepGoal } = person
  const remaining = target != null ? target - net : null
  const over = remaining != null && remaining < 0
  const hasSteps = steps != null
  const OUTER = 150
  return (
    <div className="tide-card" style={{ padding: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: OUTER, height: OUTER, flex: 'none' }}>
        <StepsRing steps={steps || 0} goal={stepGoal || 10000} size={OUTER} stroke={8} />
        <div style={{ position: 'absolute', inset: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ring done={target ? Math.min(net, target) : 0} total={target || 1} size={128} stroke={11} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: over ? OVER : 'var(--tide-ink)' }}>
              {remaining != null ? Math.abs(remaining) : net}
            </div>
            <div className="tide-sub" style={{ fontSize: 11, marginTop: 3 }}>
              {remaining == null ? 'kcal net' : over ? 'kcal over' : 'kcal left'}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 150 }}>
        <Stat label="eaten" value={`${eaten} kcal`} />
        <Stat label="exercise" value={burned ? `-${burned} kcal` : '0 kcal'} />
        <Stat label="net" value={`${net} kcal`} strong />
        <Stat label="target" value={target != null ? `${target} kcal` : 'not set'} muted />
        {hasSteps && (
          <Stat label="steps" value={stepGoal ? `${(steps || 0).toLocaleString('en-GB')} / ${stepGoal.toLocaleString('en-GB')}` : (steps || 0).toLocaleString('en-GB')} />
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, strong, muted }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span className="tide-sub" style={{ fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: strong ? 17 : 15, fontWeight: strong ? 700 : 500, color: muted ? 'var(--tide-faint)' : 'var(--tide-ink)' }}>{value}</span>
    </div>
  )
}

// 7-day net trend: one bar per day, green under target, coral over.
function WeekTrend({ week, target }) {
  const nets = week.map((d) => d.eaten - d.burned)
  const max = Math.max(target || 0, ...nets, 1)
  return (
    <div className="tide-card" style={{ padding: 16 }}>
      <Label>last 7 days · net kcal</Label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 8, height: 110, marginTop: 6 }}>
        {target != null && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(target / max) * 100}%`, borderTop: '1px dashed var(--tide-faint)', opacity: 0.6 }} />
        )}
        {week.map((d, i) => {
          const net = nets[i]
          const over = target != null && net > target
          const h = max > 0 ? (net / max) * 100 : 0
          const dow = new Date(d.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'narrow' })
          return (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <div title={`${net} kcal`} style={{ width: '100%', maxWidth: 26, height: `${Math.max(h, net > 0 ? 3 : 0)}%`, background: over ? OVER : UNDER, borderRadius: '4px 4px 0 0', transition: 'height 400ms ease' }} />
              <span className="tide-sub" style={{ fontSize: 11 }}>{dow}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddFood({ onAdd }) {
  const [description, setDescription] = useState('')
  const [calories, setCalories] = useState('')
  const [mealType, setMealType] = useState('snack')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!description.trim() || calories === '') return
    setBusy(true)
    await onAdd({ description: description.trim(), calories: Number(calories), mealType })
    setDescription(''); setCalories(''); setBusy(false)
  }
  return (
    <form onSubmit={submit} className="tide-card" style={{ padding: 16 }}>
      <Label>log food</Label>
      <input className="tide-input" placeholder="e.g. bacon roll + flat white" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
        <select className="tide-input" style={{ flex: '0 1 130px' }} value={mealType} onChange={(e) => setMealType(e.target.value)}>
          {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input className="tide-input" style={{ flex: '0 1 110px' }} type="number" inputMode="numeric" placeholder="kcal" value={calories} onChange={(e) => setCalories(e.target.value)} />
        <button className="tide-btn tide-btn-primary" style={{ padding: '9px 18px', marginLeft: 'auto' }} disabled={busy || !description.trim() || calories === ''}>add</button>
      </div>
    </form>
  )
}

function AddExercise({ onAdd }) {
  const [description, setDescription] = useState('')
  const [calories, setCalories] = useState('')
  const [minutes, setMinutes] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!description.trim() || calories === '') return
    setBusy(true)
    await onAdd({ description: description.trim(), calories: Number(calories), minutes: minutes === '' ? null : Number(minutes) })
    setDescription(''); setCalories(''); setMinutes(''); setBusy(false)
  }
  return (
    <form onSubmit={submit} className="tide-card" style={{ padding: 16 }}>
      <Label>log exercise</Label>
      <input className="tide-input" placeholder="e.g. dog walk, gym session" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
        <input className="tide-input" style={{ flex: '0 1 110px' }} type="number" inputMode="numeric" placeholder="mins" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        <input className="tide-input" style={{ flex: '0 1 110px' }} type="number" inputMode="numeric" placeholder="kcal burned" value={calories} onChange={(e) => setCalories(e.target.value)} />
        <button className="tide-btn tide-btn-primary" style={{ padding: '9px 18px', marginLeft: 'auto' }} disabled={busy || !description.trim() || calories === ''}>add</button>
      </div>
    </form>
  )
}

function EntryRow({ left, mid, right, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--tide-hair)' }}>
      <span className="tide-sub" style={{ fontSize: 12, minWidth: 44 }}>{left}</span>
      <span style={{ flex: 1, fontSize: 14, color: 'var(--tide-ink)' }}>{mid}</span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{right}</span>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer', fontSize: 12 }}>✕</button>
    </div>
  )
}

function TargetEditor({ person, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(person.target ?? '')
  useEffect(() => { setValue(person.target ?? '') }, [person.target])
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="tide-btn tide-btn-ghost" style={{ padding: '7px 14px', fontSize: 13 }}>
        {person.target != null ? `edit target (${person.target} kcal)` : 'set a daily target'}
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input className="tide-input" style={{ width: 110 }} type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      <button className="tide-btn tide-btn-primary" style={{ padding: '7px 14px', fontSize: 13 }} onClick={async () => { await onSave(value === '' ? null : Number(value)); setEditing(false) }}>save</button>
      <button className="tide-btn tide-btn-ghost" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => setEditing(false)}>cancel</button>
    </div>
  )
}

// Add n days to a YYYY-MM-DD string, returning YYYY-MM-DD (local).
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA')
}

// Human label for the viewed day relative to today.
function dayLabel(date, today) {
  if (!date) return 'today'
  if (date === today) return 'today'
  if (date === addDays(today, -1)) return 'yesterday'
  return new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Prev/next controls to step through the last 7 days. Capped: can't go past
// today, or more than 6 days back.
function DayNav({ date, today, onChange }) {
  if (!date || !today) return null
  const minDate = addDays(today, -6)
  const atOldest = date <= minDate
  const atNewest = date >= today
  const btn = (disabled) => ({
    background: 'none', border: '1px solid var(--tide-hair)', borderRadius: 8,
    width: 34, height: 34, cursor: disabled ? 'default' : 'pointer',
    color: disabled ? 'var(--tide-faint)' : 'var(--tide-ink)', fontSize: 16, lineHeight: 1,
    opacity: disabled ? 0.4 : 1,
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
      <button aria-label="previous day" disabled={atOldest} style={btn(atOldest)} onClick={() => !atOldest && onChange(addDays(date, -1))}>‹</button>
      <span style={{ fontSize: 15, fontWeight: 600, minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>{dayLabel(date, today)}</span>
      <button aria-label="next day" disabled={atNewest} style={btn(atNewest)} onClick={() => !atNewest && onChange(addDays(date, 1))}>›</button>
    </div>
  )
}

export default function TideHealth() {
  const { user } = useUser()
  const [state, setState] = useState({ loading: true, users: [], date: null, today: null })
  const [selectedId, setSelectedId] = useState(user.id)
  const [viewDate, setViewDate] = useState(null) // null = today

  const reload = useCallback(async () => {
    const data = await getHealthDay(viewDate || undefined)
    setState({ loading: false, users: data.users || [], date: data.date, today: data.today })
  }, [viewDate])
  useEffect(() => { reload() }, [reload])

  if (state.loading) return <p className="tide-sub" style={{ paddingTop: 20 }}>loading…</p>

  const parents = state.users
  const person = parents.find((p) => p.id === selectedId) || parents.find((p) => p.id === user.id) || parents[0]
  if (!person) return <EmptyHint>no data.</EmptyHint>

  const isToday = state.date === state.today
  const entryDate = state.date // log against the day being viewed
  const logFood = async (entry) => { await addFood({ ...entry, userId: person.id, date: entryDate }); reload() }
  const logExercise = async (entry) => { await addExercise({ ...entry, userId: person.id, date: entryDate }); reload() }
  const saveTarget = async (t) => { await setCalorieTarget(person.id, t); reload() }
  const removeFood = async (id) => { await deleteFood(id); reload() }
  const removeExercise = async (id) => { await deleteExercise(id); reload() }

  const foodByMeal = MEAL_TYPES
    .map((m) => ({ meal: m, items: person.food.filter((f) => f.mealType === m) }))
    .filter((g) => g.items.length)

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">health</span></div>
      <p className="tide-sub" style={{ marginTop: 6 }}>calories in, exercise out · tell Jarvis what you ate and it lands here</p>

      {parents.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {parents.map((p) => (
            <button key={p.id} onClick={() => setSelectedId(p.id)} className="tide-btn tide-btn-ghost"
              style={{ padding: '7px 16px', fontSize: 14, color: p.id === person.id ? 'var(--tide-accent-ink)' : 'var(--tide-ink)', borderColor: p.id === person.id ? 'var(--tide-accent-ink)' : 'var(--tide-hair)' }}>
              {p.name.toLowerCase()}
            </button>
          ))}
        </div>
      )}

      <DayNav date={state.date} today={state.today} onChange={setViewDate} />

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <BudgetCard person={person} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <TargetEditor person={person} onSave={saveTarget} />
        </div>

        <AddFood onAdd={logFood} />
        <AddExercise onAdd={logExercise} />

        <div className="tide-card" style={{ padding: 16 }}>
          <Label>{isToday ? "today's food" : 'food'}</Label>
          {foodByMeal.length === 0 && <EmptyHint>nothing logged yet.</EmptyHint>}
          {foodByMeal.map((g) => (
            <div key={g.meal} style={{ marginTop: 8 }}>
              <div className="tide-sub" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{g.meal}</div>
              {g.items.map((f) => (
                <EntryRow key={f.id} left={timeStr(f.createdAt)} mid={f.description} right={`${f.calories}`}
                  onDelete={() => removeFood(f.id)} />
              ))}
            </div>
          ))}
        </div>

        <div className="tide-card" style={{ padding: 16 }}>
          <Label>{isToday ? "today's exercise" : 'exercise'}</Label>
          {person.exercise.length === 0 && <EmptyHint>nothing logged yet.</EmptyHint>}
          {person.exercise.map((e) => (
            <EntryRow key={e.id} left={timeStr(e.createdAt)}
              mid={e.minutes ? `${e.description} · ${e.minutes} min` : e.description}
              right={`-${e.calories}`} onDelete={() => removeExercise(e.id)} />
          ))}
        </div>

        <WeekTrend week={person.week} target={person.target} />
      </div>
    </div>
  )
}
