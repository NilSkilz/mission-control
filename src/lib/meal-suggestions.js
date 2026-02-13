// Smart meal suggestion logic
// Uses the existing meal database to suggest a week of dinners
// Now with presence-aware suggestions!

import { MEALS } from './meals-data'

// Serving size thresholds for different headcounts
const SERVING_PREFERENCES = {
  4: { min: 4, ideal: 4, tags: [] }, // Full family
  3: { min: 3, ideal: 4, tags: ['quick'] }, // One person away - slightly easier
  2: { min: 2, ideal: 2, tags: ['quick', 'date-night'] }, // Just parents or just kids
  1: { min: 1, ideal: 2, tags: ['quick', 'freezer'] }, // Solo meal
}

// Day-specific preferences
const DAY_PREFERENCES = {
  0: { // Sunday
    preferTags: [],
    preferCategory: 'Roasts & Big Meals',
    fallbackIds: ['roast-chicken', 'roast-gammon'],
  },
  1: { // Monday
    preferTags: ['quick', 'freezer'], // Easy start to week, use Sunday leftovers or quick meal
    avoidCategory: 'Roasts & Big Meals',
  },
  2: { // Tuesday
    preferTags: ['family-favourite', 'kid-approved'],
    avoidCategory: 'Roasts & Big Meals',
  },
  3: { // Wednesday
    preferTags: ['quick', 'airfryer'], // Midweek = keep it simple
    avoidCategory: 'Roasts & Big Meals',
  },
  4: { // Thursday
    preferTags: ['family-favourite'],
    avoidCategory: 'Roasts & Big Meals',
  },
  5: { // Friday
    preferTags: ['nice-meal'], // Treat night!
    preferIds: ['steak-chips', 'burgers-chips'],
    avoidCategory: 'Roasts & Big Meals',
  },
  6: { // Saturday
    preferTags: ['family-favourite', 'kid-approved'],
    avoidCategory: 'Roasts & Big Meals',
  },
}

// Shuffle array (Fisher-Yates)
function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Score a meal for a specific day
// Now accepts presence info to adjust for headcount
function scoreMeal(meal, dayOfWeek, usedMealIds, presence = null) {
  const prefs = DAY_PREFERENCES[dayOfWeek] || {}
  let score = 0

  // Already used this week = disqualified
  if (usedMealIds.has(meal.id)) {
    return -1000
  }

  // Preferred IDs get high priority
  if (prefs.preferIds?.includes(meal.id)) {
    score += 50
  }

  // Fallback IDs (e.g., roasts for Sunday)
  if (prefs.fallbackIds?.includes(meal.id)) {
    score += 40
  }

  // Preferred category
  if (prefs.preferCategory && meal.category === prefs.preferCategory) {
    score += 30
  }

  // Avoid category
  if (prefs.avoidCategory && meal.category === prefs.avoidCategory) {
    score -= 50
  }

  // Preferred tags
  if (prefs.preferTags) {
    const matchingTags = meal.tags.filter(t => prefs.preferTags.includes(t))
    score += matchingTags.length * 10
  }

  // === PRESENCE-BASED ADJUSTMENTS ===
  if (presence) {
    const headcount = presence.headcount || 4
    const servingPrefs = SERVING_PREFERENCES[headcount] || SERVING_PREFERENCES[4]
    
    // Parse serves (could be "4" or "4-6")
    const servesStr = String(meal.serves || '4')
    const servesMatch = servesStr.match(/(\d+)/)
    const serves = servesMatch ? parseInt(servesMatch[1]) : 4

    // Bonus for meals that match the headcount
    if (serves === headcount) {
      score += 15 // Perfect match
    } else if (serves >= servingPrefs.min && serves <= servingPrefs.ideal + 1) {
      score += 8 // Good enough
    } else if (serves > headcount + 2) {
      score -= 10 // Too much food for small group
    }

    // Bonus for preferred tags based on headcount
    if (servingPrefs.tags.length > 0) {
      const matchingHeadcountTags = meal.tags.filter(t => servingPrefs.tags.includes(t))
      score += matchingHeadcountTags.length * 8
    }

    // Special case: no kids home = suggest "nice-meal" or "date-night"
    if (!presence.dexter && !presence.logan && presence.rob && presence.aimee) {
      if (meal.tags.includes('nice-meal') || meal.tags.includes('date-night')) {
        score += 20 // Date night bonus!
      }
    }

    // Special case: just kids = prefer kid-approved
    if (!presence.rob && !presence.aimee && (presence.dexter || presence.logan)) {
      if (meal.tags.includes('kid-approved') || meal.tags.includes('freezer')) {
        score += 15
      }
    }

    // Avoid big roasts when fewer than 3 people
    if (headcount < 3 && meal.category === 'Roasts & Big Meals') {
      score -= 30
    }
  }

  // Slight bonus for family favourites (always nice)
  if (meal.tags.includes('family-favourite')) {
    score += 5
  }

  // Slight bonus for kid-approved
  if (meal.tags.includes('kid-approved')) {
    score += 3
  }

  // Add some randomness to keep it interesting
  score += Math.random() * 8

  return score
}

