import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Label, EmptyHint } from '../tide/widgets'
import { MEAL_TAGS } from '../lib/meals-data'
import {
  getMealRecipes, getMeals, setMeal, getShoppingItems, addShoppingItem,
} from '../lib/data'

const DAY_MS = 86400000
const iso = (d) => d.toISOString().slice(0, 10)
function weekDays() {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const mon = new Date(now.getTime() - (((now.getDay() + 6) % 7) * DAY_MS))
  return Array.from({ length: 7 }, (_, i) => new Date(mon.getTime() + i * DAY_MS))
}

function TagChip({ tag, active, onClick }) {
  const meta = MEAL_TAGS[tag]
  return (
    <button onClick={onClick} className="tide-btn" style={{
      padding: '4px 10px', fontSize: 12, borderRadius: 999,
      border: `1px solid ${active ? 'var(--tide-accent-ink)' : 'var(--tide-hair)'}`,
      background: active ? 'rgba(240,140,90,0.12)' : 'transparent',
      color: active ? 'var(--tide-accent-ink)' : 'var(--tide-muted)',
    }}>
      {meta ? `${meta.emoji} ${tag}` : tag}
    </button>
  )
}

export default function MealsPage() {
  const [state, setState] = useState({ loading: true, recipes: [], meals: [] })
  const [planningDate, setPlanningDate] = useState(null)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [toast, setToast] = useState('')

  const reload = useCallback(async () => {
    const [recipes, meals] = await Promise.all([getMealRecipes(), getMeals()])
    setState({ loading: false, recipes, meals })
  }, [])
  useEffect(() => { reload() }, [reload])

  const days = weekDays()
  const dinnerFor = (d) => state.meals.find((m) => m.date === iso(d) && (m.mealType || '').toLowerCase() === 'dinner')

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1800) }

  const plan = async (recipe, date) => {
    await setMeal(iso(date), 'dinner', recipe.name)
    setPlanningDate(null)
    await reload()
    flash(`${recipe.name} planned for ${date.toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase()}`)
  }
  const clearDay = async (date) => { await setMeal(iso(date), 'dinner', ''); reload() }

  const addToShopping = async (recipe) => {
    const items = await getShoppingItems()
    const have = new Set(items.map((i) => i.name.toLowerCase()))
    let added = 0
    for (const ing of recipe.ingredients || []) {
      const name = typeof ing === 'string' ? ing : ing.name
      if (!name || have.has(name.toLowerCase())) continue
      await addShoppingItem({ name, quantity: 1 })
      added++
    }
    flash(added ? `added ${added} item${added > 1 ? 's' : ''} to shopping` : 'already on the list')
  }

  const filtered = useMemo(() => {
    return state.recipes.filter((r) => {
      if (tag && !(r.tags || []).includes(tag)) return false
      if (query && !r.name.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [state.recipes, tag, query])

  const allTags = useMemo(() => {
    const s = new Set()
    state.recipes.forEach((r) => (r.tags || []).forEach((t) => s.add(t)))
    return [...s]
  }, [state.recipes])

  if (state.loading) return <p className="tide-sub" style={{ paddingTop: 20 }}>loading…</p>

  const today = iso(new Date())

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">meals</span></div>
        <Link to="/shopping" className="tide-pill" style={{ marginLeft: 'auto' }}>🛒 shopping list</Link>
      </div>
      <p className="tide-sub" style={{ marginTop: 6 }}>this week's dinners, and the family recipe book</p>

      {/* this week */}
      <div className="tide-week" style={{ marginTop: 16 }}>
        {days.map((d) => {
          const dinner = dinnerFor(d)
          const isToday = iso(d) === today
          const isPlanning = planningDate && iso(planningDate) === iso(d)
          return (
            <div key={iso(d)} className="tide-card" style={{ padding: 12, outline: isToday ? '1.5px solid var(--tide-accent-ink)' : (isPlanning ? '1.5px dashed var(--tide-coral)' : 'none') }}>
              <div className="tide-lbl" style={{ marginBottom: 6, color: isToday ? 'var(--tide-accent-ink)' : undefined }}>
                {d.toLocaleDateString('en-GB', { weekday: 'short' }).toLowerCase()} {d.getDate()}
              </div>
              {dinner ? (
                <>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{dinner.meal}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button onClick={() => setPlanningDate(d)} style={{ background: 'none', border: 'none', color: 'var(--tide-faint)', fontSize: 11, cursor: 'pointer', padding: 0 }}>change</button>
                    <button onClick={() => clearDay(d)} style={{ background: 'none', border: 'none', color: 'var(--tide-faint)', fontSize: 11, cursor: 'pointer', padding: 0 }}>clear</button>
                  </div>
                </>
              ) : (
                <button onClick={() => setPlanningDate(d)} className="tide-btn tide-btn-ghost" style={{ fontSize: 12, padding: '5px 10px', width: '100%' }}>
                  {isPlanning ? 'pick below ↓' : '+ plan'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {planningDate && (
        <p className="tide-sub" style={{ marginTop: 10, fontSize: 13 }}>
          picking dinner for <b style={{ color: 'var(--tide-accent-ink)' }}>{planningDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase()}</b> — choose a recipe below.
          <button onClick={() => setPlanningDate(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer' }}>cancel</button>
        </p>
      )}

      {/* recipe book */}
      <div style={{ marginTop: 26 }}>
        <Label>recipe book · {state.recipes.length} meals</Label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '10px 0' }}>
          <input className="tide-input" style={{ flex: '1 1 200px', maxWidth: 300 }} placeholder="search meals…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          <TagChip tag="all" active={!tag} onClick={() => setTag(null)} />
          {allTags.map((t) => <TagChip key={t} tag={t} active={tag === t} onClick={() => setTag(t === tag ? null : t)} />)}
        </div>

        <div className="tide-recipe-grid">
          {filtered.length === 0 && <EmptyHint>no meals match.</EmptyHint>}
          {filtered.map((r) => {
            const open = openId === r.id
            return (
              <div key={r.id} className="tide-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</div>
                  <button onClick={() => setOpenId(open ? null : r.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer', fontSize: 12 }}>{open ? 'hide' : 'ingredients'}</button>
                </div>
                <div className="tide-sub" style={{ fontSize: 12, marginTop: 3 }}>
                  {[r.serves && `serves ${r.serves}`, r.time].filter(Boolean).join(' · ')}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                  {(r.tags || []).map((t) => <span key={t} className="tide-sub" style={{ fontSize: 11 }}>{MEAL_TAGS[t]?.emoji || ''}{t}</span>)}
                </div>
                {open && (
                  <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--tide-muted)' }}>
                    {(r.ingredients || []).map((ing, i) => (
                      <li key={i}>{typeof ing === 'string' ? ing : `${ing.name}${ing.quantity ? ` · ${ing.quantity}` : ''}`}</li>
                    ))}
                  </ul>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {planningDate && (
                    <button onClick={() => plan(r, planningDate)} className="tide-btn tide-btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>
                      plan for {planningDate.toLocaleDateString('en-GB', { weekday: 'short' }).toLowerCase()}
                    </button>
                  )}
                  <button onClick={() => addToShopping(r)} className="tide-btn tide-btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>+ shopping</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: 'var(--tide-grad-135)', color: '#fff', padding: '9px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
