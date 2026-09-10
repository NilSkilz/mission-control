import { useEffect, useState } from 'react'
import { Label, EmptyHint } from './widgets'
import { getEnmAgreements, addEnmAgreement, updateEnmAgreement, deleteEnmAgreement } from '../lib/data'
import { useUser } from '../context/UserContext'

// "us" — the shared agreements page for the two parents. The opposite privacy
// model to the journal: one list both read and write, so what was agreed lives
// in writing instead of in one person's memory of a conversation. Kids never
// see it (nav parent-gated, route + API role-gated).
//
// Entries come in five kinds: hard limits (absolute no, not negotiable in the
// moment), soft limits (approach with care, talk first), the messy list
// (people neither of us plays with; text = the name), the interested list
// (people one of us has mentioned potential interest in; text = the name,
// `who` = whose interest, rendered one column per parent, or 'both' for a
// couple we might play with together, rendered as its own full-width lane)
// and plain agreements.

const KINDS = {
  hard: { label: 'hard limit', accent: '#d05a5a', section: 'hard limits', hint: 'absolute no. not up for negotiation in the moment.', placeholder: 'what’s the limit?' },
  soft: { label: 'soft limit', accent: '#d9a05a', section: 'soft limits', hint: 'approach with care. a conversation first, every time.', placeholder: 'what’s the limit?' },
  messy: { label: 'messy list', accent: '#8a7bd9', section: 'the messy list', hint: 'people neither of us plays with. on by either of us, off only when we both agree.', placeholder: 'who’s off the table?' },
  interested: { label: 'interested', accent: '#5aa88c', section: 'the interested list', hint: 'people we’ve mentioned to each other. a mention, not a plan. talking comes first.', placeholder: 'who’s caught your eye?' },
  agreement: { label: 'agreement', accent: null, section: 'our agreements', hint: null, placeholder: 'what have we agreed?' },
}
const KIND_ORDER = ['hard', 'soft', 'messy', 'interested', 'agreement']

// The two parents, for the interested list's columns (aimee before rob).
function useParents() {
  const { users } = useUser()
  return (users || []).filter((u) => u.role === 'parent').sort((a, b) => a.username.localeCompare(b.username))
}

