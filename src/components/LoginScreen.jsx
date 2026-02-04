import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { UserAvatar, Button, Input, Card } from './ui'

export default function LoginScreen() {
  const { users, login } = useUser()
  const navigate = useNavigate()
  const [selectedUser, setSelectedUser] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    setPassword('')
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!selectedUser || !password) return
    
    setLoading(true)
    setError('')
    
    try {
      await login(selectedUser.username, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setSelectedUser(null)
    setPassword('')
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <span className="text-6xl mb-4 block">🚀</span>
        <h1 className="text-4xl font-bold text-white mb-2">Mission Control</h1>
        <p className="text-slate-400">
          {selectedUser ? `Welcome back, ${selectedUser.display_name}!` : 'Who are you?'}
        </p>
      </div>

      {!selectedUser ? (
        // User selection grid
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => handleSelectUser(u)}
              className="p-6 bg-slate-800 border border-slate-700 rounded-xl hover:border-teal-500 hover:bg-slate-800/80 transition-all group"
            >
              <UserAvatar user={u} size="lg" />
              <span className="block mt-3 text-lg font-medium text-white group-hover:text-teal-400 transition-colors">
                {u.display_name}
              </span>
              <span className="text-xs text-slate-500 capitalize">{u.role}</span>
            </button>
          ))}
        </div>
      ) : (
        // Password entry
        <Card className="w-full max-w-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center mb-4">
              <UserAvatar user={selectedUser} size="lg" />
              <p className="mt-2 text-white font-medium">{selectedUser.display_name}</p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button type="submit" disabled={!password || loading} className="flex-1">
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
