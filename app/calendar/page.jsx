'use client'
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { Card } from '../components/ui'

export default function CalendarPage() {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    const [me, usersData] = await Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/users').then(r => r.json())
    ])
    setUser(me.user)
    setUsers(usersData)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-teal-400 text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    window.location.href = '/'
    return null
  }

  return (
    <Layout user={user} users={users} onLogout={logout} currentPage="calendar">
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <span>📅</span> Calendar
        </h2>

        <Card className="text-center py-16">
          <span className="text-6xl mb-6 block">🚧</span>
          <h3 className="text-2xl font-bold text-white mb-2">Coming Soon</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            We're working on a family calendar to help you track events, appointments, and activities.
          </p>
        </Card>
      </div>
    </Layout>
  )
}
