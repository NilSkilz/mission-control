// Family data layer. Talks to the local SQLite store via /api/family on the
// Express server (replaced the old AWS Amplify/DynamoDB backend). Exported
// function signatures are unchanged from the Amplify era so pages don't care.

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api/family`

// ---- auth token (real server-side auth) ----
const TOKEN_KEY = 'mission-control-token'
let authToken = localStorage.getItem(TOKEN_KEY) || null

export function setAuthToken(token) {
  authToken = token
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}
export function getAuthToken() { return authToken }

export function authHeaders(extra = {}) {
  return authToken ? { ...extra, Authorization: `Bearer ${authToken}` } : extra
}

// A 401 means the token is missing/expired: drop it and bounce to login.
function handleUnauthorized() {
  setAuthToken(null)
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  if (res.status === 401) { handleUnauthorized(); throw new Error('not authenticated') }
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      message = (await res.json()).error || message
    } catch { /* non-JSON error body */ }
    throw new Error(message)
  }
  if (res.status === 204) return null
  return res.json()
}

// List endpoints degrade to [] so pages render without the API (e.g. vite-only dev)
async function safeList(path) {
  try {
    return await request(path)
  } catch (e) {
    console.warn(`GET ${path} failed:`, e.message)
    return []
  }
}

// ==================== AUTH ====================

const AUTH_BASE = `${import.meta.env.VITE_API_URL || ''}/api/auth`

// Public: the login picker needs names/colours before anyone is authenticated.
export async function getPublicUsers() {
  try {
    const res = await fetch(`${AUTH_BASE}/users`)
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export async function loginRequest(username, password) {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    let message = 'login failed'
    try { message = (await res.json()).error || message } catch { /* ignore */ }
    throw new Error(message)
  }
  const { token, user } = await res.json()
  setAuthToken(token)
  return user
}

// Restore a session from a stored token; null if it's missing/expired.
export async function fetchMe() {
  if (!authToken) return null
  try {
    const res = await fetch(`${AUTH_BASE}/me`, { headers: authHeaders() })
    if (!res.ok) { setAuthToken(null); return null }
    return (await res.json()).user
  } catch { return null }
}

// Parent-only people management (token attached by the fetch interceptor).
export async function resetPassword(userId, newPassword) {
  const res = await fetch(`${AUTH_BASE}/reset-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, newPassword }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'reset failed')
  return true
}
export async function addPerson(person) {
  const res = await fetch(`${AUTH_BASE}/people`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(person),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'could not add person')
  return res.json()
}
export async function removePerson(id) {
  const res = await fetch(`${AUTH_BASE}/people/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'could not remove person')
  return true
}

export async function changePassword(userId, currentPassword, newPassword) {
  const res = await fetch(`${AUTH_BASE}/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, currentPassword, newPassword }),
  })
  if (!res.ok) {
    let message = 'could not change password'
    try { message = (await res.json()).error || message } catch { /* ignore */ }
    throw new Error(message)
  }
  return true
}

// ==================== USERS ====================

export async function getUsers() {
  return safeList('/users')
}

export async function getUserById(id) {
  return request(`/users/${id}`)
}

export async function getUserByUsername(username) {
  const users = await getUsers()
  return users.find((u) => u.username === username) || null
}

export async function createUser(user) {
  const created = await request('/users', { method: 'POST', body: user })
  return created.id
}

// ==================== CHORE TEMPLATES ====================

export async function getChoreTemplates() {
  return safeList('/chore-templates')
}

export async function addChoreTemplate(template) {
  const created = await request('/chore-templates', {
    method: 'POST',
    body: {
      title: template.title,
      defaultAmount: template.defaultAmount || 0,
      paid: template.paid || false,
      suggestedRecurring: template.suggestedRecurring || null,
    },
  })
  return created.id
}

export async function deleteChoreTemplate(id) {
  await request(`/chore-templates/${id}`, { method: 'DELETE' })
}

// ==================== CHORES ====================

export async function getChores() {
  return safeList('/chores')
}

export async function getChoreById(id) {
  return request(`/chores/${id}`)
}

export async function addChore(chore) {
  const created = await request('/chores', {
    method: 'POST',
    body: {
      title: chore.title,
      assignedTo: chore.assigned_to || chore.assignedTo,
      paid: !!chore.paid,
      amount: chore.amount || 0,
      recurring: chore.recurring || null,
      templateId: chore.templateId || null,
    },
  })
  return created.id
}

