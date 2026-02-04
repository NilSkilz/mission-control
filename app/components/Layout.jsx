'use client'
import { UserAvatar, Button, NavLink } from './ui'

// Navigation items with role-based access
const NAV_ITEMS = [
  { href: '/', key: 'chores', label: 'Chores', roles: ['parent', 'child'] },
  { href: '/meals', key: 'meals', label: 'Meals', roles: ['parent'] },
  { href: '/shopping', key: 'shopping', label: 'Shopping', roles: ['parent'] },
  { href: '/calendar', key: 'calendar', label: 'Calendar', roles: ['parent', 'child'] },
]

export default function Layout({ user, users, onLogout, currentPage, children }) {
  if (!user) return children

  // Filter navigation based on user role
  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <h1 className="text-xl font-bold text-white hidden sm:block">Mission Control</h1>
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
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
