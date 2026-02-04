'use client'
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { Button, Card, Input, Badge, UserAvatar, Modal } from '../components/ui'
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'
import { STAPLES, formatIngredient } from '../../db/meals-data.js'

export default function ShoppingPage() {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [newItemCost, setNewItemCost] = useState('')
  const [staplesOpen, setStaplesOpen] = useState(false)
  const [addingStaples, setAddingStaples] = useState(false)
  const [editingCost, setEditingCost] = useState(null) // { id, cost }
  const [costInput, setCostInput] = useState('')

  const loadData = async () => {
    const [me, usersData, itemsData] = await Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
      fetch('/api/shopping').then(r => r.json())
    ])
    setUser(me.user)
    setUsers(usersData)
    setItems(itemsData)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  const addItem = async (e) => {
    e.preventDefault()
    if (!newItem.trim()) return
    const cost = newItemCost ? parseFloat(newItemCost) : null
    await fetch('/api/shopping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: newItem.trim(),
        estimated_cost: cost
      })
    })
    setNewItem('')
    setNewItemCost('')
    loadData()
  }

  const updateItemCost = async (id, cost) => {
    await fetch(`/api/shopping/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estimated_cost: cost ? parseFloat(cost) : null })
    })
    loadData()
  }

  const openCostEdit = (item) => {
    setEditingCost({ id: item.id, name: item.name })
    setCostInput(item.estimated_cost ? item.estimated_cost.toString() : '')
  }

  const saveCost = async () => {
    if (!editingCost) return
    await updateItemCost(editingCost.id, costInput)
    setEditingCost(null)
    setCostInput('')
  }

  const toggleItem = async (id, checked) => {
    await fetch(`/api/shopping/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked })
    })
    loadData()
  }

  const deleteItem = async (id) => {
    await fetch(`/api/shopping/${id}`, { method: 'DELETE' })
    loadData()
  }

  const clearChecked = async () => {
    await fetch('/api/shopping', { method: 'DELETE' })
    loadData()
  }

  const addStaplesCategory = async (category) => {
    const categoryItems = STAPLES[category]
    if (!categoryItems) return
    
    setAddingStaples(true)
    for (const item of categoryItems) {
      const name = formatIngredient(item, null)
      // Check if already in list (by base name)
      const exists = items.some(i => i.name.toLowerCase().includes(item.name.toLowerCase()))
      if (!exists) {
        await fetch('/api/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        })
      }
    }
    setAddingStaples(false)
    loadData()
  }

  const addAllStaples = async () => {
    setAddingStaples(true)
    for (const [category, categoryItems] of Object.entries(STAPLES)) {
      for (const item of categoryItems) {
        const name = formatIngredient(item, null)
        const exists = items.some(i => i.name.toLowerCase().includes(item.name.toLowerCase()))
        if (!exists) {
          await fetch('/api/shopping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
          })
        }
      }
    }
    setAddingStaples(false)
    loadData()
  }

  const uncheckedItems = items.filter(i => !i.checked)
  const checkedItems = items.filter(i => i.checked)
  
  // Calculate totals
  const uncheckedTotal = uncheckedItems.reduce((sum, i) => sum + (i.estimated_cost || 0), 0)
  const checkedTotal = checkedItems.reduce((sum, i) => sum + (i.estimated_cost || 0), 0)
  const grandTotal = uncheckedTotal + checkedTotal
  const itemsWithCost = items.filter(i => i.estimated_cost).length

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
  }

  const STAPLE_ICONS = {
    fridge: '🥛',
    cupboard: '🥫',
    freezer: '❄️',
    sauces: '🍯',
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

  // Role-based access: only parents can view shopping
  if (user.role === 'child') {
    window.location.href = '/'
    return null
  }

  return (
    <Layout user={user} users={users} onLogout={logout} currentPage="shopping">
      <div className="space-y-6 max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <span>🛒</span> Shopping List
          </h2>
          {checkedItems.length > 0 && (
            <Button variant="danger" size="sm" onClick={clearChecked}>
              <TrashIcon className="w-4 h-4" /> Clear done
            </Button>
          )}
        </div>

        {/* Add Item */}
        <Card>
          <form onSubmit={addItem} className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Add item..."
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="£ cost"
                value={newItemCost}
                onChange={e => setNewItemCost(e.target.value)}
                className="w-24"
              />
              <Button type="submit">
                <PlusIcon className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </Card>

        {/* Cost Summary */}
        {items.length > 0 && (
          <Card className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-teal-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <span className="text-white font-medium">Estimated Total</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-teal-400">{formatCurrency(grandTotal)}</div>
                {itemsWithCost < items.length && (
                  <div className="text-xs text-slate-400">
                    {itemsWithCost} of {items.length} items have costs
                  </div>
                )}
              </div>
            </div>
            {uncheckedTotal > 0 && checkedTotal > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between text-sm">
                <span className="text-slate-400">To buy: {formatCurrency(uncheckedTotal)}</span>
                <span className="text-slate-500">Done: {formatCurrency(checkedTotal)}</span>
              </div>
            )}
          </Card>
        )}

        {/* Weekly Staples Section */}
        <Card className="bg-slate-800/50">
          <button 
            onClick={() => setStaplesOpen(!staplesOpen)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📦</span>
              <span className="text-white font-medium">Weekly Staples</span>
              <Badge variant="teal">Quick add</Badge>
            </div>
            {staplesOpen ? <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400" />}
          </button>
          
          {staplesOpen && (
            <div className="mt-4 space-y-4">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={addAllStaples}
                disabled={addingStaples}
                className="w-full"
              >
                <PlusIcon className="w-4 h-4" />
                {addingStaples ? 'Adding...' : 'Add all staples'}
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STAPLES).map(([category, categoryItems]) => (
                  <button
                    key={category}
                    onClick={() => addStaplesCategory(category)}
                    disabled={addingStaples}
                    className="p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{STAPLE_ICONS[category]}</span>
                      <span className="text-white font-medium capitalize">{category}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {categoryItems.length} items
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="text-xs text-slate-500 space-y-1">
                {Object.entries(STAPLES).map(([category, categoryItems]) => (
                  <div key={category}>
                    <span className="text-slate-400">{STAPLE_ICONS[category]} {category}:</span>{' '}
                    {categoryItems.map(i => i.name).join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Items List */}
        {items.length === 0 ? (
          <Card className="text-center py-12">
            <span className="text-4xl mb-4 block">📝</span>
            <p className="text-slate-400">Shopping list is empty</p>
          </Card>
        ) : (
          <>
            {/* Unchecked items */}
            {uncheckedItems.length > 0 && (
              <div className="space-y-2">
                {uncheckedItems.map(item => {
                  const addedBy = users.find(u => u.id === item.added_by)
                  // Check if item has meal attribution [MealName]
                  const mealMatch = item.name.match(/\[([^\]]+)\]$/)
                  const mealName = mealMatch ? mealMatch[1] : null
                  return (
                    <Card key={item.id} className="flex items-center gap-3 py-3">
                      <button
                        onClick={() => toggleItem(item.id, true)}
                        className="w-6 h-6 rounded-full border-2 border-slate-600 hover:border-teal-500 flex items-center justify-center transition-colors flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-white block truncate">{item.name.replace(/\s*\[[^\]]+\]$/, '')}</span>
                        <div className="flex items-center gap-2">
                          {mealName && (
                            <span className="text-xs text-teal-400">From: {mealName}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openCostEdit(item)}
                        className={`text-sm px-2 py-1 rounded transition-colors ${
                          item.estimated_cost 
                            ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        {item.estimated_cost ? formatCurrency(item.estimated_cost) : '+ £'}
                      </button>
                      {addedBy && (
                        <UserAvatar user={addedBy} size="sm" />
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Checked items */}
            {checkedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <span>Completed</span>
                  <Badge>{checkedItems.length}</Badge>
                  {checkedTotal > 0 && (
                    <span className="text-emerald-500 ml-auto">{formatCurrency(checkedTotal)}</span>
                  )}
                </div>
                {checkedItems.map(item => {
                  const addedBy = users.find(u => u.id === item.added_by)
                  return (
                    <Card key={item.id} className="flex items-center gap-3 py-3 opacity-60">
                      <button
                        onClick={() => toggleItem(item.id, false)}
                        className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
                      >
                        <span className="text-white text-xs">✓</span>
                      </button>
                      <span className="text-slate-400 line-through flex-1">{item.name.replace(/\s*\[[^\]]+\]$/, '')}</span>
                      {item.estimated_cost && (
                        <span className="text-xs text-slate-500">{formatCurrency(item.estimated_cost)}</span>
                      )}
                      {addedBy && (
                        <UserAvatar user={addedBy} size="sm" />
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Stats */}
        {items.length > 0 && (
          <div className="text-center text-slate-500 text-sm">
            {uncheckedItems.length} items to buy • {checkedItems.length} done
          </div>
        )}
      </div>

      {/* Cost Edit Modal */}
      <Modal
        open={!!editingCost}
        onOpenChange={open => !open && setEditingCost(null)}
        title="Edit Estimated Cost"
      >
        <div className="space-y-4">
          <div className="text-slate-300">{editingCost?.name?.replace(/\s*\[[^\]]+\]$/, '')}</div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Estimated cost (£)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={costInput}
              onChange={e => setCostInput(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditingCost(null)}>Cancel</Button>
            <Button onClick={saveCost}>Save</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
