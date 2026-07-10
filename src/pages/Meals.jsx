import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Label, EmptyHint } from '../tide/widgets'
import { MEAL_TAGS } from '../lib/meals-data'
import { useUser } from '../context/UserContext'
import {
  getMealRecipes, getMeals, setMeal, getShoppingItems, addShoppingItem, addMealRecipe, updateMealRecipe,
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

const EMPTY_FORM = { name: '', serves: '', time: '', note: '', tags: [], ingredients: [] }

function MealSheet({ recipe, onClose, onSaved }) {
  const editing = !!recipe
  const [form, setForm] = useState(() => editing ? {
    name: recipe.name || '',
    serves: recipe.serves || '',
    time: recipe.time || '',
    note: recipe.note || '',
    tags: recipe.tags || [],
    ingredients: (recipe.ingredients || []).map((x) => typeof x === 'string' ? { name: x, quantity: null } : x),
  } : EMPTY_FORM)
  const [ing, setIng] = useState({ name: '', quantity: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const toggleTag = (t) => setForm((f) => ({
    ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t],
  }))
  const addIng = () => {
    const name = ing.name.trim()
    if (!name) return
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, { name, quantity: ing.quantity.trim() || null }] }))
    setIng({ name: '', quantity: '' })
  }
  const removeIng = (i) => setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))

  const save = async () => {
    if (!form.name.trim() || saving) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        tags: form.tags,
        serves: form.serves.trim() || null,
        time: form.time.trim() || null,
        note: form.note.trim() || null,
        ingredients: form.ingredients,
      }
      if (editing) await updateMealRecipe(recipe.id, payload)
      else await addMealRecipe(payload)
      await onSaved(form.name.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="tide-sheet-backdrop" onClick={onClose} />
      <div className="tide-sheet tide-sheet--modal" role="dialog" aria-label={editing ? 'Edit meal' : 'Add a meal'} style={{ maxHeight: '86vh', overflowY: 'auto' }}>
        <div className="tide-sheet-grip" />
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 14 }}>
          <div className="tide-greet" style={{ fontSize: 20 }}><span className="tide-grad">{editing ? 'edit meal' : 'new meal'}</span></div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--tide-faint)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <Label>name</Label>
        <input className="tide-input" style={{ width: '100%', marginTop: 6 }} placeholder="e.g. chicken fajitas" value={form.name} autoFocus onChange={(e) => set('name', e.target.value)} />

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <Label>serves</Label>
            <input className="tide-input" style={{ width: '100%', marginTop: 6 }} placeholder="4" value={form.serves} onChange={(e) => set('serves', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <Label>time</Label>
            <input className="tide-input" style={{ width: '100%', marginTop: 6 }} placeholder="30 mins" value={form.time} onChange={(e) => set('time', e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Label>tags</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {Object.entries(MEAL_TAGS).map(([id, meta]) => {
              const active = form.tags.includes(id)
              return (
                <button key={id} onClick={() => toggleTag(id)} className="tide-btn" style={{
                  padding: '4px 10px', fontSize: 12, borderRadius: 999,
                  border: `1px solid ${active ? 'var(--tide-accent-ink)' : 'var(--tide-hair)'}`,
                  background: active ? 'rgba(240,140,90,0.12)' : 'transparent',
                  color: active ? 'var(--tide-accent-ink)' : 'var(--tide-muted)',
                }}>{meta.emoji} {id}</button>
              )
            })}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Label>note</Label>
          <input className="tide-input" style={{ width: '100%', marginTop: 6 }} placeholder="e.g. the boys' favourite" value={form.note} onChange={(e) => set('note', e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <Label>ingredients ({form.ingredients.length})</Label>
          {form.ingredients.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
              {form.ingredients.map((x, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, padding: '4px 0', color: 'var(--tide-muted)' }}>
                  <span style={{ flex: 1 }}>{x.name}{x.quantity ? ` · ${x.quantity}` : ''}</span>
                  <button onClick={() => removeIng(i)} style={{ background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer', fontSize: 16 }}>×</button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input className="tide-input" style={{ flex: 1 }} placeholder="add ingredient…" value={ing.name}
              onChange={(e) => setIng((s) => ({ ...s, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addIng()} />
            <input className="tide-input" style={{ width: 90 }} placeholder="qty" value={ing.quantity}
              onChange={(e) => setIng((s) => ({ ...s, quantity: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addIng()} />
            <button onClick={addIng} className="tide-btn tide-btn-ghost" style={{ padding: '6px 12px' }} disabled={!ing.name.trim()}>+</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} className="tide-btn tide-btn-ghost" style={{ flex: 1 }}>cancel</button>
          <button onClick={save} className="tide-btn tide-btn-primary" style={{ flex: 1 }} disabled={!form.name.trim() || saving}>
            {saving ? 'saving…' : (editing ? 'save changes' : 'add meal')}
          </button>
        </div>
      </div>
    </>
  )
}

export default function MealsPage() {
  const { user } = useUser()
  const isParent = user?.role === 'parent'
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Label>recipe book · {state.recipes.length} meals</Label>
          {isParent && (
            <button onClick={() => setAdding(true)} className="tide-btn tide-btn-primary" style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 12px' }}>
              + new meal
            </button>
          )}
        </div>
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
                  {isParent && (
                    <button onClick={() => setEditing(r)} aria-label={`edit ${r.name}`} title="edit meal" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.7)', opacity: 0.75 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {adding && (
        <MealSheet
          onClose={() => setAdding(false)}
          onSaved={async (name) => { await reload(); flash(`${name} added to the recipe book`) }}
        />
      )}

      {editing && (
        <MealSheet
          recipe={editing}
          onClose={() => setEditing(null)}
          onSaved={async (name) => { await reload(); flash(`${name} updated`) }}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: 'var(--tide-grad-135)', color: '#fff', padding: '9px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
