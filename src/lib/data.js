import { generateClient } from 'aws-amplify/data'

// Amplify is configured in main.jsx at startup
// Generate the client once
const client = generateClient()

async function getClient() {
  return client
}

// Helper to check if client is available
async function requireClient() {
  const c = await getClient()
  if (!c) {
    throw new Error('Amplify not configured. Run `npx ampx sandbox` to start local development.')
  }
  return c
}

// ==================== USERS ====================

export async function getUsers() {
  const c = await getClient()
  if (!c) return []
  
  try {
    const { data, errors } = await c.models.User.list()
    if (errors) {
      console.error('Error fetching users:', errors)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('getUsers failed:', e.message)
    return []
  }
}

export async function getUserById(id) {
  const c = await requireClient()
  const { data, errors } = await c.models.User.get({ id })
  if (errors) {
    console.error('Error fetching user:', errors)
    return null
  }
  return data || null
}

export async function getUserByUsername(username) {
  const c = await requireClient()
  const { data, errors } = await c.models.User.list({
    filter: { username: { eq: username } },
  })
  if (errors) {
    console.error('Error fetching user by username:', errors)
    return null
  }
  return data?.[0] || null
}

export async function createUser(user) {
  const c = await requireClient()
  const { data, errors } = await c.models.User.create({
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    avatar: user.avatar || null,
  })
  if (errors) {
    console.error('Error creating user:', errors)
    throw new Error('Failed to create user')
  }
  return data.id
}

// ==================== CHORE TEMPLATES ====================

export async function getChoreTemplates() {
  const c = await getClient()
  if (!c) return []
  
  try {
    const { data, errors } = await c.models.ChoreTemplate.list()
    if (errors) {
      console.error('Error fetching chore templates:', errors)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('getChoreTemplates failed:', e.message)
    return []
  }
}

export async function addChoreTemplate(template) {
  const c = await requireClient()
  const { data, errors } = await c.models.ChoreTemplate.create({
    title: template.title,
    defaultAmount: template.defaultAmount || 0,
    paid: template.paid || false,
    suggestedRecurring: template.suggestedRecurring || null,
  })
  if (errors) {
    console.error('Error creating chore template:', errors)
    throw new Error('Failed to create chore template')
  }
  return data.id
}

export async function deleteChoreTemplate(id) {
  const c = await requireClient()
  const { errors } = await c.models.ChoreTemplate.delete({ id })
  if (errors) {
    console.error('Error deleting chore template:', errors)
    throw new Error('Failed to delete chore template')
  }
}

// ==================== CHORES ====================

export async function getChores() {
  const c = await getClient()
  if (!c) return []
  
  try {
    const { data, errors } = await c.models.Chore.list()
    if (errors) {
      console.error('Error fetching chores:', errors)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('getChores failed:', e.message)
    return []
  }
}

export async function getChoreById(id) {
  const c = await requireClient()
  const { data, errors } = await c.models.Chore.get({ id })
  if (errors) {
    console.error('Error fetching chore:', errors)
    return null
  }
  return data || null
}

export async function addChore(chore) {
  const c = await requireClient()
  const { data, errors } = await c.models.Chore.create({
    title: chore.title,
    assignedTo: chore.assigned_to || chore.assignedTo,
    paid: chore.paid ? true : false,
    amount: chore.amount || 0,
    recurring: chore.recurring || null,
    templateId: chore.templateId || null,
  })
  if (errors) {
    console.error('Error creating chore:', errors)
    throw new Error('Failed to create chore')
  }
  return data.id
}

export async function updateChore(id, updates) {
  const c = await requireClient()
  // Convert snake_case to camelCase
  const cleanUpdates = {}
  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key === 'assigned_to' ? 'assignedTo'
               : key === 'template_id' ? 'templateId'
               : key
    cleanUpdates[dbKey] = value
  }

  const { errors } = await c.models.Chore.update({
    id,
    ...cleanUpdates,
  })
  if (errors) {
    console.error('Error updating chore:', errors)
    throw new Error('Failed to update chore')
  }
}

export async function deleteChore(id) {
  const c = await requireClient()
  const { errors } = await c.models.Chore.delete({ id })
  if (errors) {
    console.error('Error deleting chore:', errors)
    throw new Error('Failed to delete chore')
  }
}

// ==================== CHORE COMPLETIONS ====================

export async function getChoreCompletions() {
  const c = await getClient()
  if (!c) return []
  
  try {
    const { data, errors } = await c.models.ChoreCompletion.list()
    if (errors) {
      console.error('Error fetching chore completions:', errors)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('getChoreCompletions failed:', e.message)
    return []
  }
}

export async function getCompletionsForUser(userId) {
  const c = await getClient()
  if (!c) return []
  
  try {
    const { data, errors } = await c.models.ChoreCompletion.list({
      filter: { userId: { eq: userId } },
    })
    if (errors) {
      console.error('Error fetching completions for user:', errors)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('getCompletionsForUser failed:', e.message)
    return []
  }
}

export async function getCompletionsForChore(choreId) {
  const c = await getClient()
  if (!c) return []
  
  try {
    const { data, errors } = await c.models.ChoreCompletion.list({
      filter: { choreId: { eq: choreId } },
    })
    if (errors) {
      console.error('Error fetching completions for chore:', errors)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('getCompletionsForChore failed:', e.message)
    return []
  }
}

// Mark a chore as done - creates a ChoreCompletion record
export async function markChoreDone(choreId) {
  const c = await requireClient()
  
  // Get the chore details
  const chore = await getChoreById(choreId)
  if (!chore) {
    throw new Error('Chore not found')
  }
  
  // Create a completion record
  const now = new Date().toISOString()
  const { data, errors } = await c.models.ChoreCompletion.create({
    choreId: choreId,
    userId: chore.assignedTo,
    choreTitle: chore.title,
    amount: chore.paid ? (chore.amount || 0) : 0,
    completedAt: now,
    approved: false,
    approvedAt: null,
    paidOut: false,
    paidAt: null,
  })
  
  if (errors) {
    console.error('Error creating chore completion:', errors)
    throw new Error('Failed to mark chore as done')
  }
  
  return data.id
}

// Approve a completion
export async function approveCompletion(completionId) {
  const c = await requireClient()
  const { errors } = await c.models.ChoreCompletion.update({
    id: completionId,
    approved: true,
    approvedAt: new Date().toISOString(),
  })
  if (errors) {
    console.error('Error approving completion:', errors)
    throw new Error('Failed to approve completion')
  }
}

// Delete a completion (for undoing accidental marks)
export async function deleteCompletion(completionId) {
  const c = await requireClient()
  const { errors } = await c.models.ChoreCompletion.delete({ id: completionId })
  if (errors) {
    console.error('Error deleting completion:', errors)
    throw new Error('Failed to delete completion')
  }
}

// Pay out all approved unpaid completions for a user
export async function payOutChores(userId) {
  const c = await requireClient()
  const completions = await getCompletionsForUser(userId)
  const now = new Date().toISOString()
  
  // Find all approved but unpaid completions
  const toPay = completions.filter(comp => comp.approved && !comp.paidOut)
  
  for (const completion of toPay) {
    const { errors } = await c.models.ChoreCompletion.update({
      id: completion.id,
      paidOut: true,
      paidAt: now,
    })
    if (errors) {
      console.error('Error marking completion as paid:', errors)
    }
  }
  
  return toPay.length
}

// ==================== MEALS ====================

export async function getMeals() {
  const c = await getClient()
  if (!c) return []
  
  try {
    const { data, errors } = await c.models.Meal.list()
    if (errors) {
      console.error('Error fetching meals:', errors)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('getMeals failed:', e.message)
    return []
  }
}

export async function getMealByDateAndType(date, type) {
  const c = await requireClient()
  const { data, errors } = await c.models.Meal.list({
    filter: {
      date: { eq: date },
      mealType: { eq: type },
    },
  })
  if (errors) {
    console.error('Error fetching meal:', errors)
    return null
  }
  return data?.[0] || null
}

export async function setMeal(date, mealType, meal, mealId = null) {
  const c = await requireClient()
  const existing = await getMealByDateAndType(date, mealType)

  if (existing) {
    if (meal) {
      // Update existing
      const { errors } = await c.models.Meal.update({
        id: existing.id,
        meal,
        mealId,
      })
      if (errors) {
        console.error('Error updating meal:', errors)
        throw new Error('Failed to update meal')
      }
    } else {
      // Delete if meal is empty
      const { errors } = await c.models.Meal.delete({ id: existing.id })
      if (errors) {
        console.error('Error deleting meal:', errors)
        throw new Error('Failed to delete meal')
      }
    }
  } else if (meal) {
    // Create new
    const { errors } = await c.models.Meal.create({
      date,
      mealType,
      meal,
      mealId,
    })
    if (errors) {
      console.error('Error creating meal:', errors)
      throw new Error('Failed to create meal')
    }
  }
}

// ==================== SHOPPING ====================

export async function getShoppingItems() {
  const c = await getClient()
  if (!c) return []
  
  try {
    const { data, errors } = await c.models.ShoppingItem.list()
    if (errors) {
      console.error('Error fetching shopping items:', errors)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('getShoppingItems failed:', e.message)
    return []
  }
}

export async function addShoppingItem(item) {
  const c = await requireClient()
  const { data, errors } = await c.models.ShoppingItem.create({
    name: item.name,
    quantity: item.quantity || 1,
    estimatedCost: item.estimated_cost || item.estimatedCost || null,
    addedBy: item.added_by || item.addedBy || null,
    checked: false,
  })
  if (errors) {
    console.error('Error creating shopping item:', errors)
    throw new Error('Failed to create shopping item')
  }
  return data.id
}

export async function updateShoppingItem(id, updates) {
  const c = await requireClient()
  // Convert snake_case to camelCase
  const cleanUpdates = {}
  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key === 'estimated_cost' ? 'estimatedCost'
               : key === 'added_by' ? 'addedBy'
               : key
    cleanUpdates[dbKey] = value
  }

  const { errors } = await c.models.ShoppingItem.update({
    id,
    ...cleanUpdates,
  })
  if (errors) {
    console.error('Error updating shopping item:', errors)
    throw new Error('Failed to update shopping item')
  }
}

export async function deleteShoppingItem(id) {
  const c = await requireClient()
  const { errors } = await c.models.ShoppingItem.delete({ id })
  if (errors) {
    console.error('Error deleting shopping item:', errors)
    throw new Error('Failed to delete shopping item')
  }
}

export async function clearCheckedItems() {
  const items = await getShoppingItems()
  const checkedItems = items.filter((i) => i.checked)

  for (const item of checkedItems) {
    await deleteShoppingItem(item.id)
  }
}

// ==================== EARNINGS ====================

// Get earnings: sum of unpaid approved completions per child
export async function getEarnings() {
  const users = await getUsers()
  const completions = await getChoreCompletions()
  const children = users.filter((u) => u.role === 'child')

  return children.map((child) => {
    // Find all approved but unpaid completions for this child
    const unpaidCompletions = completions.filter(
      (c) => c.userId === child.id && c.approved && !c.paidOut
    )
    const total = unpaidCompletions.reduce((sum, c) => sum + (c.amount || 0), 0)
    return {
      user: {
        ...child,
        display_name: child.displayName || child.display_name,
      },
      total,
      chores: unpaidCompletions.length,
    }
  })
}

// Helper: get start of today (YYYY-MM-DD)
export function getToday() {
  return new Date().toISOString().split('T')[0]
}

// Helper: get start of this week (Monday)
export function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}

// Helper: check if a chore has been completed today
export function hasCompletionToday(completions, choreId) {
  const today = getToday()
  return completions.some(c => {
    const completedDate = c.completedAt?.split('T')[0]
    return c.choreId === choreId && completedDate === today
  })
}

// Helper: get today's completion for a chore (if exists)
export function getTodayCompletion(completions, choreId) {
  const today = getToday()
  return completions.find(c => {
    const completedDate = c.completedAt?.split('T')[0]
    return c.choreId === choreId && completedDate === today
  })
}

// Helper: check if a chore has been completed this week (since Monday)
export function hasCompletionThisWeek(completions, choreId) {
  const weekStart = getWeekStart()
  return completions.some(c => {
    const completedDate = c.completedAt?.split('T')[0]
    return c.choreId === choreId && completedDate >= weekStart
  })
}

// Helper: get this week's completion for a chore (if exists)
export function getThisWeekCompletion(completions, choreId) {
  const weekStart = getWeekStart()
  return completions.find(c => {
    const completedDate = c.completedAt?.split('T')[0]
    return c.choreId === choreId && completedDate >= weekStart
  })
}
