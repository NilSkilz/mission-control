'use client'
import { useUser } from './UserContext'

export default function LoginScreen() {
  const { users, login } = useUser()
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-4xl shadow-lg">
            🏠
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Mission Control</h1>
          <p className="text-slate-400">Who's checking in?</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => login(u.username)}
              className="group p-5 bg-slate-800 border border-slate-700 rounded-2xl text-center hover:border-teal-500 hover:bg-slate-700/50 transition-all duration-200"
            >
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                {u.avatar || '👤'}
              </div>
              <span className="text-lg font-semibold text-white">{u.display_name}</span>
              <span className="block text-xs text-slate-500 mt-1 capitalize">{u.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