// Get the best meal for a specific day
function selectMealForDay(dayOfWeek, usedMealIds, availableMeals, presence = null) {
  // Score all meals
  const scoredMeals = availableMeals.map(meal => ({
    meal,
    score: scoreMeal(meal, dayOfWeek, usedMealIds, presence),
  }))

  // Sort by score (highest first)
  scoredMeals.sort((a, b) => b.score - a.score)

  // Return the best one (if any have positive score)
  const best = scoredMeals.find(m => m.score > -500)
  return best?.meal || null
}

/**
 * Generate meal suggestions for a week
 * @param {Date[]} weekDates - Array of 7 dates (Mon-Sun)
 * @param {Object} existingMeals - Map of date string -> existing meal info (to avoid suggesting what's already planned)
 * @param {Object} presenceData - Optional presence data with { days: { 'YYYY-MM-DD': { rob, aimee, dexter, logan, headcount } } }
 * @returns {Object} Map of date string -> { mealId, mealName, presence }
 */
export function suggestMealsForWeek(weekDates, existingMeals = {}, presenceData = null) {
  const suggestions = {}
  const usedMealIds = new Set()

  // First, mark any existing meals as "used" so we don't duplicate
  Object.values(existingMeals).forEach(meal => {
    if (meal?.mealId) {
      usedMealIds.add(meal.mealId)
    }
  })

  // Filter to only dinner-appropriate meals (exclude pure breakfast/grazer items)
  const dinnerMeals = MEALS.filter(meal => {
    // Include all except those that are ONLY grazer-tagged
    if (meal.tags.length === 1 && meal.tags[0] === 'grazer') {
      return false
    }
    return true
  })

  // Shuffle to add variety between runs
  const shuffledMeals = shuffle(dinnerMeals)

  // Process each day
  weekDates.forEach(date => {
    const dateStr = date.toISOString().split('T')[0]
    const dayOfWeek = date.getDay()

    // Skip if there's already a meal planned for this day
    if (existingMeals[dateStr]?.name) {
      suggestions[dateStr] = null // Don't override
      return
    }

    // Get presence for this day
    const dayPresence = presenceData?.days?.[dateStr] || null

    const selectedMeal = selectMealForDay(dayOfWeek, usedMealIds, shuffledMeals, dayPresence)
    
    if (selectedMeal) {
      usedMealIds.add(selectedMeal.id)
      suggestions[dateStr] = {
        mealId: selectedMeal.id,
        mealName: selectedMeal.name,
        presence: dayPresence, // Include presence info for UI
      }
    } else {
      suggestions[dateStr] = null
    }
  })

  return suggestions
}

/**
 * Get a human-readable explanation of why a meal was suggested
 * @param {string} mealId 
 * @param {number} dayOfWeek 
 * @returns {string}
 */
export function getSuggestionReason(mealId, dayOfWeek) {
  const meal = MEALS.find(m => m.id === mealId)
  if (!meal) return ''

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const prefs = DAY_PREFERENCES[dayOfWeek]

  if (dayOfWeek === 0 && meal.category === 'Roasts & Big Meals') {
    return `${dayNames[dayOfWeek]} roast! 🍗`
  }
  if (dayOfWeek === 5 && meal.tags.includes('nice-meal')) {
    return 'Friday treat night! 🥩'
  }
  if (meal.tags.includes('quick')) {
    return 'Quick & easy'
  }
  if (meal.tags.includes('family-favourite')) {
    return 'Family favourite'
  }
  return ''
}