function dateStr(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function KindPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {KIND_ORDER.map((k) => {
        const on = value === k
        const accent = KINDS[k].accent || 'var(--tide-accent-ink)'
        return (
          <button
            key={k} type="button" onClick={() => onChange(k)}
            style={{
              padding: '6px 12px', fontSize: 12.5, borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${on ? accent : 'var(--tide-card-border)'}`,
              background: 'none', color: on ? accent : 'var(--tide-faint)', fontWeight: on ? 600 : 400,
            }}
          >
            {KINDS[k].label}
          </button>
        )
      })}
    </div>
  )
}

// Whose entry is this? Shown only for interested-list entries.
function WhoPicker({ value, onChange }) {
  const parents = useParents()
  const accent = KINDS.interested.accent
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
      <span className="tide-sub" style={{ fontSize: 12.5 }}>whose interest?</span>
      {[...parents.map((p) => ({ value: p.username, label: p.displayName })), { value: 'both', label: 'both of us' }].map((opt) => {
        const on = value === opt.value
        return (
          <button
            key={opt.value} type="button" onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 12px', fontSize: 12.5, borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${on ? accent : 'var(--tide-card-border)'}`,
              background: 'none', color: on ? accent : 'var(--tide-faint)', fontWeight: on ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function AgreementCard({ agreement, onSave, onDelete }) {
  const { user } = useUser()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(agreement.text)
  const [note, setNote] = useState(agreement.note || '')
  const [kind, setKind] = useState(agreement.kind || 'agreement')
  const [who, setWho] = useState(agreement.who || user?.username)
  const [busy, setBusy] = useState(false)
  const accent = KINDS[agreement.kind]?.accent

  const cancel = () => { setText(agreement.text); setNote(agreement.note || ''); setKind(agreement.kind || 'agreement'); setWho(agreement.who || user?.username); setEditing(false) }
  const save = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    await onSave({ text: text.trim(), note: note.trim() || null, kind, ...(kind === 'interested' ? { who } : {}) })
    setBusy(false); setEditing(false)
  }

  if (editing) {
    return (
      <form onSubmit={save} className="tide-card" style={{ padding: 16 }}>
        <textarea className="tide-input" style={{ minHeight: 70, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <input className="tide-input" style={{ marginTop: 8 }} placeholder="context / example (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <KindPicker value={kind} onChange={setKind} />
        {kind === 'interested' && <WhoPicker value={who} onChange={setWho} />}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="tide-btn tide-btn-ghost" style={{ padding: '8px 14px' }} onClick={cancel}>cancel</button>
          <button className="tide-btn tide-btn-primary" style={{ padding: '8px 16px' }} disabled={busy || !text.trim()}>save</button>
        </div>
      </form>
    )
  }

  return (
    <div className="tide-card" style={{ padding: 16, ...(accent ? { borderLeft: `3px solid ${accent}` } : {}) }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.5, color: 'var(--tide-ink)' }}>{agreement.text}</div>
          {agreement.note && (
            <div className="tide-sub" style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{agreement.note}</div>
          )}
          <div className="tide-sub" style={{ marginTop: 8, fontSize: 11.5 }}>
            added {agreement.addedByName ? `by ${agreement.addedByName} ` : ''}· {dateStr(agreement.createdAt)}
            {agreement.updatedAt !== agreement.createdAt && ` · reworded ${dateStr(agreement.updatedAt)}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setEditing(true)} title="reword" style={{ background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer', fontSize: 14 }}>✎</button>
          <button onClick={onDelete} title="remove" style={{ background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer', fontSize: 13 }}>✕</button>
        </div>
      </div>
    </div>
  )
}

function AddAgreement({ onAdd }) {
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [kind, setKind] = useState('agreement')
  const [who, setWho] = useState(user?.username)
  const [busy, setBusy] = useState(false)
  const reset = () => { setText(''); setNote(''); setKind('agreement'); setWho(user?.username); setOpen(false) }
  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    await onAdd({ text: text.trim(), note: note.trim() || null, kind, ...(kind === 'interested' ? { who } : {}) })
    setBusy(false); reset()
  }
  if (!open) {
    return (
      <button className="tide-btn tide-btn-primary" style={{ padding: '11px 18px', width: '100%' }} onClick={() => setOpen(true)}>
        + add an agreement or limit
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="tide-card" style={{ padding: 16 }}>
      <Label>new entry</Label>
      <textarea className="tide-input" style={{ marginTop: 4, minHeight: 70, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} placeholder={KINDS[kind].placeholder} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      <input className="tide-input" style={{ marginTop: 8 }} placeholder="context / example (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <KindPicker value={kind} onChange={setKind} />
      {kind === 'interested' && <WhoPicker value={who} onChange={setWho} />}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button type="button" className="tide-btn tide-btn-ghost" style={{ padding: '9px 16px' }} onClick={reset}>cancel</button>
        <button className="tide-btn tide-btn-primary" style={{ padding: '9px 18px' }} disabled={busy || !text.trim()}>save</button>
      </div>
    </form>
  )
}

export default function TideEnm() {
  const [state, setState] = useState({ loading: true, agreements: [], parents: [] })

  const reload = async () => {
    const data = await getEnmAgreements()
    setState({ loading: false, agreements: data.agreements || [], parents: data.parents || [] })
  }
  useEffect(() => { reload() }, [])

  const add = async (a) => { await addEnmAgreement(a); reload() }
  const save = async (id, patch) => { await updateEnmAgreement(id, patch); reload() }
  const removeOne = async (id) => {
    if (typeof window !== 'undefined' && !window.confirm('Remove this? Only do this if you’ve both talked about it.')) return
    await deleteEnmAgreement(id); reload()
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">us</span></div>
      <p className="tide-sub" style={{ marginTop: 6 }}>
        🔒 just the two of us · limits and agreements, in writing, so it’s never one person’s memory of a conversation
      </p>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {state.loading ? (
          <p className="tide-sub">loading…</p>
        ) : (
          KIND_ORDER.map((k) => {
            const items = state.agreements.filter((a) => (a.kind || 'agreement') === k)
            return (
              <div key={k}>
                <Label style={KINDS[k].accent ? { color: KINDS[k].accent } : undefined}>{KINDS[k].section}</Label>
                {KINDS[k].hint && (
                  <p className="tide-sub" style={{ marginTop: -4, marginBottom: 8, fontSize: 12.5 }}>{KINDS[k].hint}</p>
                )}
                {k === 'interested' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8, alignItems: 'start' }}>
                      {state.parents.map((p) => {
                        const theirs = items.filter((a) => a.who === p.username)
                        return (
                          <div key={p.username} style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: KINDS.interested.accent, marginBottom: 8 }}>{p.displayName}</div>
                            {theirs.length === 0 ? (
                              <EmptyHint>no one yet.</EmptyHint>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {theirs.map((a) => (
                                  <AgreementCard key={a.id} agreement={a} onSave={(patch) => save(a.id, patch)} onDelete={() => removeOne(a.id)} />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {(() => {
                      const together = items.filter((a) => a.who === 'both')
                      return (
                        <div style={{ marginTop: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: KINDS.interested.accent, marginBottom: 8 }}>both of us · people we might play with together</div>
                          {together.length === 0 ? (
                            <EmptyHint>no one yet.</EmptyHint>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {together.map((a) => (
                                <AgreementCard key={a.id} agreement={a} onSave={(patch) => save(a.id, patch)} onDelete={() => removeOne(a.id)} />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </>
                ) : items.length === 0 ? (
                  <EmptyHint>{k === 'agreement' ? 'nothing written down yet. add the first one.' : k === 'messy' ? 'nobody on it. long may that last.' : 'none written down yet.'}</EmptyHint>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                    {items.map((a) => (
                      <AgreementCard key={a.id} agreement={a} onSave={(patch) => save(a.id, patch)} onDelete={() => removeOne(a.id)} />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}

        <AddAgreement onAdd={add} />

        <p className="tide-sub" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          either of us can add or reword one. removing one is a conversation first, then a tap here.
        </p>
      </div>
    </div>
  )
}
