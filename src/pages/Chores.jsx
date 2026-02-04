import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { 
  UserAvatar, Button, Card, Input, Badge, 
  SelectInput, SelectOption, SwitchInput, Modal 
} from '../components/ui'
import { PlusIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'
import { 
  getChores, getEarnings, addChore, deleteChore, payOutChores,
  getChoreTemplates, addChoreTemplate, deleteChoreTemplate,
  getChoreCompletions, markChoreDone, approveCompletion, deleteCompletion,
  hasCompletionToday, getTodayCompletion, hasCompletionThisWeek, getThisWeekCompletion
} from '../lib/data'

export default function ChoresPage() {
  const { user, users } = useUser()
  const [chores, setChores] = useState([])
  const [completions, setCompletions] = useState([])
  const [templates, setTemplates] = useState([])
  const [earnings, setEarnings] = useState([])
  const [newChore, setNewChore] = useState({ title: '', assigned_to: '', paid: false, amount: 0, recurring: '' })
  const [newTemplate, setNewTemplate] = useState({ title: '', defaultAmount: 0, paid: false, suggestedRecurring: '' })
  const [loading, setLoading] = useState(true)
  const [showAddChore, setShowAddChore] = useState(false)
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [showCompletionLog, setShowCompletionLog] = useState(false)
  const [quickAddChild, setQuickAddChild] = useState(null)

  const loadData = async () => {
    try {
      const [choresData, earningsData, templatesData, completionsData] = await Promise.all([
        getChores(),
        getEarnings(),
        getChoreTemplates(),
        getChoreCompletions()
      ])
      // Normalize field names
      setChores(choresData.map(c => ({
        ...c,
        assigned_to: c.assignedTo || c.assigned_to,
      })))
      setEarnings(earningsData)
      setTemplates(templatesData)
      setCompletions(completionsData)
    } catch (e) {
      console.error('Error loading data:', e)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleAddChore = async (e) => {
    e.preventDefault()
    if (!newChore.title || !newChore.assigned_to) return
    try {
      await addChore({
        ...newChore,
        recurring: newChore.recurring || null
      })
      setNewChore({ title: '', assigned_to: '', paid: false, amount: 0, recurring: '' })
      setShowAddChore(false)
      loadData()
    } catch (e) {
      console.error('Error adding chore:', e)
    }
  }

  const handleAddTemplate = async (e) => {
    e.preventDefault()
    if (!newTemplate.title) return
    try {
      await addChoreTemplate({
        ...newTemplate,
        suggestedRecurring: newTemplate.suggestedRecurring || null
      })
      setNewTemplate({ title: '', defaultAmount: 0, paid: false, suggestedRecurring: '' })
      setShowAddTemplate(false)
      loadData()
    } catch (e) {
      console.error('Error adding template:', e)
    }
  }

  const handleQuickAdd = async (template, childId) => {
    try {
      await addChore({
        title: template.title,
        assigned_to: childId,
        paid: template.paid,
        amount: template.defaultAmount || 0,
        recurring: template.suggestedRecurring || null,
        templateId: template.id
      })
      setQuickAddChild(null)
      loadData()
    } catch (e) {
      console.error('Error quick adding chore:', e)
    }
  }

  const handleMarkDone = async (choreId) => {
    try {
      await markChoreDone(choreId)
      loadData()
    } catch (e) {
      console.error('Error marking done:', e)
    }
  }

  const handleApprove = async (completionId) => {
    try {
      await approveCompletion(completionId)
      loadData()
    } catch (e) {
      console.error('Error approving:', e)
    }
  }

  const handleUndoCompletion = async (completionId) => {
    try {
      await deleteCompletion(completionId)
      loadData()
    } catch (e) {
      console.error('Error undoing completion:', e)
    }
  }

  const handleDeleteChore = async (id) => {
    try {
      await deleteChore(id)
      loadData()
    } catch (e) {
      console.error('Error deleting chore:', e)
    }
  }

  const handleDeleteTemplate = async (id) => {
    try {
      await deleteChoreTemplate(id)
      loadData()
    } catch (e) {
      console.error('Error deleting template:', e)
    }
  }

  const isParent = user?.role === 'parent'
  const children = users.filter(u => u.role === 'child')
  
  // Filter chores: 
  // - Parents see all
  // - Kids see only their own
  // - Weekly chores are hidden if completed this week
  const visibleChores = chores.filter(c => {
    const isMyChore = c.assigned_to === user?.id || c.assignedTo === user?.id
    
    // Kids only see their own chores
    if (!isParent && !isMyChore) return false
    
    // Hide weekly chores that are done this week (for kids)
    // Parents see all to manage them
    if (!isParent && c.recurring === 'weekly') {
      const doneThisWeek = hasCompletionThisWeek(completions, c.id)
      if (doneThisWeek) return false
    }
    
    return true
  })

  // Get pending completions (done but not approved)
  const pendingCompletions = completions.filter(c => !c.approved && !c.paidOut)
  
  // Get recent completions for log (last 20, sorted by date)
  const recentCompletions = [...completions]
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 20)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-teal-400 text-xl">Loading chores...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      {earnings.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>💰</span> {isParent ? 'Earnings Summary' : 'My Earnings'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {earnings
              .filter(e => isParent || e.user.id === user?.id)
              .map(e => (
              <div key={e.user.id} className="bg-slate-700/50 rounded-lg p-4 text-center">
                <UserAvatar user={e.user} size="md" />
                <p className="text-white font-medium mt-2">{e.user.display_name}</p>
                <p className="text-2xl font-bold text-teal-400">£{(e.total / 100).toFixed(2)}</p>
                <p className="text-xs text-slate-400">{e.chores} chores</p>
                {isParent && e.total > 0 && (
                  <Button 
                    size="sm" 
                    variant="success" 
                    className="mt-2"
                    onClick={async () => {
                      await payOutChores(e.user.id)
                      loadData()
                    }}
                  >
                    💸 Pay Out
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pending Approvals (Parents only) */}
      {isParent && pendingCompletions.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>⏳</span> Pending Approval ({pendingCompletions.length})
          </h2>
          <div className="space-y-2">
            {pendingCompletions.map(completion => {
              const assignee = users.find(u => u.id === completion.userId)
              return (
                <div key={completion.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={assignee} size="sm" />
                    <div>
                      <span className="text-white font-medium">{completion.choreTitle}</span>
                      {completion.amount > 0 && (
                        <Badge variant="success" className="ml-2">£{(completion.amount / 100).toFixed(2)}</Badge>
                      )}
                      <p className="text-xs text-slate-400">
                        {new Date(completion.completedAt).toLocaleDateString()} at {new Date(completion.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="success" size="sm" onClick={() => handleApprove(completion.id)}>
                      ✓ Approve
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleUndoCompletion(completion.id)}>
                      ×
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Quick Add (Parents only) */}
      {isParent && templates.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>⚡</span> Quick Add
          </h2>
          <div className="flex flex-wrap gap-2">
            {templates.map(template => (
              <div key={template.id} className="relative group">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setQuickAddChild(quickAddChild === template.id ? null : template.id)}
                  className="flex items-center gap-1"
                >
                  {template.title}
                  {template.paid && <span className="text-emerald-400 text-xs">£{(template.defaultAmount / 100).toFixed(2)}</span>}
                </Button>
                {quickAddChild === template.id && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-2 z-10 min-w-32">
                    <p className="text-xs text-slate-400 mb-2">Assign to:</p>
                    {children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => handleQuickAdd(template, child.id)}
                        className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-slate-700 text-left"
                      >
                        <span>{child.avatar}</span>
                        <span className="text-white text-sm">{child.displayName || child.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setShowAddTemplate(true)}>
              <PlusIcon className="w-4 h-4" /> Template
            </Button>
          </div>
        </Card>
      )}

      {/* Chores Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <span>✅</span> Active Chores
        </h2>
        {isParent && (
          <Button onClick={() => setShowAddChore(true)}>
            <PlusIcon className="w-4 h-4" /> Add Chore
          </Button>
        )}
      </div>

      {/* Chores List */}
      {visibleChores.length === 0 ? (
        <Card className="text-center py-12">
          <span className="text-4xl mb-4 block">🎉</span>
          <p className="text-slate-400">{isParent ? 'No chores yet! Time to add some tasks.' : 'No chores for you right now!'}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleChores.map(chore => {
            const assignee = users.find(u => u.id === chore.assigned_to || u.id === chore.assignedTo)
            const isMyChore = (chore.assigned_to === user.id) || (chore.assignedTo === user.id)
            
            // Check completion status based on recurring type
            const isDaily = chore.recurring === 'daily'
            const isWeekly = chore.recurring === 'weekly'
            
            // Get relevant completion based on type
            const todayCompletion = getTodayCompletion(completions, chore.id)
            const thisWeekCompletion = getThisWeekCompletion(completions, chore.id)
            const allCompletions = completions.filter(c => c.choreId === chore.id)
            const latestCompletion = allCompletions.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0]
            
            // Determine if done based on type:
            // - Daily: done if completed today
            // - Weekly: done if completed this week
            // - One-time: done if any completion exists
            const relevantCompletion = isDaily ? todayCompletion 
                                     : isWeekly ? thisWeekCompletion 
                                     : latestCompletion
            const isDone = !!relevantCompletion
            const isApproved = relevantCompletion?.approved
            const isPaidOut = relevantCompletion?.paidOut

            return (
              <Card key={chore.id} className={`${isDone ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Checkbox for assignee */}
                  {isMyChore && !isDone && (
                    <button
                      onClick={() => handleMarkDone(chore.id)}
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
                      <span className="text-sm text-slate-400">{assignee?.display_name || assignee?.displayName}</span>
                      {isDone && isApproved && isPaidOut && (
                        <Badge variant="default">Paid ✓</Badge>
                      )}
                      {isDone && isApproved && !isPaidOut && (
                        <Badge variant="success">Approved ✓</Badge>
                      )}
                      {isDone && !isApproved && (
                        <Badge variant="warning">Pending approval</Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isParent && (
                      <Button variant="danger" size="sm" onClick={() => handleDeleteChore(chore.id)}>
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

      {/* Completion Log (Parents only) */}
      {isParent && recentCompletions.length > 0 && (
        <Card>
          <button
            onClick={() => setShowCompletionLog(!showCompletionLog)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>📋</span> Completion Log
            </h2>
            {showCompletionLog ? (
              <ChevronUpIcon className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-slate-400" />
            )}
          </button>
          
          {showCompletionLog && (
            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
              {recentCompletions.map(completion => {
                const assignee = users.find(u => u.id === completion.userId)
                return (
                  <div key={completion.id} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <UserAvatar user={assignee} size="sm" />
                      <span className="text-white">{completion.choreTitle}</span>
                      {completion.amount > 0 && (
                        <span className="text-emerald-400">£{(completion.amount / 100).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {new Date(completion.completedAt).toLocaleDateString()}
                      </span>
                      {completion.paidOut ? (
                        <Badge variant="default" className="text-xs">Paid</Badge>
                      ) : completion.approved ? (
                        <Badge variant="success" className="text-xs">Approved</Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs">Pending</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Template Management (Parents only) */}
      {isParent && (
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📝</span> Chore Templates
          </h2>
          {templates.length === 0 ? (
            <p className="text-slate-400 text-sm">No templates yet. Add some to enable quick assign!</p>
          ) : (
            <div className="space-y-2">
              {templates.map(template => (
                <div key={template.id} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white">{template.title}</span>
                    {template.suggestedRecurring && (
                      <Badge variant="teal" className="text-xs">
                        {template.suggestedRecurring === 'daily' ? 'Daily' : 'Weekly'}
                      </Badge>
                    )}
                    {template.paid && (
                      <Badge variant="success" className="text-xs">
                        £{(template.defaultAmount / 100).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setShowAddTemplate(true)}>
            <PlusIcon className="w-4 h-4" /> Add Template
          </Button>
        </Card>
      )}

      {/* Add Chore Modal */}
      <Modal open={showAddChore} onOpenChange={setShowAddChore} title="Add New Chore">
        <form onSubmit={handleAddChore} className="space-y-4">
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
              onValueChange={v => setNewChore({ ...newChore, assigned_to: v })}
              placeholder="Select child..."
            >
              {children.map(c => (
                <SelectOption key={c.id} value={c.id.toString()}>
                  {c.avatar} {c.display_name || c.displayName}
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

      {/* Add Template Modal */}
      <Modal open={showAddTemplate} onOpenChange={setShowAddTemplate} title="Add Chore Template">
        <form onSubmit={handleAddTemplate} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Template Name</label>
            <Input
              type="text"
              placeholder="e.g. Hoover downstairs"
              value={newTemplate.title}
              onChange={e => setNewTemplate({ ...newTemplate, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Suggested Recurring</label>
            <SelectInput
              value={newTemplate.suggestedRecurring || 'none'}
              onValueChange={v => setNewTemplate({ ...newTemplate, suggestedRecurring: v === 'none' ? '' : v })}
              placeholder="One-time"
            >
              <SelectOption value="none">One-time</SelectOption>
              <SelectOption value="daily">Daily</SelectOption>
              <SelectOption value="weekly">Weekly</SelectOption>
            </SelectInput>
          </div>

          <div className="flex items-center gap-4">
            <SwitchInput
              checked={newTemplate.paid}
              onCheckedChange={v => setNewTemplate({ ...newTemplate, paid: v })}
              label="Paid chore"
            />
            {newTemplate.paid && (
              <Input
                type="number"
                placeholder="Pence"
                value={newTemplate.defaultAmount || ''}
                onChange={e => setNewTemplate({ ...newTemplate, defaultAmount: parseInt(e.target.value) || 0 })}
                className="w-24"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddTemplate(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
