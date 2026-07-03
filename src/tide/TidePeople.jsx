import { useEffect, useState, useCallback } from 'react'
import { useUser } from '../context/UserContext'
import { firstName } from './people'
import { Avatar, Label, EmptyHint } from './widgets'
import { getPublicUsers, resetPassword, addPerson, removePerson } from '../lib/data'

const PERSON_SWATCHES = ['#3D6BC6', '#3C9D5D', '#C25E7E', '#5D6470', '#C96A3E', '#7A6FB0', '#4F9DA6']

function PersonCard({ person, me, onChanged, flash }) {
  const [resetting, setResetting] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  const doReset = async () => {
    if (!pw.trim()) return
    setBusy(true)
    try { await resetPassword(person.id, pw.trim()); flash(`${firstName(person)}'s password reset`); setResetting(false); setPw('') }
    catch (e) { flash(e.message) }
    setBusy(false)
  }
  const doRemove = async () => {
    if (!window.confirm(`Remove ${firstName(person)}?`)) return
    try { await removePerson(person.id); onChanged() } catch (e) { flash(e.message) }
  }

  return (
    <div className="tide-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar user={person} size={40} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{firstName(person)}{person.id === me.id && <span className="tide-sub" style={{ fontWeight: 400 }}> · you</span>}</div>
          <div className="tide-sub" style={{ fontSize: 12 }}>{person.username} · {person.role}</div>
        </div>
      </div>
      {resetting ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input className="tide-input" type="text" placeholder="new password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          <button className="tide-btn tide-btn-primary" style={{ padding: '9px 14px' }} onClick={doReset} disabled={busy || !pw.trim()}>save</button>
          <button className="tide-btn tide-btn-ghost" style={{ padding: '9px 12px' }} onClick={() => { setResetting(false); setPw('') }}>cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button onClick={() => setResetting(true)} className="tide-btn tide-btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }}>reset password</button>
          {person.id !== me.id && <button onClick={doRemove} style={{ background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer', fontSize: 13 }}>remove</button>}
        </div>
      )}
    </div>
  )
}

export default function TidePeople() {
  const { user } = useUser()
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ displayName: '', username: '', role: 'child', password: '', color: PERSON_SWATCHES[0] })
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => { setPeople(await getPublicUsers()); setLoading(false) }, [])
  useEffect(() => { reload() }, [reload])

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  const add = async (e) => {
    e.preventDefault()
    if (!form.displayName.trim() || !form.password.trim()) return
    setBusy(true)
    try {
      const username = (form.username || form.displayName).trim().toLowerCase().replace(/\s+/g, '')
      await addPerson({ ...form, username, displayName: form.displayName.trim(), password: form.password.trim() })
      setForm({ displayName: '', username: '', role: 'child', password: '', color: PERSON_SWATCHES[0] })
      flash('person added')
      reload()
    } catch (e2) { flash(e2.message) }
    setBusy(false)
  }

  if (loading) return <p className="tide-sub" style={{ paddingTop: 20 }}>loading…</p>

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">people</span></div>
      <p className="tide-sub" style={{ marginTop: 6 }}>manage the family logins — reset a password or add someone</p>

      <div className="tide-recipe-grid" style={{ marginTop: 18, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {people.map((p) => <PersonCard key={p.id} person={p} me={user} onChanged={reload} flash={flash} />)}
      </div>

      <form onSubmit={add} className="tide-card" style={{ padding: 16, marginTop: 18 }}>
        <Label>add a person</Label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
          <input className="tide-input" style={{ flex: '1 1 140px' }} placeholder="name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <input className="tide-input" style={{ flex: '1 1 120px' }} placeholder="username (optional)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <select className="tide-input" style={{ flex: '0 1 110px' }} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="child">child</option>
            <option value="parent">parent</option>
          </select>
          <input className="tide-input" style={{ flex: '1 1 120px' }} placeholder="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div style={{ display: 'flex', gap: 6 }}>
            {PERSON_SWATCHES.map((c) => (
              <button type="button" key={c} onClick={() => setForm({ ...form, color: c })} title={c}
                style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: form.color === c ? '2px solid var(--tide-ink)' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
          <button className="tide-btn tide-btn-primary" style={{ padding: '11px 18px' }} disabled={busy || !form.displayName.trim() || !form.password.trim()}>add</button>
        </div>
      </form>

      {toast && (
        <div style={{ position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: 'var(--tide-grad-135)', color: '#fff', padding: '9px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{toast}</div>
      )}
    </div>
  )
}
