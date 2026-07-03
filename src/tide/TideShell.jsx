import { Link, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useTideTheme } from './TideThemeProvider'
import { personColor, initial, firstName } from './people'

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5',
  calendar: 'M4 7h16M4 7v13h16V7M4 7l0-2m16 2 0-2M8 3v4m8-4v4',
  chores: 'M4 12l5 5L20 6',
  notes: 'M4 5h16v11H9l-5 4V5z',
  meals: 'M5 3v8m3-8v8m-3 0v10M8 11v10M15 3c-1.5 1-2 3-2 5s.5 3 2 3 2-1 2-3-.5-4-2-5zm.5 8v10',
  cinema: 'M4 5h16v14H4zM4 9h16M8 5v4m8-4v4M8 19v-4m8 4v-4M4 15h16',
  house: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M10 21v-6h4v6',
}

function NavIcon({ name }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  )
}

// Family screens. `parentsOnly` items only appear for parents; the management
// bits (meal editing, admin) are further gated on their routes.
const NAV = [
  { key: 'home', label: 'home', to: '/', icon: 'home' },
  { key: 'calendar', label: 'calendar', to: '/calendar', icon: 'calendar' },
  { key: 'chores', label: 'chores', to: '/chores', icon: 'chores' },
  { key: 'meals', label: 'meals', to: '/meals', icon: 'meals' },
  { key: 'notes', label: 'notes', to: '/notes', icon: 'notes' },
  { key: 'cinema', label: 'cinema', to: '/cinema', icon: 'cinema' },
  { key: 'house', label: 'house', to: '/house', icon: 'house' },
]

function currentKey(pathname) {
  if (pathname === '/') return 'home'
  const seg = pathname.split('/')[1]
  if (seg === 'shopping') return 'meals'
  return seg || 'home'
}

function ThemeToggle() {
  const { mode, phase, cycleMode } = useTideTheme()
  const label = mode === 'auto' ? `auto · ${phase}` : mode
  const glyph = mode === 'auto' ? '◐' : phase === 'day' ? '☀' : '☾'
  return (
    <button
      className="tide-btn tide-btn-ghost"
      onClick={cycleMode}
      title={`Theme: ${label} (tap to change)`}
      style={{ fontSize: 13, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{glyph}</span>
      <span style={{ opacity: 0.7 }}>{label}</span>
    </button>
  )
}

function Avatar({ user, size = 30 }) {
  return (
    <span
      className="tide-avatar"
      style={{ width: size, height: size, background: personColor(user), fontSize: size * 0.42 }}
    >
      {initial(user)}
    </span>
  )
}

export default function TideShell({ children }) {
  const { user, logout } = useUser()
  const location = useLocation()
  const active = currentKey(location.pathname)
  const isParent = user?.role === 'parent'

  return (
    <div className="tide-shell">
      {/* gradient for active mobile tab icons */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <linearGradient id="tideTabGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f08c5a" />
            <stop offset="100%" stopColor="#d96d8f" />
          </linearGradient>
        </defs>
      </svg>

      <div className="tide-glow" />

      <div className="tide-content">
        {/* top bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '14px 20px',
            maxWidth: 1120,
            margin: '0 auto',
          }}
        >
          <Link to="/" className="tide-logo">
            stokes<span className="tide-grad">hq</span>
          </Link>

          <nav className="tide-nav tide-nav-desktop">
            {NAV.map((item) => (
              <Link key={item.key} to={item.to} className={active === item.key ? 'on' : ''}>
                {item.label}
              </Link>
            ))}
            {isParent && (
              <Link to="/system" className={active === 'system' ? 'on' : ''}>
                system
              </Link>
            )}
          </nav>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/jarvis" className="tide-pill">💬 jarvis</Link>
            <ThemeToggle />
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar user={user} />
                <span className="tide-nav-desktop" style={{ fontSize: 13, fontWeight: 600 }}>
                  {firstName(user)}
                </span>
                <button
                  className="tide-btn tide-btn-ghost"
                  onClick={logout}
                  style={{ fontSize: 12, padding: '5px 11px' }}
                >
                  out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* page */}
        <main style={{ maxWidth: 1120, margin: '0 auto', padding: '6px 20px 96px' }}>
          {children}
        </main>
      </div>

      {/* mobile bottom nav */}
      <nav className="tide-tabbar tide-nav-mobile">
        {NAV.map((item) => (
          <Link key={item.key} to={item.to} className={active === item.key ? 'on' : ''}>
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
