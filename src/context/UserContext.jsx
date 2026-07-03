import { createContext, useContext, useState, useEffect } from 'react'
import { getPublicUsers, loginRequest, fetchMe, setAuthToken } from '../lib/data'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([]) // public profiles for the login picker
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      // profiles for the "who's home?" picker (public, no auth)
      setUsers(await getPublicUsers())
      // restore a session if a valid token is stored
      try {
        const me = await fetchMe()
        if (me) setUser(me)
      } catch { /* not logged in */ }
      setLoading(false)
    }
    init()
  }, [])

  const login = async (username, password) => {
    const u = await loginRequest(username, password) // stores the token on success
    setUser(u)
    return u
  }

  const logout = () => {
    setAuthToken(null)
    setUser(null)
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