export async function updateChore(id, updates) {
  // Tolerate snake_case callers (pre-Amplify field names)
  const cleanUpdates = {}
  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key === 'assigned_to' ? 'assignedTo'
               : key === 'template_id' ? 'templateId'
               : key
    cleanUpdates[dbKey] = value
  }
  await request(`/chores/${id}`, { method: 'PATCH', body: cleanUpdates })
}

export async function deleteChore(id) {
  await request(`/chores/${id}`, { method: 'DELETE' })
}

// ==================== CHORE COMPLETIONS ====================

export async function getChoreCompletions() {
  return safeList('/completions')
}

export async function getCompletionsForUser(userId) {
  return safeList(`/completions?userId=${encodeURIComponent(userId)}`)
}

export async function getCompletionsForChore(choreId) {
  return safeList(`/completions?choreId=${encodeURIComponent(choreId)}`)
}

// Mark a chore as done - creates a ChoreCompletion record. Pass userId so an
// "anyone" chore gets claimed by whoever ticked it.
export async function markChoreDone(choreId, userId) {
  const completion = await request(`/chores/${choreId}/complete`, { method: 'POST', body: userId ? { userId } : {} })
  return completion.id
}

// Approve a completion
export async function approveCompletion(completionId) {
  await request(`/completions/${completionId}/approve`, { method: 'POST', body: {} })
}

// Delete a completion (for undoing accidental marks)
export async function deleteCompletion(completionId) {
  await request(`/completions/${completionId}`, { method: 'DELETE' })
}

// Pay out all approved unpaid completions for a user
export async function payOutChores(userId) {
  const result = await request(`/users/${userId}/payout`, { method: 'POST', body: {} })
  return result.paid
}

// ==================== MEALS ====================

export async function getMeals() {
  return safeList('/meals')
}

export async function getMealByDateAndType(date, type) {
  const meals = await getMeals()
  return meals.find((m) => m.date === date && m.mealType === type) || null
}

export async function setMeal(date, mealType, meal, mealId = null) {
  await request('/meals', { method: 'PUT', body: { date, mealType, meal, mealId } })
}

// ==================== MEAL RECIPES (Recipe Book) ====================

export async function getMealRecipes() {
  return safeList('/recipes')
}

export async function getMealRecipeById(id) {
  return request(`/recipes/${id}`)
}

export async function addMealRecipe(recipe) {
  const created = await request('/recipes', {
    method: 'POST',
    body: {
      name: recipe.name,
      category: recipe.category,
      tags: recipe.tags || [],
      serves: recipe.serves || null,
      time: recipe.time || null,
      day: recipe.day || null,
      note: recipe.note || null,
      ingredients: recipe.ingredients || [],
      isCustom: recipe.isCustom !== false, // default true
    },
  })
  return created.id
}

export async function updateMealRecipe(id, updates) {
  await request(`/recipes/${id}`, { method: 'PATCH', body: updates })
}

export async function deleteMealRecipe(id) {
  await request(`/recipes/${id}`, { method: 'DELETE' })
}

// ==================== SHOPPING ====================

export async function getShoppingItems() {
  return safeList('/shopping')
}

export async function addShoppingItem(item) {
  const created = await request('/shopping', {
    method: 'POST',
    body: {
      name: item.name,
      quantity: item.quantity || 1,
      estimatedCost: item.estimated_cost || item.estimatedCost || null,
      addedBy: item.added_by || item.addedBy || null,
      checked: false,
    },
  })
  return created.id
}

export async function updateShoppingItem(id, updates) {
  // Tolerate snake_case callers (pre-Amplify field names)
  const cleanUpdates = {}
  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key === 'estimated_cost' ? 'estimatedCost'
               : key === 'added_by' ? 'addedBy'
               : key
    cleanUpdates[dbKey] = value
  }
  await request(`/shopping/${id}`, { method: 'PATCH', body: cleanUpdates })
}

export async function deleteShoppingItem(id) {
  await request(`/shopping/${id}`, { method: 'DELETE' })
}

export async function clearCheckedItems() {
  await request('/shopping/clear-checked', { method: 'POST', body: {} })
}

// ==================== NOTES ====================

export async function getNotes({ includeExpired = false } = {}) {
  return safeList(`/notes${includeExpired ? '?includeExpired=1' : ''}`)
}

export async function addNote(note) {
  return request('/notes', {
    method: 'POST',
    body: {
      authorId: note.authorId,
      body: note.body,
      targetUserId: note.targetUserId || null,
      pinned: !!note.pinned,
      expiresAt: note.expiresAt || null,
    },
  })
}

