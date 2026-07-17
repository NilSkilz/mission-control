// Alexa announce widget: type (or tap) a message, pick which Echoes hear it,
// and broadcast. Speaks via media_player.play_media with content type
// "announce" (Alexa's chime + the message). Lives on the home screen so anyone
// can call the house to tea time.
import { useState } from 'react'
import { Label } from './widgets'
import { haCall } from '../lib/data'
import { ALEXA_DEVICES, ANNOUNCE_PRESETS } from './houseConfig'

const EVERYWHERE = ALEXA_DEVICES.find((d) => d.all)?.entity_id

export default function TideAnnounce() {
  const [msg, setMsg] = useState('')
  const [targets, setTargets] = useState(() => new Set(EVERYWHERE ? [EVERYWHERE] : []))
  const [status, setStatus] = useState(null) // 'sending' | 'sent' | 'error'

  const toggle = (id) => {
    setStatus(null)
    setTargets((prev) => {
      const next = new Set(prev)
      const dev = ALEXA_DEVICES.find((d) => d.entity_id === id)
      // "everywhere" is exclusive: picking it clears the rest, and picking any
      // specific room clears "everywhere".
      if (dev?.all) return next.has(id) ? new Set() : new Set([id])
      next.delete(EVERYWHERE)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const canSend = msg.trim().length > 0 && targets.size > 0 && status !== 'sending'

  const send = async () => {
    if (!canSend) return
    setStatus('sending')
    try {
      await haCall('media_player', 'play_media', [...targets], {
        media_content_id: msg.trim(),
        media_content_type: 'announce',
      })
      setStatus('sent')
      setTimeout(() => setStatus(null), 2500)
    } catch {
      setStatus('error')
    }
  }

  const chip = (active) => ({
    border: 'none', cursor: 'pointer', fontSize: 13, padding: '7px 13px',
    borderRadius: 999, transition: 'all 160ms ease',
    background: active ? 'var(--tide-grad)' : 'var(--tide-hair)',
    color: active ? '#fff' : 'var(--tide-ink)',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  })

  return (
    <div className="tide-card" style={{ padding: 16, marginTop: 16 }}>
      <Label>announce to the alexas</Label>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
        {ANNOUNCE_PRESETS.map((p) => (
          <button key={p} onClick={() => { setMsg(p); setStatus(null) }} style={chip(false)}>{p}</button>
        ))}
      </div>

      <input
        value={msg}
        onChange={(e) => { setMsg(e.target.value); setStatus(null) }}
        onKeyDown={(e) => { if (e.key === 'Enter') send() }}
        placeholder="type a message…"
        style={{
          width: '100%', marginTop: 12, padding: '11px 13px', fontSize: 15,
          borderRadius: 12, border: '1px solid var(--tide-hair)',
          background: 'var(--tide-card-bg, transparent)', color: 'var(--tide-ink)',
          boxSizing: 'border-box',
        }}
      />

      <div className="tide-sub" style={{ fontSize: 12, margin: '12px 0 6px' }}>who hears it</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ALEXA_DEVICES.map((d) => {
          const active = targets.has(d.entity_id)
          return (
            <button key={d.entity_id} onClick={() => toggle(d.entity_id)} style={chip(active)}>
              <span>{d.icon}</span>{d.label}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <button onClick={send} disabled={!canSend} className="tide-btn"
          style={{
            padding: '11px 20px', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 12,
            background: canSend ? 'var(--tide-grad)' : 'var(--tide-hair)',
            color: canSend ? '#fff' : 'var(--tide-muted)', cursor: canSend ? 'pointer' : 'default',
          }}>
          {status === 'sending' ? 'sending…' : '📣 announce'}
        </button>
        {status === 'sent' && <span className="tide-sub" style={{ fontSize: 13, color: 'var(--p-logan)' }}>sent ✓</span>}
        {status === 'error' && <span className="tide-sub" style={{ fontSize: 13, color: '#d96d8f' }}>couldn't reach the alexas</span>}
      </div>
    </div>
  )
}
