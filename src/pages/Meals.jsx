import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { Button, Card, Input, Modal, SelectInput, SelectOption, Badge } from '../components/ui'
import { ChevronLeftIcon, ChevronRightIcon, Pencil1Icon, PlusIcon } from '@radix-ui/react-icons'
import { MEALS, MEAL_TAGS, getMealById, getMealsByCategory, formatIngredient } from '../lib/meals-data'
import { getMeals, setMeal, addShoppingItem } from '../lib/data'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' }

function getWeekDates(offset = 0) {
  const today = new Date()
  const currentDay = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - currentDay + 1 + (offset * 7))
  
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }
  return dates
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function formatDay(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short' })
}

function formatDayNum(date) {
  return date.getDate()
}

export default function MealsPage() {
  const { user } = useUser()
  const [meals, setMeals] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(null) // { date, type }
  const [editValue, setEditValue] = useState('')
  const [selectedMealId, setSelectedMealId] = useState('')
  const [addingToList, setAddingToList] = useState(false)

  const loadData = async () => {
    try {
      const mealsData = await getMeals()
      // Normalize field names
      setMeals(mealsData.map(m => ({
        ...m,
        type: m.mealType || m.type,
        meal_id: m.mealId || m.meal_id,
      })))
    } catch (e) {
      console.error('Error loading meals:', e)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const getMealForSlot = (date, type) => {
    const dateStr = formatDate(date)
    const meal = meals.find(m => m.date === dateStr && (m.type === type || m.mealType === type))
    return meal ? { name: meal.meal, mealId: meal.meal_id || meal.mealId } : { name: '', mealId: null }
  }

  const openEdit = (date, type) => {
    const existing = getMealForSlot(date, type)
    setEditValue(existing.name)
    setSelectedMealId(existing.mealId || '')
    setEditModal({ date: formatDate(date), type })
  }

  const handleMealSelect = (mealId) => {
    setSelectedMealId(mealId)
    if (mealId) {
      const meal = getMealById(mealId)
      if (meal) setEditValue(meal.name)
    }
  }

  const saveMealHandler = async () => {
    if (!editModal) return
    try {
      await setMeal(editModal.date, editModal.type, editValue.trim() || null, selectedMealId || null)
      setEditModal(null)
      setEditValue('')
      setSelectedMealId('')
      loadData()
    } catch (e) {
      console.error('Error saving meal:', e)
    }
  }

  const addMealToShoppingList = async () => {
    if (!selectedMealId) return
    const meal = getMealById(selectedMealId)
    if (!meal) return
    
    setAddingToList(true)
    try {
      for (const ingredient of meal.ingredients) {
        if (ingredient.quantity === 'optional') continue
        const name = formatIngredient(ingredient, meal.name)
        await addShoppingItem({ name, addedBy: user.id })
      }
    } catch (e) {
      console.error('Error adding to shopping list:', e)
    }
    setAddingToList(false)
  }

  const weekDates = getWeekDates(weekOffset)
  const today = formatDate(new Date())
  const mealsByCategory = getMealsByCategory()
  const selectedMealData = selectedMealId ? getMealById(selectedMealId) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-teal-400 text-xl">Loading meals...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <span>🍽️</span> Meal Planner
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekOffset(0)}>
            This Week
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block overflow-x-auto">
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="p-3 text-left text-slate-400 text-sm font-medium w-24">Meal</th>
                {weekDates.map(date => (
                  <th key={formatDate(date)} className={`p-3 text-center text-sm font-medium min-w-[120px] ${formatDate(date) === today ? 'bg-teal-500/10 text-teal-400' : 'text-slate-400'}`}>
                    <div>{formatDay(date)}</div>
                    <div className="text-lg">{formatDayNum(date)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEAL_TYPES.map(type => (
                <tr key={type} className="border-b border-slate-700/50 last:border-0">
                  <td className="p-3 text-slate-300 capitalize">
                    <span className="mr-2">{MEAL_ICONS[type]}</span>
                    {type}
                  </td>
                  {weekDates.map(date => {
                    const meal = getMealForSlot(date, type)
                    const isToday = formatDate(date) === today
                    return (
                      <td 
                        key={formatDate(date)} 
                        className={`p-2 ${isToday ? 'bg-teal-500/5' : ''}`}
                      >
                        <button
                          onClick={() => openEdit(date, type)}
                          className="w-full h-full min-h-[60px] p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700 text-sm text-left transition-colors group"
                        >
                          {meal.name ? (
                            <span className="text-white">{meal.name}</span>
                          ) : (
                            <span className="text-slate-500 group-hover:text-slate-400">+ Add meal</span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-4">
        {weekDates.map(date => {
          const isToday = formatDate(date) === today
          return (
            <Card key={formatDate(date)} className={isToday ? 'border-teal-500/50 bg-teal-500/5' : ''}>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700">
                <span className={`text-lg font-bold ${isToday ? 'text-teal-400' : 'text-white'}`}>
                  {formatDay(date)}
                </span>
                <span className="text-slate-400">{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                {isToday && <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full ml-auto">Today</span>}
              </div>
              <div className="space-y-2">
                {MEAL_TYPES.map(type => {
                  const meal = getMealForSlot(date, type)
                  return (
                    <button
                      key={type}
                      onClick={() => openEdit(date, type)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700 transition-colors text-left"
                    >
                      <span className="text-xl">{MEAL_ICONS[type]}</span>
                      <div className="flex-1">
                        <div className="text-xs text-slate-400 capitalize">{type}</div>
                        <div className={meal.name ? 'text-white' : 'text-slate-500'}>
                          {meal.name || 'Not planned'}
                        </div>
                      </div>
                      <Pencil1Icon className="w-4 h-4 text-slate-500" />
                    </button>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Edit Modal */}
      <Modal
        open={!!editModal}
        onOpenChange={open => !open && setEditModal(null)}
        title={editModal ? `${MEAL_ICONS[editModal.type]} ${editModal.type.charAt(0).toUpperCase() + editModal.type.slice(1)} - ${new Date(editModal.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}
      >
        <div className="space-y-4">
          {/* Meal dropdown */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Choose a meal</label>
            <SelectInput 
              value={selectedMealId || '__custom__'} 
              onValueChange={v => handleMealSelect(v === '__custom__' ? '' : v)}
              placeholder="Select from database..."
            >
              <SelectOption value="__custom__">— Custom meal —</SelectOption>
              {Object.entries(mealsByCategory).map(([category, categoryMeals]) => (
                categoryMeals.map(meal => (
                  <SelectOption key={meal.id} value={meal.id}>
                    {meal.tags.map(t => MEAL_TAGS[t]?.emoji || '').join('')} {meal.name}
                  </SelectOption>
                ))
              ))}
            </SelectInput>
          </div>

          {/* Custom text input */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Or type custom meal</label>
            <Input
              type="text"
              placeholder="What's for this meal?"
              value={editValue}
              onChange={e => {
                setEditValue(e.target.value)
                setSelectedMealId('') // Clear selection if typing custom
              }}
            />
          </div>

          {/* Show meal details if selected from database */}
          {selectedMealData && (
            <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedMealData.tags.map(tag => (
                  <Badge key={tag} variant="teal">
                    {MEAL_TAGS[tag]?.emoji} {MEAL_TAGS[tag]?.label || tag}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-slate-400">
                <span>Serves: {selectedMealData.serves}</span>
                <span className="mx-2">•</span>
                <span>Time: {selectedMealData.time}</span>
              </div>
              <div className="text-sm text-slate-500">
                {selectedMealData.ingredients.length} ingredients
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={addMealToShoppingList}
                disabled={addingToList}
              >
                <PlusIcon className="w-4 h-4" />
                {addingToList ? 'Adding...' : 'Add ingredients to shopping list'}
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setEditModal(null); setSelectedMealId(''); setEditValue(''); }}>Cancel</Button>
            <Button onClick={saveMealHandler}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