export async function updateNote(id, updates) {
  return request(`/notes/${id}`, { method: 'PATCH', body: updates })
}

export async function deleteNote(id) {
  await request(`/notes/${id}`, { method: 'DELETE' })
}

export async function markNoteSeen(id, userId) {
  return request(`/notes/${id}/seen`, { method: 'POST', body: { userId } })
}

// ==================== SYSTEM / SERVICES ====================

export async function getServices() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/services`, { headers: authHeaders() })
    if (!res.ok) return { services: [] }
    return res.json()
  } catch { return { services: [] } }
}

export async function getMediaSummary() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/media/summary`, { headers: authHeaders() })
    if (!res.ok) return null
    return (await res.json()).data || null
  } catch { return null }
}

// ==================== JARVIS CHAT ====================

export async function askJarvis(userId, message) {
  return request('/jarvis', { method: 'POST', body: { userId, message } })
}

// ==================== HOME ASSISTANT (house screen) ====================

const HA_BASE = `${import.meta.env.VITE_API_URL || ''}/api/ha`

// Live states for a set of entity ids. Returns [] on any failure (HA offline).
export async function haStates(entityIds = []) {
  if (entityIds.length === 0) return []
  try {
    const res = await fetch(`${HA_BASE}/states?entities=${encodeURIComponent(entityIds.join(','))}`, { headers: authHeaders() })
    if (!res.ok) return []
    const body = await res.json()
    return body.states || body.data || (Array.isArray(body) ? body : [])
  } catch { return [] }
}

export async function haCall(domain, service, entity_id, data = {}) {
  const res = await fetch(`${HA_BASE}/service`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ domain, service, entity_id, data }),
  })
  if (!res.ok) throw new Error(`HA ${domain}.${service} failed`)
  return res.json()
}

// ==================== CALENDAR ====================

// Read-only family calendar from the published iCloud ICS (server-side).
// Returns { events, configured }. events: [{date,time,allDay,summary,location,person,sortKey}]
export async function getCalendarEvents({ date, days = 1 } = {}) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (days) params.set('days', String(days))
  try {
    return await request(`/calendar?${params.toString()}`)
  } catch (e) {
    console.warn('GET /calendar failed:', e.message)
    return { events: [], configured: false }
  }
}

// ==================== CINEMA (Plex + film requests) ====================

const MEDIA_BASE = `${import.meta.env.VITE_API_URL || ''}/api/media`

async function mediaGet(path) {
  try {
    const res = await fetch(`${MEDIA_BASE}${path}`, { headers: authHeaders() })
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export const getContinueWatching = () => mediaGet('/cinema/on-deck')
export const getRecentlyAdded = () => mediaGet('/cinema/recently-added')
// Server-proxied Plex artwork (keeps the token server-side). Returns '' if no thumb.
export function plexImage(thumb) {
  if (!thumb) return ''
  return `${MEDIA_BASE}/cinema/image?path=${encodeURIComponent(thumb)}`
}

export async function getFilmRequests() {
  return safeList('/film-requests')
}
export async function addFilmRequest(req) {
  return request('/film-requests', { method: 'POST', body: { title: req.title, requestedBy: req.requestedBy, kind: req.kind || 'film', note: req.note || null } })
}
export async function updateFilmRequest(id, updates) {
  return request(`/film-requests/${id}`, { method: 'PATCH', body: updates })
}
export async function deleteFilmRequest(id) {
  await request(`/film-requests/${id}`, { method: 'DELETE' })
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

// ==================== LIFTS ====================
// Family lift-request board: kids ask, parents accept/deny, first response wins.
export async function getLifts() { return safeList('/lifts') }
export async function addLift(lift) { return request('/lifts', { method: 'POST', body: lift }) }
export async function respondToLift(id, decision, userId, note) {
  return request(`/lifts/${id}/respond`, { method: 'POST', body: { decision, userId, note } })
}
export async function cancelLift(id, userId) {
  return request(`/lifts/${id}/cancel`, { method: 'POST', body: { userId } })
}
export async function arrivedLift(id, userId) {
  return request(`/lifts/${id}/arrived`, { method: 'POST', body: { userId } })
}

// ==================== PUSH ====================
export async function getVapidKey() {
  const r = await request('/push/key')
  return r.publicKey
}
export async function savePushSubscription(sub) {
  return request('/push/subscribe', { method: 'POST', body: sub })
}
export async function removePushSubscription(endpoint) {
  return request('/push/unsubscribe', { method: 'POST', body: { endpoint } })
}
