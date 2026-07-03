import { Link, useLocation } from 'react-router-dom'

// Wraps the legacy sci-fi / system pages unchanged, adding only a slim bar to
// get back to the family shell. The terminal aesthetic inside stays untouched.
const SYS_NAV = [
  { to: '/system', label: 'dashboard' },
  { to: '/system/agents', label: 'agents' },
  { to: '/system/admin', label: 'admin' },
  { to: '/system/documents', label: 'documents' },
  { to: '/system/timeline', label: 'timeline' },
]

export default function SystemFrame({ children }) {
  const { pathname } = useLocation()
  return (
    <div style={{ minHeight: '100vh' }}>
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: 16,
          padding: '8px 16px', background: 'rgba(10,14,25,0.82)', backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(148,163,184,0.15)', fontFamily: 'ui-monospace, Menlo, monospace',
        }}
      >
        <Link to="/" style={{ color: '#5eead4', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
          ← stokeshq
        </Link>
        <span style={{ color: '#334155' }}>/</span>
        <nav style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {SYS_NAV.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              style={{
                fontSize: 12, textDecoration: 'none',
                color: pathname === i.to ? '#2dd4bf' : '#64748b',
              }}
            >
              {i.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  )
}
