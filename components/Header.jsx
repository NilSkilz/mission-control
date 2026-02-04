'use client'

export default function Header({ user, onLogout }) {
  if (!user) return null
  
  return (
    <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xl">
          {user.avatar || '👤'}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Mission Control</h1>
          <p className="text-sm text-slate-400">Welcome, {user.display_name}</p>
        </div>
      </div>
      <button 
        onClick={onLogout}
        className="btn btn-ghost btn-sm"
      >
        Logout
      </button>
    </header>
  )
}
