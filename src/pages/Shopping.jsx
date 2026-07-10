import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { firstName } from '../tide/people'
import { Label, EmptyHint } from '../tide/widgets'
import {
  getUsers, getShoppingItems, addShoppingItem, updateShoppingItem, deleteShoppingItem, clearCheckedItems,
} from '../lib/data'

export default function ShoppingPage() {
  const { user } = useUser()
  const [state, setState] = useState({ loading: true, items: [], users: [] })
  const [name, setName] = useState('')

  const reload = useCallback(async () => {
    const [items, users] = await Promise.all([getShoppingItems(), getUsers()])
    setState({ loading: false, items, users })
  }, [])
  useEffect(() => { reload() }, [reload])

  const userById = Object.fromEntries(state.users.map((u) => [u.id, u]))

  const add = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await addShoppingItem({ name: name.trim(), quantity: 1, addedBy: user?.id })
    setName('')
    reload()
  }
  const toggle = async (item) => { await updateShoppingItem(item.id, { checked: !item.checked }); reload() }
  const remove = async (item) => { await deleteShoppingItem(item.id); reload() }
  const clearChecked = async () => { await clearCheckedItems(); reload() }

  if (state.loading) return <p className="tide-sub" style={{ paddingTop: 20 }}>loading…</p>

  const open = state.items.filter((i) => !i.checked)
  const done = state.items.filter((i) => i.checked)

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">shopping</span></div>
        <Link to="/meals" className="tide-pill" style={{ marginLeft: 'auto' }}>🍽️ meals</Link>
      </div>
      <p className="tide-sub" style={{ marginTop: 6 }}>{open.length} to get{done.length ? ` · ${done.length} in the basket` : ''}</p>

      <form onSubmit={add} className="tide-card" style={{ padding: 12, marginTop: 16, display: 'flex', gap: 10 }}>
        <input className="tide-input" placeholder="add an item…" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="tide-btn tide-btn-primary" style={{ padding: '9px 18px' }} disabled={!name.trim()}>add</button>
      </form>

      <div className="tide-card" style={{ padding: 16, marginTop: 16 }}>
        <Label>to get</Label>
        {open.length === 0 && <EmptyHint>all done — nothing to buy.</EmptyHint>}
        {open.map((item) => (
          <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', fontSize: 15 }}>
            <button onClick={() => toggle(item)} style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', border: '1.8px solid var(--tide-accent-ink)', background: 'transparent', cursor: 'pointer' }} />
            <span>{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</span>
            {item.addedBy && userById[item.addedBy] && <span className="tide-sub" style={{ fontSize: 11, marginLeft: 6 }}>{firstName(userById[item.addedBy]).toLowerCase()}</span>}
            <button onClick={() => remove(item)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer', fontSize: 15 }}>×</button>
          </div>
        ))}

        {done.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 16 }}>
              <Label style={{ margin: 0 }}>in the basket</Label>
              <button onClick={clearChecked} className="tide-btn tide-btn-ghost" style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 13px' }}>clear ({done.length})</button>
            </div>
            {done.map((item) => (
              <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', fontSize: 15, opacity: 0.5 }}>
                <button onClick={() => toggle(item)} style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', border: 'none', background: 'var(--tide-grad-135)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</button>
                <span style={{ textDecoration: 'line-through' }}>{item.name}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
