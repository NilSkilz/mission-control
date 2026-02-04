import fs from 'fs'
import path from 'path'

const DB_PATH = path.resolve(process.cwd(), 'db', 'data.json')

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    return getDefaultDb()
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  // Migrate: ensure new collections exist
  if (!db.meals) db.meals = []
  if (!db.shopping) db.shopping = []
  if (!db.nextId.meals) db.nextId.meals = 1
  if (!db.nextId.shopping) db.nextId.shopping = 1
  return db
}

function getDefaultDb() {
  return {
    users: [],
    chores: [],
    meals: [],
    shopping: [],
    nextId: { users: 1, chores: 1, meals: 1, shopping: 1 }
  }
}

function saveDb(data) {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

// Users
export function getUsers() {
  return loadDb().users
}

export function getUserById(id) {
  return loadDb().users.find(u => u.id === id)
}

export function getUserByUsername(username) {
  return loadDb().users.find(u => u.username === username)
}

// Chores
export function getChores() {
  return loadDb().chores
}

export function addChore(chore) {
  const db = loadDb()
  const id = db.nextId.chores++
  db.chores.push({
    id,
    ...chore,
    done: 0,
    approved: 0,
    completed_at: null,
    recurring: chore.recurring || null, // 'daily' | 'weekly' | null
    created_at: new Date().toISOString()
  })
  saveDb(db)
  return id
}

export function updateChore(id, updates) {
  const db = loadDb()
  const idx = db.chores.findIndex(c => c.id === parseInt(id))
  if (idx >= 0) {
    db.chores[idx] = { ...db.chores[idx], ...updates }
    saveDb(db)
  }
}

export function deleteChore(id) {
  const db = loadDb()
  db.chores = db.chores.filter(c => c.id !== parseInt(id))
  saveDb(db)
}

// Reset recurring chores (call daily via cron or on app load)
export function resetRecurringChores() {
  const db = loadDb()
  const now = new Date()
  const today = now.toDateString()
  
  db.chores.forEach(chore => {
    if (!chore.recurring) return
    if (!chore.last_reset || new Date(chore.last_reset).toDateString() !== today) {
      if (chore.recurring === 'daily') {
        chore.done = 0
        chore.approved = 0
        chore.completed_at = null
        chore.last_reset = now.toISOString()
      } else if (chore.recurring === 'weekly') {
        const lastReset = chore.last_reset ? new Date(chore.last_reset) : new Date(0)
        const daysSince = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24))
        if (daysSince >= 7) {
          chore.done = 0
          chore.approved = 0
          chore.completed_at = null
          chore.last_reset = now.toISOString()
        }
      }
    }
  })
  saveDb(db)
}

// Meals
export function getMeals() {
  return loadDb().meals
}

export function getMealsByWeek(weekStart) {
  const db = loadDb()
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  
  return db.meals.filter(m => {
    const d = new Date(m.date)
    return d >= start && d < end
  })
}

export function setMeal(date, mealType, meal, mealId = null) {
  const db = loadDb()
  const existing = db.meals.findIndex(m => m.date === date && m.type === mealType)
  
  if (existing >= 0) {
    if (meal) {
      db.meals[existing] = { ...db.meals[existing], meal, meal_id: mealId, updated_at: new Date().toISOString() }
    } else {
      db.meals.splice(existing, 1)
    }
  } else if (meal) {
    const id = db.nextId.meals++
    db.meals.push({
      id,
      date,
      type: mealType, // 'breakfast' | 'lunch' | 'dinner'
      meal,
      meal_id: mealId, // reference to meals-data.js ID
      created_at: new Date().toISOString()
    })
  }
  saveDb(db)
}

// Shopping
export function getShoppingItems() {
  return loadDb().shopping
}

export function addShoppingItem(item) {
  const db = loadDb()
  const id = db.nextId.shopping++
  db.shopping.push({
    id,
    name: item.name,
    quantity: item.quantity || 1,
    estimated_cost: item.estimated_cost || null,
    added_by: item.added_by,
    checked: false,
    created_at: new Date().toISOString()
  })
  saveDb(db)
  return id
}

export function updateShoppingItem(id, updates) {
  const db = loadDb()
  const idx = db.shopping.findIndex(i => i.id === parseInt(id))
  if (idx >= 0) {
    db.shopping[idx] = { ...db.shopping[idx], ...updates }
    saveDb(db)
  }
}

export function deleteShoppingItem(id) {
  const db = loadDb()
  db.shopping = db.shopping.filter(i => i.id !== parseInt(id))
  saveDb(db)
}

export function clearCheckedItems() {
  const db = loadDb()
  db.shopping = db.shopping.filter(i => !i.checked)
  saveDb(db)
}

// Get earnings for children
export function getEarnings() {
  const db = loadDb()
  const children = db.users.filter(u => u.role === 'child')
  
  return children.map(child => {
    const approvedChores = db.chores.filter(c => 
      c.assigned_to === child.id && 
      c.approved && 
      c.paid
    )
    const total = approvedChores.reduce((sum, c) => sum + (c.amount || 0), 0)
    return {
      user: child,
      total,
      chores: approvedChores.length
    }
  })
}

export function initDb() {
  if (!fs.existsSync(DB_PATH)) {
    const db = {
      users: [
        { id: 1, username: 'rob', display_name: 'Rob', role: 'parent', avatar: '👨' },
        { id: 2, username: 'aimee', display_name: 'Aimee', role: 'parent', avatar: '👩' },
        { id: 3, username: 'dexter', display_name: 'Dexter', role: 'child', avatar: '👦' },
        { id: 4, username: 'logan', display_name: 'Logan', role: 'child', avatar: '🧒' }
      ],
      chores: [],
      meals: [],
      shopping: [],
      nextId: { users: 5, chores: 1, meals: 1, shopping: 1 }
    }
    saveDb(db)
    console.log('DB initialized at', DB_PATH)
  }
}
