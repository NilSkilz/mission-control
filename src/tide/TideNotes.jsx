import { useEffect, useState, useCallback } from 'react'
import { useUser } from '../context/UserContext'
import { firstName, personColor } from './people'
import { Label, EmptyHint } from './widgets'
import { getUsers, getNotes, addNote, deleteNote, updateNote, markNoteSeen } from '../lib/data'

// quick expiry presets -> ISO string (or null)
function expiryFromPreset(preset) {
  if (!preset) return null
  const d = new Date()
  if (preset === '9am') { d.setHours(9, 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1) }
  else if (preset === 'eod') d.setHours(23, 59, 0, 0)
  else if (preset === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0) }
  return d.toISOString()
}

function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function Compose({ me, users, onPost }) {
  const [body, setBody] = useState('')
  const [target, setTarget] = useState('') // '' = everyone
  const [pinned, setPinned] = useState(false)
  const [expiry, setExpiry] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    await addNote({ authorId: me.id, body: body.trim(), targetUserId: target || null, pinned, expiresAt: expiryFromPreset(expiry) })
    setBody(''); setPinned(false); setExpiry(''); setTarget('')
    setBusy(false)
    onPost()
  }

  return (
    <form onSubmit={submit} className="tide-card" style={{ padding: 16 }}>
      <Label>write a note</Label>
      <textarea
        className="tide-input" rows={2} placeholder="don't forget the lunchboxes…"
        value={body} onChange={(e) => setBody(e.target.value)} style={{ resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
        <select className="tide-input" style={{ flex: '0 1 150px' }} value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">to everyone</option>
          {users.filter((u) => u.id !== me.id).map((u) => <option key={u.id} value={u.id}>to {firstName(u).toLowerCase()}</option>)}
        </select>
        <select className="tide-input" style={{ flex: '0 1 150px' }} value={expiry} onChange={(e) => setExpiry(e.target.value)}>
          <option value="">no expiry</option>
          <option value="9am">expires 9am</option>
          <option value="eod">expires tonight</option>
          <option value="tomorrow">expires tomorrow</option>
        </select>
        <button type="button" onClick={() => setPinned((p) => !p)} className="tide-btn tide-btn-ghost" style={{ padding: '9px 14px', fontSize: 13, color: pinned ? 'var(--tide-accent-ink)' : 'var(--tide-ink)', borderColor: pinned ? 'var(--tide-accent-ink)' : 'var(--tide-hair)' }}>
          📌 {pinned ? 'pinned' : 'pin'}
        </button>
        <button className="tide-btn tide-btn-primary" style={{ padding: '9px 18px', marginLeft: 'auto' }} disabled={busy || !body.trim()}>post</button>
      </div>
    </form>
  )
}

function SeenChips({ note, users, me }) {
  // who is expected to see this: the target, or everyone-but-author
  const expected = note.targetUserId
    ? users.filter((u) => u.id === note.targetUserId)
    : users.filter((u) => u.id !== note.authorId)
  const seen = new Set((note.seenBy || []).map((r) => r.userId))
  if (expected.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
      {expected.map((u) => {
        const has = seen.has(u.id)
        return (
          <span key={u.id} style={{
            fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '3px 9px',
            border: `1px solid ${has ? personColor(u) : 'var(--tide-hair)'}`,
            color: has ? personColor(u) : 'var(--tide-faint)',
          }}>
            {firstName(u).toLowerCase()} {has ? '✓ seen' : '· not yet'}
          </span>
        )
      })}
    </div>
  )
}

export default function TideNotes() {
  const { user } = useUser()
  const [state, setState] = useState({ loading: true, users: [], notes: [] })

  const reload = useCallback(async () => {
    const [users, notes] = await Promise.all([getUsers(), getNotes()])
    setState({ loading: false, users, notes })
  }, [])

  useEffect(() => { reload() }, [reload])

  const { users, notes } = state
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))

  const isRecipient = (n) => n.authorId !== user.id && (!n.targetUserId || n.targetUserId === user.id)
  const haveSeen = (n) => (n.seenBy || []).some((r) => r.userId === user.id)

  const markSeen = async (n) => { await markNoteSeen(n.id, user.id); reload() }
  const remove = async (n) => { await deleteNote(n.id); reload() }
  const togglePin = async (n) => { await updateNote(n.id, { pinned: !n.pinned }); reload() }

  if (state.loading) return <p className="tide-sub" style={{ paddingTop: 20 }}>loading…</p>

  // notes this person should even see: authored by them, to them, or to everyone
  const visible = notes.filter((n) => n.authorId === user.id || !n.targetUserId || n.targetUserId === user.id)

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">notes</span></div>
      <p className="tide-sub" style={{ marginTop: 6 }}>the family noticeboard · pinned stays up, expired disappears</p>

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Compose me={user} users={users} onPost={reload} />

        {visible.length === 0 && <EmptyHint>no notes right now.</EmptyHint>}
        {visible.map((n) => {
          const author = userById[n.authorId]
          const target = n.targetUserId ? userById[n.targetUserId] : null
          const mine = n.authorId === user.id
          return (
            <div key={n.id} className="tide-card" style={{ padding: 16, borderLeft: n.pinned ? '3px solid var(--tide-accent-ink)' : undefined }}>
              <div style={{ fontSize: 15, lineHeight: 1.55 }}>{n.body}</div>
              <div className="tide-sub" style={{ fontSize: 12, marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>{author ? firstName(author).toLowerCase() : '?'}</span>
                <span>· {target ? `to ${firstName(target).toLowerCase()}` : 'to everyone'}</span>
                {n.pinned && <span>· 📌 pinned</span>}
                {n.expiresAt && <span>· expires {timeStr(n.expiresAt)}</span>}
              </div>

              {/* sender sees receipts; recipient gets a tap-to-mark-seen */}
              {mine && <SeenChips note={n} users={users} me={user} />}
              {isRecipient(n) && (
                haveSeen(n)
                  ? <div className="tide-sub" style={{ fontSize: 11, marginTop: 8 }}>seen ✓</div>
                  : <button onClick={() => markSeen(n)} className="tide-btn tide-btn-ghost" style={{ marginTop: 8, padding: '5px 12px', fontSize: 12 }}>tap to mark seen</button>
              )}

              {mine && (
                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button onClick={() => togglePin(n)} style={{ background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer', fontSize: 12 }}>{n.pinned ? 'unpin' : 'pin'}</button>
                  <button onClick={() => remove(n)} style={{ background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer', fontSize: 12 }}>delete</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
