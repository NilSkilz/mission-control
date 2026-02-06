import { useState, useEffect } from 'react'
import { Button, Card, Input, Modal, SelectInput, SelectOption, Badge, CheckboxItem } from '../components/ui'
import { PlusIcon, Pencil1Icon, TrashIcon, ChevronLeftIcon } from '@radix-ui/react-icons'
import { MEALS, MEAL_TAGS } from '../lib/meals-data'
import { getMealRecipes, addMealRecipe, updateMealRecipe, deleteMealRecipe } from '../lib/data'
import { Link } from 'react-router-dom'

const CATEGORIES = [
  'Roasts & Big Meals',
  'Midweek Mains',
  'Quick & Easy',
  'Pasta & Rice',
  'Comfort Food',
  'Light & Healthy',
  'Other',
]

function generateId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function MealsManagerPage() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(null) // null | 'new' | recipe object
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    tags: [],
    serves: '',
    time: '',
    day: '',
    note: '',
    ingredients: [],
  })
  const [newIngredient, setNewIngredient] = useState({ name: '', quantity: '' })

  const loadData = async () => {
    setLoading(true)
    try {
      const customRecipes = await getMealRecipes()
      // Combine static meals with custom recipes
      // Static meals get prefixed IDs to differentiate
      const staticMeals = MEALS.map(m => ({
        ...m,
        id: `static:${m.id}`,
        isCustom: false,
      }))
      setRecipes([...staticMeals, ...customRecipes])
    } catch (e) {
      console.error('Error loading recipes:', e)
      // Fall back to just static meals
      setRecipes(MEALS.map(m => ({ ...m, id: `static:${m.id}`, isCustom: false })))
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const openNewModal = () => {
    setFormData({
      name: '',
      category: CATEGORIES[0],
      tags: [],
      serves: '',
      time: '',
      day: '',
      note: '',
      ingredients: [],
    })
    setNewIngredient({ name: '', quantity: '' })
    setEditModal('new')
  }

  const openEditModal = (recipe) => {
    setFormData({
      name: recipe.name,
      category: recipe.category || CATEGORIES[0],
      tags: recipe.tags || [],
      serves: recipe.serves || '',
      time: recipe.time || '',
      day: recipe.day || '',
      note: recipe.note || '',
      ingredients: recipe.ingredients || [],
    })
    setNewIngredient({ name: '', quantity: '' })
    setEditModal(recipe)
  }

  const handleTagToggle = (tagId) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(t => t !== tagId)
        : [...prev.tags, tagId],
    }))
  }

  const handleAddIngredient = () => {
    if (!newIngredient.name.trim()) return
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { 
        name: newIngredient.name.trim(), 
        quantity: newIngredient.quantity.trim() || null 
      }],
    }))
    setNewIngredient({ name: '', quantity: '' })
  }

  const handleRemoveIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return

    try {
      if (editModal === 'new') {
        // Create new recipe
        await addMealRecipe({
          name: formData.name.trim(),
          category: formData.category,
          tags: formData.tags,
          serves: formData.serves || null,
          time: formData.time || null,
          day: formData.day || null,
          note: formData.note || null,
          ingredients: formData.ingredients,
          isCustom: true,
        })
      } else if (editModal && !editModal.id?.startsWith('static:')) {
        // Update existing custom recipe
        await updateMealRecipe(editModal.id, {
          name: formData.name.trim(),
          category: formData.category,
          tags: formData.tags,
          serves: formData.serves || null,
          time: formData.time || null,
          day: formData.day || null,
          note: formData.note || null,
          ingredients: formData.ingredients,
        })
      }
      setEditModal(null)
      loadData()
    } catch (e) {
      console.error('Error saving recipe:', e)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm || deleteConfirm.id?.startsWith('static:')) return
    try {
      await deleteMealRecipe(deleteConfirm.id)
      setDeleteConfirm(null)
      loadData()
    } catch (e) {
      console.error('Error deleting recipe:', e)
    }
  }

  // Filter recipes
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group by category
  const recipesByCategory = {}
  filteredRecipes.forEach(recipe => {
    const cat = recipe.category || 'Other'
    if (!recipesByCategory[cat]) recipesByCategory[cat] = []
    recipesByCategory[cat].push(recipe)
  })

  const isStaticMeal = editModal && editModal !== 'new' && editModal.id?.startsWith('static:')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-teal-400 text-xl">Loading recipes...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link to="/meals">
            <Button variant="ghost" size="sm">
              <ChevronLeftIcon className="w-4 h-4" /> Back to Planner
            </Button>
          </Link>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <span>📖</span> Recipe Book
          </h2>
        </div>
        <Button onClick={openNewModal}>
          <PlusIcon className="w-4 h-4" /> Add Recipe
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <SelectInput
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="w-48"
        >
          <SelectOption value="all">All Categories</SelectOption>
          {CATEGORIES.map(cat => (
            <SelectOption key={cat} value={cat}>{cat}</SelectOption>
          ))}
        </SelectInput>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-slate-400">
        <span>{filteredRecipes.length} recipes</span>
        <span>•</span>
        <span>{filteredRecipes.filter(r => !r.id?.startsWith('static:')).length} custom</span>
        <span>•</span>
        <span>{filteredRecipes.filter(r => r.id?.startsWith('static:')).length} built-in</span>
      </div>

      {/* Recipe Grid */}
      {Object.entries(recipesByCategory).map(([category, categoryRecipes]) => (
        <div key={category}>
          <h3 className="text-lg font-medium text-slate-300 mb-3">{category}</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categoryRecipes.map(recipe => (
              <Card key={recipe.id} className="relative group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{recipe.name}</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(recipe.tags || []).slice(0, 3).map(tag => (
                        <Badge key={tag} variant="teal" className="text-xs">
                          {MEAL_TAGS[tag]?.emoji} {MEAL_TAGS[tag]?.label?.split(' ')[0] || tag}
                        </Badge>
                      ))}
                      {(recipe.tags || []).length > 3 && (
                        <Badge variant="default" className="text-xs">+{recipe.tags.length - 3}</Badge>
                      )}
                    </div>
                  </div>
                  {recipe.id?.startsWith('static:') ? (
                    <Badge variant="default" className="text-xs shrink-0">Built-in</Badge>
                  ) : (
                    <Badge variant="success" className="text-xs shrink-0">Custom</Badge>
                  )}
                </div>
                
                <div className="mt-3 text-sm text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                  {recipe.serves && <span>Serves: {recipe.serves}</span>}
                  {recipe.time && <span>⏱️ {recipe.time}</span>}
                  {recipe.ingredients?.length > 0 && (
                    <span>{recipe.ingredients.length} ingredients</span>
                  )}
                </div>

                {recipe.note && (
                  <p className="mt-2 text-xs text-slate-500 italic">{recipe.note}</p>
                )}

                {/* Action buttons */}
                <div className="mt-3 pt-3 border-t border-slate-700 flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => openEditModal(recipe)}
                    className="flex-1"
                  >
                    <Pencil1Icon className="w-4 h-4" /> {recipe.id?.startsWith('static:') ? 'View' : 'Edit'}
                  </Button>
                  {!recipe.id?.startsWith('static:') && (
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={() => setDeleteConfirm(recipe)}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {filteredRecipes.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-slate-400">No recipes found</p>
          <Button onClick={openNewModal} className="mt-4">
            <PlusIcon className="w-4 h-4" /> Add your first recipe
          </Button>
        </Card>
      )}

      {/* Edit/Create Modal */}
      <Modal
        open={!!editModal}
        onOpenChange={open => !open && setEditModal(null)}
        title={editModal === 'new' ? '➕ Add New Recipe' : isStaticMeal ? `📖 ${formData.name}` : `✏️ Edit Recipe`}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {isStaticMeal && (
            <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-400">
              This is a built-in recipe and cannot be edited. You can view its details below.
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Recipe Name *</label>
            <Input
              type="text"
              placeholder="e.g., Chicken Stir Fry"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={isStaticMeal}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Category *</label>
            <SelectInput
              value={formData.category}
              onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}
              disabled={isStaticMeal}
            >
              {CATEGORIES.map(cat => (
                <SelectOption key={cat} value={cat}>{cat}</SelectOption>
              ))}
            </SelectInput>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MEAL_TAGS).map(([tagId, tag]) => (
                <button
                  key={tagId}
                  onClick={() => !isStaticMeal && handleTagToggle(tagId)}
                  disabled={isStaticMeal}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    formData.tags.includes(tagId)
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } ${isStaticMeal ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {tag.emoji} {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Serves & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Serves</label>
              <Input
                type="text"
                placeholder="e.g., 4"
                value={formData.serves}
                onChange={e => setFormData(prev => ({ ...prev, serves: e.target.value }))}
                disabled={isStaticMeal}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Prep Time</label>
              <Input
                type="text"
                placeholder="e.g., 30 mins"
                value={formData.time}
                onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                disabled={isStaticMeal}
              />
            </div>
          </div>

          {/* Day suggestion */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Suggested Day (optional)</label>
            <Input
              type="text"
              placeholder="e.g., Sunday, Weekend"
              value={formData.day}
              onChange={e => setFormData(prev => ({ ...prev, day: e.target.value }))}
              disabled={isStaticMeal}
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Note (optional)</label>
            <Input
              type="text"
              placeholder="e.g., Dexter's favourite"
              value={formData.note}
              onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
              disabled={isStaticMeal}
            />
          </div>

          {/* Ingredients */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Ingredients</label>
            
            {/* Existing ingredients */}
            {formData.ingredients.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2">
                    <span className="flex-1 text-white">{ing.name}</span>
                    {ing.quantity && (
                      <span className="text-slate-400 text-sm">{ing.quantity}</span>
                    )}
                    {!isStaticMeal && (
                      <button
                        onClick={() => handleRemoveIngredient(idx)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add new ingredient */}
            {!isStaticMeal && (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Ingredient name"
                  value={newIngredient.name}
                  onChange={e => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
                  className="flex-1 min-w-[200px]"
                  onKeyDown={e => e.key === 'Enter' && handleAddIngredient()}
                />
                <Input
                  type="text"
                  placeholder="Qty"
                  value={newIngredient.quantity}
                  onChange={e => setNewIngredient(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-24"
                  onKeyDown={e => e.key === 'Enter' && handleAddIngredient()}
                />
                <Button variant="secondary" onClick={handleAddIngredient}>
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button variant="secondary" onClick={() => setEditModal(null)}>
              {isStaticMeal ? 'Close' : 'Cancel'}
            </Button>
            {!isStaticMeal && (
              <Button onClick={handleSave} disabled={!formData.name.trim()}>
                {editModal === 'new' ? 'Create Recipe' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirm}
        onOpenChange={open => !open && setDeleteConfirm(null)}
        title="🗑️ Delete Recipe"
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Are you sure you want to delete <strong className="text-white">{deleteConfirm?.name}</strong>?
          </p>
          <p className="text-sm text-slate-400">This action cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
