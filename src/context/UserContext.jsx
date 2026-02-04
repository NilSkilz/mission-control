import { createContext, useContext, useState, useEffect } from 'react'
import { getUsers } from '../lib/data'

const UserContext = createContext(null)

// Hardcoded passwords for client-side auth
const PASSWORDS = {
  rob: 'family123',
  aimee: 'family123',
  dexter: 'dexter1',
  logan: 'logan1',
}

// Mock users for when Amplify isn't configured
const MOCK_USERS = [
  { id: '1', username: 'rob', displayName: 'Rob', display_name: 'Rob', role: 'parent', avatar: '👨' },
  { id: '2', username: 'aimee', displayName: 'Aimee', display_name: 'Aimee', role: 'parent', avatar: '👩' },
  { id: '3', username: 'dexter', displayName: 'Dexter', display_name: 'Dexter', role: 'child', avatar: '🧒' },
  { id: '4', username: 'logan', displayName: 'Logan', display_name: 'Logan', role: 'child', avatar: '👦' },
]

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load users from Amplify or use mock data
    async function loadUsers() {
      try {
        const data = await getUsers()
        // Normalize field names (Amplify uses camelCase)
        const normalized = data.map(u => ({
          ...u,
          display_name: u.displayName || u.display_name,
        }))
        setUsers(normalized.length > 0 ? normalized : MOCK_USERS)
      } catch (e) {
        console.warn('Using mock users:', e.message)
        setUsers(MOCK_USERS)
      }
      
      // Check for saved session
      const saved = localStorage.getItem('mission-control-user')
      if (saved) {
        try {
          setUser(JSON.parse(saved))
        } catch (e) {
          localStorage.removeItem('mission-control-user')
        }
      }
      setLoading(false)
    }
    
    loadUsers()
  }, [])

  const login = async (username, password) => {
    const expectedPassword = PASSWORDS[username.toLowerCase()]
    if (!expectedPassword) {
      throw new Error('Unknown user')
    }
    if (password !== expectedPassword) {
      throw new Error('Incorrect password')
    }
    
    // Find user
    const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase())
    if (!foundUser) {
      throw new Error('User not found')
    }
    
    // Save to state and localStorage
    setUser(foundUser)
    localStorage.setItem('mission-control-user', JSON.stringify(foundUser))
    return foundUser
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('mission-control-user')
  }

  return (
    <UserContext.Provider value={{ user, users, loading, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used within UserProvider')
  return context
}
