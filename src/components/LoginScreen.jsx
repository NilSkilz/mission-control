import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { personColor, initial, firstName } from '../tide/people'

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
      setError(err.message || 'login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tide-shell" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="tide-glow" />
      <div
        className="tide-content"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="tide-logo" style={{ fontSize: 26 }}>
            ti<span className="tide-grad">de</span>
          </div>
          <p className="tide-sub" style={{ marginTop: 10, fontSize: 15 }}>
            {selectedUser ? `hi ${firstName(selectedUser).toLowerCase()}` : "who's home?"}
          </p>
        </div>

        {!selectedUser ? (
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, width: '100%', maxWidth: 380 }}
          >
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className="tide-card"
                style={{ padding: '22px 14px', cursor: 'pointer', textAlign: 'center', border: '1px solid var(--tide-card-border)' }}
              >
                <span
                  className="tide-avatar"
                  style={{ width: 54, height: 54, background: personColor(u), fontSize: 22, margin: '0 auto' }}
                >
                  {initial(u)}
                </span>
                <span style={{ display: 'block', marginTop: 12, fontSize: 16, fontWeight: 700 }}>
                  {firstName(u).toLowerCase()}
                </span>
                <span className="tide-sub" style={{ fontSize: 11 }}>{u.role}</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleLogin} className="tide-card" style={{ width: '100%', maxWidth: 320, padding: 20 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span
                className="tide-avatar"
                style={{ width: 54, height: 54, background: personColor(selectedUser), fontSize: 22, margin: '0 auto' }}
              >
                {initial(selectedUser)}
              </span>
            </div>
            <input
              type="password"
              className="tide-input"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && (
              <p style={{ color: '#e06a6a', fontSize: 13, textAlign: 'center', marginTop: 10 }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className="tide-btn tide-btn-ghost"
                onClick={() => setSelectedUser(null)}
                style={{ flex: 1, padding: '11px 0' }}
              >
                back
              </button>
              <button
                type="submit"
                className="tide-btn tide-btn-primary"
                disabled={!password || loading}
                style={{ flex: 1, padding: '11px 0' }}
              >
                {loading ? '…' : 'go'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
