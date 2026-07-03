import { useState, useRef, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { firstName } from './people'
import { askJarvis } from '../lib/data'

// simple **bold** -> <b>
function render(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <b key={i} style={{ color: 'var(--tide-accent-ink)' }}>{p.slice(2, -2)}</b>
      : <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{p}</span>
  )
}

const SUGGESTIONS = {
  parent: ["what's for dinner?", "what's on tomorrow?", 'add milk to the shopping'],
  child: ["what's for dinner?", 'my chores', 'can I have a friend over?'],
}

function Bubble({ from, children }) {
  const me = from === 'me'
  return (
    <div style={{
      maxWidth: '82%', alignSelf: me ? 'flex-end' : 'flex-start',
      background: me ? 'var(--tide-grad-135)' : 'var(--tide-card)',
      color: me ? '#fff' : 'var(--tide-ink)',
      border: me ? 'none' : '1px solid var(--tide-card-border)',
      borderRadius: 16, borderBottomRightRadius: me ? 4 : 16, borderBottomLeftRadius: me ? 16 : 4,
      padding: '9px 13px', fontSize: 14, lineHeight: 1.5,
    }}>
      {children}
    </div>
  )
}

export default function TideJarvis() {
  const { user } = useUser()
  const [messages, setMessages] = useState([
    { from: 'jv', text: `Hi ${firstName(user)}! Ask me about the calendar, chores, meals or shopping.` },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setMessages((m) => [...m, { from: 'me', text: msg }])
    setInput('')
    setThinking(true)
    try {
      const res = await askJarvis(user.id, msg)
      setMessages((m) => [...m, { from: 'jv', text: res.reply }])
    } catch {
      setMessages((m) => [...m, { from: 'jv', text: "Sorry, I couldn't reach the family data just now." }])
    }
    setThinking(false)
  }

  const scopeNote = user.role === 'parent'
    ? 'you can ask and change things'
    : 'ask me anything — I\'ll check with a grown-up for the big stuff'

  return (
    <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: 420 }}>
      <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}><span className="tide-grad">jarvis</span></div>
      <p className="tide-sub" style={{ marginTop: 6 }}>family assistant · knows the calendar, chores &amp; meals · {scopeNote}</p>

      <div className="tide-card" style={{ flex: 1, marginTop: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        {messages.map((m, i) => <Bubble key={i} from={m.from}>{m.from === 'jv' ? render(m.text) : m.text}</Bubble>)}
        {thinking && <Bubble from="jv"><span className="tide-sub">…</span></Bubble>}
        <div ref={endRef} />
      </div>

      {/* suggestions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {(SUGGESTIONS[user.role] || SUGGESTIONS.child).map((s) => (
          <button key={s} onClick={() => send(s)} className="tide-btn tide-btn-ghost" style={{ fontSize: 12, padding: '5px 11px' }}>{s}</button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send() }} style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <input className="tide-input" placeholder="ask jarvis…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="tide-btn tide-btn-primary" style={{ padding: '9px 18px' }} disabled={!input.trim() || thinking}>send</button>
      </form>
    </div>
  )
}
