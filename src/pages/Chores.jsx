import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../context/UserContext'
import { firstName } from '../tide/people'
import { Label, Ring, Avatar, Pip, EmptyHint, formatGBP } from '../tide/widgets'
import {
  getUsers, getChores, getChoreCompletions,
  addChore, deleteChore, markChoreDone, approveCompletion, deleteCompletion, payOutChores,
  getToday, getTodayCompletion, getWeekStart,
} from '../lib/data'

const iso = (d) => d.toISOString().slice(0, 10)

function streakFor(completions) {
  const days = new Set(completions.filter((c) => c.approved).map((c) => c.completedAt?.slice(0, 10)))
  let streak = 0
  const d = new Date()
  if (!days.has(iso(d))) d.setDate(d.getDate() - 1) // grace: today not done yet
  while (days.has(iso(d))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

// Aggregate a child's money + progress from their completions.
function walletFor(userId, completions) {
  const mine = completions.filter((c) => c.userId === userId)
  const balance = mine.filter((c) => c.paidOut).reduce((s, c) => s + (c.amount || 0), 0)
  const pending = mine.filter((c) => c.approved && !c.paidOut).reduce((s, c) => s + (c.amount || 0), 0)
  const weekStart = getWeekStart()
  const weekEarned = mine
    .filter((c) => c.approved && (c.completedAt?.slice(0, 10) >= weekStart))
    .reduce((s, c) => s + (c.amount || 0), 0)
  return { balance, pending, weekEarned, streak: streakFor(mine) }
}

function ChoreTick({ row, onTick, onUndo, canUndo }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', fontSize: 15, opacity: row.done ? 0.55 : 1 }}>
      <button
        onClick={row.done ? (canUndo ? onUndo : undefined) : onTick}
        title={row.done ? (canUndo ? 'undo' : 'approved') : 'mark done'}
        style={{
          width: 20, height: 20, borderRadius: 6, flex: 'none', cursor: row.done && !canUndo ? 'default' : 'pointer',
          border: row.done ? 'none' : '1.8px solid var(--tide-accent-ink)',
          background: row.done ? 'var(--tide-grad-135)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12,
        }}
      >
        {row.done ? '✓' : ''}
      </button>
      <span style={{ textDecoration: row.done ? 'line-through' : 'none' }}>{row.title}</span>
      {row.done && row.approved && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--p-logan)' }}>approved</span>}
      {row.done && !row.approved && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--tide-muted)' }}>waiting ⏳</span>}
      {!row.done && row.paid && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--tide-accent-ink)' }}>+{formatGBP(row.amount)}</span>}
    </div>
  )
}

// ---------- child's own view ----------
function ChildChores({ me, chores, completions, reload }) {
  const mine = chores.filter((c) => c.assignedTo === me.id)
  const rows = mine.map((c) => {
    const completion = getTodayCompletion(completions, c.id)
    return { ...c, done: !!completion, approved: completion?.approved, completionId: completion?.id }
  })
  const done = rows.filter((r) => r.done)
  const todo = rows.filter((r) => !r.done)
  const waiting = rows.filter((r) => r.done && !r.approved)
  const w = walletFor(me.id, completions)

  const tick = async (c) => { await markChoreDone(c.id); reload() }
  const undo = async (c) => { if (c.completionId) { await deleteCompletion(c.completionId); reload() } }

  return (
    <>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">chores</span></div>
      <p className="tide-sub" style={{ marginTop: 6 }}>
        {firstName(me).toLowerCase()} · wallet {formatGBP(w.balance)}
        {w.pending > 0 && <> · {formatGBP(w.pending)} banked for sunday</>}
        {w.streak > 0 && <> · 🔥 {w.streak}-day streak</>}
      </p>

      <div className="tide-home-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div className="tide-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <Ring done={done.length} total={rows.length} />
            <div style={{ fontSize: 14 }}><b>{done.length} of {rows.length} done</b><br />
              <span className="tide-sub">{formatGBP(todo.filter((r) => r.paid).reduce((s, r) => s + (r.amount || 0), 0))} still to earn today</span>
            </div>
          </div>
          <Label style={{ marginTop: 10 }}>today</Label>
          {rows.length === 0 && <EmptyHint>no chores set for you.</EmptyHint>}
          {rows.map((r) => (
            <ChoreTick key={r.id} row={r} canUndo={r.done && !r.approved} onTick={() => tick(r)} onUndo={() => undo(r)} />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {waiting.length > 0 && (
            <div className="tide-card" style={{ padding: 16 }}>
              <Label>waiting on a grown-up</Label>
              {waiting.map((r) => (
                <div key={r.id} style={{ display: 'flex', padding: '5px 0', fontSize: 14 }}>
                  <span>{r.title}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--tide-accent-ink)', fontWeight: 700 }}>{formatGBP(r.amount)} ⏳</span>
                </div>
              ))}
            </div>
          )}
          <div className="tide-card" style={{ padding: 16 }}>
            <Label>this week</Label>
            <div style={{ fontSize: 15 }}><b>{formatGBP(w.weekEarned)} earned</b></div>
            <p className="tide-sub" style={{ fontSize: 13, marginTop: 4 }}>payout day is sunday · wallet {formatGBP(w.balance)}</p>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- parent view: approve, pay out, create ----------
function ParentChores({ users, chores, completions, reload }) {
  const kids = users.filter((u) => u.role === 'child')
  const [form, setForm] = useState({ title: '', assignedTo: kids[0]?.id || '', amount: 0.5, paid: true, recurring: 'daily' })
  const [busy, setBusy] = useState(false)

  const approve = async (id) => { await approveCompletion(id); reload() }
  const payout = async (uid) => { await payOutChores(uid); reload() }
  const removeChore = async (id) => { await deleteChore(id); reload() }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.assignedTo) return
    setBusy(true)
    await addChore({ ...form, amount: Number(form.amount) || 0, recurring: form.recurring || null })
    setForm({ ...form, title: '' })
    setBusy(false)
    reload()
  }

  return (
    <>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">chores</span></div>
      <p className="tide-sub" style={{ marginTop: 6 }}>approve what's done, set new jobs, pay out on sunday</p>

      <div className="tide-home-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {kids.map((kid) => {
          const w = walletFor(kid.id, completions)
          const kidChores = chores.filter((c) => c.assignedTo === kid.id)
          const rows = kidChores.map((c) => {
            const completion = getTodayCompletion(completions, c.id)
            return { ...c, done: !!completion, approved: completion?.approved, completionId: completion?.id }
          })
          const waiting = rows.filter((r) => r.done && !r.approved)
          return (
            <div key={kid.id} className="tide-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar user={kid} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{firstName(kid).toLowerCase()}</div>
                  <div className="tide-sub" style={{ fontSize: 12 }}>wallet {formatGBP(w.balance)} · {formatGBP(w.pending)} to pay</div>
                </div>
                {w.pending > 0 && (
                  <button className="tide-btn tide-btn-primary" style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => payout(kid.id)}>
                    pay {formatGBP(w.pending)}
                  </button>
                )}
              </div>

              {waiting.length > 0 && (
                <>
                  <Label style={{ marginTop: 14 }}>needs approving</Label>
                  {waiting.map((r) => (
                    <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', fontSize: 14 }}>
                      <span>{r.title}</span>
                      <span className="tide-sub" style={{ fontSize: 12 }}>{formatGBP(r.amount)}</span>
                      <button className="tide-btn tide-btn-primary" style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 13 }} onClick={() => approve(r.completionId)}>approve</button>
                    </div>
                  ))}
                </>
              )}

              <Label style={{ marginTop: 14 }}>all chores</Label>
              {rows.length === 0 && <EmptyHint>none yet</EmptyHint>}
              {rows.map((r) => (
                <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', fontSize: 14, opacity: r.done ? 0.55 : 1 }}>
                  <Pip person={kid} size={7} />
                  <span>{r.title}</span>
                  {r.paid && <span className="tide-sub" style={{ fontSize: 12 }}>{formatGBP(r.amount)}</span>}
                  <span className="tide-sub" style={{ fontSize: 11, marginLeft: 4 }}>{r.recurring || 'one-off'}</span>
                  <button onClick={() => removeChore(r.id)} title="delete" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer', fontSize: 15 }}>×</button>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* create */}
      <form onSubmit={submit} className="tide-card" style={{ padding: 16, marginTop: 16, maxWidth: 640 }}>
        <Label>new chore</Label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="tide-input" style={{ flex: '2 1 180px' }} placeholder="what needs doing?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="tide-input" style={{ flex: '1 1 120px' }} value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
            {kids.map((k) => <option key={k.id} value={k.id}>{firstName(k)}</option>)}
          </select>
          <select className="tide-input" style={{ flex: '0 1 120px' }} value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value })}>
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="">one-off</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="tide-sub">£</span>
            <input className="tide-input" style={{ width: 76 }} type="number" step="0.5" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value, paid: Number(e.target.value) > 0 })} />
          </div>
          <button className="tide-btn tide-btn-primary" style={{ padding: '11px 18px' }} disabled={busy || !form.title}>add</button>
        </div>
      </form>
    </>
  )
}

export default function ChoresPage() {
  const { user } = useUser()
  const [state, setState] = useState({ loading: true, users: [], chores: [], completions: [] })

  const reload = useCallback(async () => {
    const [users, chores, completions] = await Promise.all([getUsers(), getChores(), getChoreCompletions()])
    setState({ loading: false, users, chores, completions })
  }, [])

  useEffect(() => { reload() }, [reload])

  if (state.loading) return <p className="tide-sub" style={{ paddingTop: 20 }}>loading…</p>

  return user?.role === 'parent'
    ? <ParentChores users={state.users} chores={state.chores} completions={state.completions} reload={reload} />
    : <ChildChores me={user} chores={state.chores} completions={state.completions} reload={reload} />
}
