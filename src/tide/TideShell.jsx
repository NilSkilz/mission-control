import { useState, useEffect } from 'react'
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
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  system: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  lift: 'M4 13l1.8-5.2A2 2 0 0 1 7.7 6.5h8.6a2 2 0 0 1 1.9 1.3L20 13m0 0v4h-2v-1H6v1H4v-4m16 0H4m4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m11 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0',
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
  { key: 'lifts', label: 'lifts', to: '/lifts', icon: 'lift' },
]

// Mobile keeps the daily-use screens as bottom tabs; the rest live behind "More".
const PRIMARY_KEYS = ['home', 'calendar', 'meals', 'chores']
const PRIMARY_NAV = PRIMARY_KEYS.map((k) => NAV.find((i) => i.key === k))
const OVERFLOW_NAV = NAV.filter((i) => !PRIMARY_KEYS.includes(i.key))
// Parent-only management screens — sheet only.
const PARENT_NAV = [
  { key: 'people', label: 'people', to: '/people', icon: 'people' },
  { key: 'system', label: 'system', to: '/system', icon: 'system' },
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
  const [moreOpen, setMoreOpen] = useState(false)

  // Close the More sheet whenever the route changes.
  useEffect(() => { setMoreOpen(false) }, [location.pathname])

  // Close on Escape.
  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  const sheetNav = isParent ? [...OVERFLOW_NAV, ...PARENT_NAV] : OVERFLOW_NAV
  const overflowActive = sheetNav.some((i) => i.key === active)

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
            ti<span className="tide-grad">de</span>
          </Link>

          <nav className="tide-nav tide-nav-desktop">
            {NAV.map((item) => (
              <Link key={item.key} to={item.to} className={active === item.key ? 'on' : ''}>
                {item.label}
              </Link>
            ))}
            {isParent && (
              <>
                <Link to="/people" className={active === 'people' ? 'on' : ''}>people</Link>
                <Link to="/system" className={active === 'system' ? 'on' : ''}>system</Link>
              </>
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

      {/* mobile bottom nav: daily tabs + More */}
      <nav className="tide-tabbar tide-nav-mobile">
        {PRIMARY_NAV.map((item) => (
          <Link key={item.key} to={item.to} className={active === item.key ? 'on' : ''}>
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          className={`tide-more-btn${overflowActive || moreOpen ? ' on' : ''}`}
          onClick={() => setMoreOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={moreOpen}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
          more
        </button>
      </nav>

      {/* More sheet (mobile only) */}
      {moreOpen && (
        <div className="tide-nav-mobile">
          <div className="tide-sheet-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="tide-sheet" role="dialog" aria-label="More navigation">
            <div className="tide-sheet-grip" />
            <div className="tide-sheet-grid">
              {sheetNav.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`tide-sheet-item${active === item.key ? ' on' : ''}`}
                  onClick={() => setMoreOpen(false)}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
