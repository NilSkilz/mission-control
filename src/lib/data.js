import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'

// Try to configure Amplify - file may not exist in dev without sandbox
let amplifyConfigured = false
async function configureAmplify() {
  if (amplifyConfigured) return
  try {
    // Vite needs the full path for dynamic imports
    const response = await fetch('/amplify_outputs.json')
    if (response.ok) {
      const outputs = await response.json()
      Amplify.configure(outputs)
      amplifyConfigured = true
      console.log('Amplify configured successfully')
    }
  } catch (e) {
    console.warn('amplify_outputs.json not available - using mock data')
  }
}

// Lazy-init client
let client = null

async function getClient() {
  if (!amplifyConfigured) {
    await configureAmplify()
  }
  if (!client && amplifyConfigured) {
    try {
      client = generateClient()
    } catch (e) {
      console.warn('Could not create Amplify client:', e.message)
      return null
    }
  }
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
    done: false,
    approved: false,
    completedAt: null,
    recurring: chore.recurring || null,
    lastReset: null,
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
               : key === 'completed_at' ? 'completedAt'
               : key === 'last_reset' ? 'lastReset'
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

export async function getEarnings() {
  const users = await getUsers()
  const chores = await getChores()
  const children = users.filter((u) => u.role === 'child')

  return children.map((child) => {
    const approvedChores = chores.filter(
      (c) => c.assignedTo === child.id && c.approved && c.paid
    )
    const total = approvedChores.reduce((sum, c) => sum + (c.amount || 0), 0)
    return {
      user: {
        ...child,
        display_name: child.displayName || child.display_name,
      },
      total,
      chores: approvedChores.length,
    }
  })
}
