// Shared Tide UI primitives, reused across the family screens.
import { personColor, initial } from './people'

export function Pip({ person, size = 8 }) {
  return <span className="tide-pip" style={{ width: size, height: size, background: personColor(person) }} />
}

export function Avatar({ user, size = 30 }) {
  return (
    <span className="tide-avatar" style={{ width: size, height: size, background: personColor(user), fontSize: size * 0.42 }}>
      {initial(user)}
    </span>
  )
}

export function Label({ children, style }) {
  return <div className="tide-lbl" style={{ marginBottom: 8, ...style }}>{children}</div>
}

// Progress ring with the tide gradient stroke.
export function Ring({ done, total, size = 46, stroke = 5 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const frac = total > 0 ? done / total : 0
  const id = `ring-${size}-${stroke}`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: 'none' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--tide-hair)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 500ms ease' }}
      />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f08c5a" />
          <stop offset="100%" stopColor="#d96d8f" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// A single event line in a Today/agenda rail.
export function EventRow({ event }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '5px 0', fontSize: 14 }}>
      <span className="tide-mono" style={{ fontSize: 12, minWidth: 40, color: 'var(--tide-muted)' }}>
        {event.allDay ? '·' : event.time}
      </span>
      <Pip person={event.person} />
      <span style={{ color: 'var(--tide-ink)', opacity: 0.92 }}>{event.summary}</span>
    </div>
  )
}

export function NowLine() {
  return <div className="tide-nowline" />
}

export function EmptyHint({ children }) {
  return <p className="tide-sub" style={{ fontSize: 13, margin: '4px 0' }}>{children}</p>
}

// amounts are stored in pounds (e.g. 0.5 -> "£0.50")
export function formatGBP(pounds) {
  const n = Number(pounds) || 0
  return `£${n.toFixed(2)}`
}
