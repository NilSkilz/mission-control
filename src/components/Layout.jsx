import { useLocation, Link } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { UserAvatar, Button } from './ui'

// Navigation items with role-based access
const NAV_ITEMS = [
  { href: '/', key: 'home', label: 'Home', roles: ['parent', 'child'] },
  { href: '/family/chores', key: 'chores', label: 'Chores', roles: ['parent', 'child'] },
  { href: '/family/meals', key: 'meals', label: 'Meals', roles: ['parent'] },
  { href: '/family/shopping', key: 'shopping', label: 'Shopping', roles: ['parent'] },
  { href: '/family/calendar', key: 'calendar', label: 'Calendar', roles: ['parent', 'child'] },
  { href: '/agents', key: 'agents', label: 'Agents', roles: ['parent'] },
  { href: '/admin', key: 'admin', label: 'System Admin', roles: ['parent'] },
]

function NavLink({ href, active, children }) {
  return (
    <Link
      to={href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-teal-500/20 text-teal-400' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      {children}
    </Link>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useUser()
  const location = useLocation()

  if (!user) return children

  // Determine current page from path
  const getCurrentPage = () => {
    if (location.pathname === '/') return 'home'
    if (location.pathname === '/family/chores') return 'chores'
    if (location.pathname === '/family/meals') return 'meals'
    if (location.pathname === '/family/shopping') return 'shopping'
    if (location.pathname === '/family/calendar') return 'calendar'
    if (location.pathname === '/agents') return 'agents'
    if (location.pathname === '/admin') return 'admin'
    return location.pathname.split('/').pop()
  }
  const currentPage = getCurrentPage()

  // Filter navigation based on user role
  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <h1 className="text-2xl font-bold text-white">Mission Control</h1>
            </div>
            
            <nav className="flex gap-1">
              {visibleNav.map(item => (
                <NavLink key={item.key} href={item.href} active={currentPage === item.key}>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <UserAvatar user={user} size="sm" />
                <span className="text-sm text-slate-300">{user.display_name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  )
}
