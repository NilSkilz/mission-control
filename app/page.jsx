'use client'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import { 
  UserAvatar, Button, Card, Input, Badge, 
  SelectInput, SelectOption, CheckboxItem, SwitchInput, Modal 
} from './components/ui'
import { PlusIcon } from '@radix-ui/react-icons'

export default function Home() {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [chores, setChores] = useState([])
  const [earnings, setEarnings] = useState([])
  const [newChore, setNewChore] = useState({ title: '', assigned_to: '', paid: false, amount: 0, recurring: '' })
  const [loading, setLoading] = useState(true)
  const [showAddChore, setShowAddChore] = useState(false)

  const loadData = async () => {
    const [me, usersData, choresData, earningsData] = await Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
      fetch('/api/chores').then(r => r.json()),
      fetch('/api/earnings').then(r => r.json())
    ])
    setUser(me.user)
    setUsers(usersData)
    setChores(choresData)
    setEarnings(earningsData)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const login = async (username) => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    })
    loadData()
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  const addChore = async (e) => {
    e.preventDefault()
    if (!newChore.title || !newChore.assigned_to) return
    await fetch('/api/chores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newChore,
        recurring: newChore.recurring || null
      })
    })
    setNewChore({ title: '', assigned_to: '', paid: false, amount: 0, recurring: '' })
    setShowAddChore(false)
    loadData()
  }

  const markDone = async (id) => {
    await fetch(`/api/chores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true })
    })
    loadData()
  }

  const approve = async (id) => {
    await fetch(`/api/chores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true })
    })
    loadData()
  }

  const deleteChore = async (id) => {
    await fetch(`/api/chores/${id}`, { method: 'DELETE' })
    loadData()
  }

  const isParent = user?.role === 'parent'
  const children = users.filter(u => u.role === 'child')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-teal-400 text-xl">Loading...</div>
      </div>
    )
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center mb-12">
          <span className="text-6xl mb-4 block">🚀</span>
          <h1 className="text-4xl font-bold text-white mb-2">Mission Control</h1>
          <p className="text-slate-400">Who are you?</p>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => login(u.username)}
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
      </div>
    )
  }

  return (
    <Layout user={user} users={users} onLogout={logout} currentPage="chores">
      <div className="space-y-6">
        {/* Earnings Summary */}
        {isParent && earnings.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>💰</span> Earnings Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {earnings.map(e => (
                <div key={e.user.id} className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <UserAvatar user={e.user} size="md" />
                  <p className="text-white font-medium mt-2">{e.user.display_name}</p>
                  <p className="text-2xl font-bold text-teal-400">£{(e.total / 100).toFixed(2)}</p>
                  <p className="text-xs text-slate-400">{e.chores} chores</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Chores Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <span>✅</span> Chores
          </h2>
          {isParent && (
            <Button onClick={() => setShowAddChore(true)}>
              <PlusIcon className="w-4 h-4" /> Add Chore
            </Button>
          )}
        </div>

        {/* Chores List */}
        {chores.length === 0 ? (
          <Card className="text-center py-12">
            <span className="text-4xl mb-4 block">🎉</span>
            <p className="text-slate-400">No chores yet! Time to add some tasks.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {chores.map(chore => {
              const assignee = users.find(u => u.id === chore.assigned_to)
              const isMyChore = chore.assigned_to === user.id
              const isDone = chore.done === 1 || chore.done === true
              const isApproved = chore.approved === 1 || chore.approved === true

              return (
                <Card key={chore.id} className={`${isDone ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}>
                  <div className="flex items-start gap-4">
                    {/* Checkbox for assignee */}
                    {isMyChore && !isDone && (
                      <button
                        onClick={() => markDone(chore.id)}
                        className="mt-1 w-6 h-6 rounded-full border-2 border-slate-600 hover:border-teal-500 flex items-center justify-center transition-colors"
                      />
                    )}
                    {isDone && (
                      <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                    {!isMyChore && !isDone && <div className="w-6" />}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${isDone ? 'line-through text-slate-500' : 'text-white'}`}>
                          {chore.title}
                        </span>
                        {chore.recurring && (
                          <Badge variant="teal">
                            {chore.recurring === 'daily' ? '📅 Daily' : '📆 Weekly'}
                          </Badge>
                        )}
                        {chore.paid ? (
                          <Badge variant="success">£{(chore.amount / 100).toFixed(2)}</Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <UserAvatar user={assignee} size="sm" />
                        <span className="text-sm text-slate-400">{assignee?.display_name}</span>
                        {isDone && isApproved && (
                          <Badge variant="success">Approved ✓</Badge>
                        )}
                        {isDone && !isApproved && (
                          <Badge variant="warning">Pending approval</Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isDone && !isApproved && isParent && (
                        <Button variant="success" size="sm" onClick={() => approve(chore.id)}>
                          Approve
                        </Button>
                      )}
                      {isParent && (
                        <Button variant="danger" size="sm" onClick={() => deleteChore(chore.id)}>
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Chore Modal */}
      <Modal open={showAddChore} onOpenChange={setShowAddChore} title="Add New Chore">
        <form onSubmit={addChore} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Chore Title</label>
            <Input
              type="text"
              placeholder="e.g. Clean bedroom"
              value={newChore.title}
              onChange={e => setNewChore({ ...newChore, title: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">Assign To</label>
            <SelectInput
              value={newChore.assigned_to?.toString() || ''}
              onValueChange={v => setNewChore({ ...newChore, assigned_to: parseInt(v) })}
              placeholder="Select child..."
            >
              {children.map(c => (
                <SelectOption key={c.id} value={c.id.toString()}>
                  {c.avatar} {c.display_name}
                </SelectOption>
              ))}
            </SelectInput>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Recurring</label>
            <SelectInput
              value={newChore.recurring || 'none'}
              onValueChange={v => setNewChore({ ...newChore, recurring: v === 'none' ? '' : v })}
              placeholder="One-time"
            >
              <SelectOption value="none">One-time</SelectOption>
              <SelectOption value="daily">Daily</SelectOption>
              <SelectOption value="weekly">Weekly</SelectOption>
            </SelectInput>
          </div>

          <div className="flex items-center gap-4">
            <SwitchInput
              checked={newChore.paid}
              onCheckedChange={v => setNewChore({ ...newChore, paid: v })}
              label="Paid chore"
            />
            {newChore.paid && (
              <Input
                type="number"
                placeholder="Pence"
                value={newChore.amount || ''}
                onChange={e => setNewChore({ ...newChore, amount: parseInt(e.target.value) || 0 })}
                className="w-24"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddChore(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Chore
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
