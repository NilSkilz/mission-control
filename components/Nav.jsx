'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Chores', icon: '✓' },
  { href: '/meals', label: 'Meals', icon: '🍽️' },
  { href: '/shopping', label: 'Shopping', icon: '🛒' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
]

export default function Nav() {
  const pathname = usePathname()
  
  return (
    <nav className="flex gap-1 p-1 bg-slate-800/50 rounded-xl mb-6">
      {navItems.map(item => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 px-3 py-2.5 rounded-lg text-center text-sm font-medium transition-all ${
              isActive 
                ? 'bg-teal-500 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <span className="hidden sm:inline mr-2">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
