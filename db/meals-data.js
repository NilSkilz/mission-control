// Auto-generated from meals-database.md
// All meals, ingredients, and staples

export const MEAL_TAGS = {
  quick: { emoji: '⚡', label: 'Quick (<30 mins)' },
  airfryer: { emoji: '🍳', label: 'Airfryer friendly' },
  freezer: { emoji: '❄️', label: 'Freezer friendly' },
  'family-favourite': { emoji: '👨‍👩‍👦‍👦', label: 'Family favourite' },
  'nice-meal': { emoji: '🥩', label: 'Nice meal' },
  leftovers: { emoji: '🍂', label: 'Uses leftovers' },
  'kid-approved': { emoji: '🧒', label: 'Kid approved' },
  grazer: { emoji: '🥬', label: 'Grazer friendly' },
}

export const MEALS = [
  // Roasts & Big Meals
  {
    id: 'roast-chicken',
    name: 'Roast Chicken',
    tags: ['family-favourite', 'kid-approved'],
    serves: '4-5',
    time: '1.5 hrs',
    day: 'Sunday',
    category: 'Roasts & Big Meals',
    ingredients: [
      { name: 'Whole chicken', quantity: '1.5-2kg' },
      { name: 'Potatoes', quantity: '1kg' },
      { name: 'Carrots', quantity: '500g' },
      { name: 'Peas (frozen)', quantity: '300g' },
      { name: 'Gravy granules', quantity: null },
      { name: 'Stuffing mix', quantity: null },
      { name: 'Butter', quantity: null },
    ]
  },
  {
    id: 'roast-gammon',
    name: 'Roast Gammon',
    tags: ['family-favourite', 'kid-approved'],
    serves: '4-6',
    time: '2 hrs',
    day: 'Sunday',
    category: 'Roasts & Big Meals',
    ingredients: [
      { name: 'Gammon joint', quantity: '1.5kg' },
      { name: 'Potatoes', quantity: '1kg' },
      { name: 'Peas (frozen)', quantity: '300g' },
      { name: 'Carrots', quantity: '500g' },
      { name: 'Parsley sauce or gravy', quantity: null },
      { name: 'Honey/mustard glaze', quantity: 'optional' },
    ]
  },
  {
    id: 'beef-red-wine',
    name: 'Beef in Red Wine',
    tags: ['nice-meal'],
    serves: '4',
    time: '2-3 hrs',
    day: 'Weekend',
    category: 'Roasts & Big Meals',
    ingredients: [
      { name: 'Braising beef/stewing steak', quantity: '750g' },
      { name: 'Red wine', quantity: '500ml' },
      { name: 'Beef stock', quantity: '500ml' },
      { name: 'Onions', quantity: '2' },
      { name: 'Carrots', quantity: '3' },
      { name: 'Mushrooms', quantity: '200g' },
      { name: 'Garlic', quantity: '3 cloves' },
      { name: 'Tomato puree', quantity: null },
      { name: 'Fresh thyme', quantity: null },
      { name: 'Potatoes (for mash)', quantity: '1kg' },
      { name: 'Butter', quantity: null },
      { name: 'Milk', quantity: null },
    ]
  },
  {
    id: 'pork-belly',
    name: 'Pork Belly',
    tags: ['nice-meal'],
    serves: '4',
    time: '2.5 hrs',
    day: 'Weekend',
    category: 'Roasts & Big Meals',
    ingredients: [
      { name: 'Pork belly', quantity: '1kg' },
      { name: 'Salt (for crackling)', quantity: null },
      { name: 'Potatoes', quantity: '1kg' },
      { name: 'Apple sauce', quantity: null },
    ]
  },

  // Midweek Mains
  {
    id: 'burgers-chips',
    name: 'Burgers & Chips',
    tags: ['quick', 'airfryer', 'family-favourite', 'kid-approved'],
    serves: '4',
    time: '25 mins',
    category: 'Midweek Mains',
    ingredients: [
      { name: 'Beef burgers', quantity: '4-8' },
      { name: 'Burger buns', quantity: '4' },
      { name: 'Chips (frozen)', quantity: '1kg' },
      { name: 'Cheese slices', quantity: null },
      { name: 'Lettuce', quantity: null },
      { name: 'Tomato', quantity: null },
      { name: 'Onion', quantity: null },
      { name: 'Burger sauce/ketchup/mayo', quantity: null },
    ]
  },
  {
    id: 'steak-chips',
    name: 'Steak & Chips',
    tags: ['nice-meal', 'airfryer'],
    serves: '2-4',
    time: '30 mins',
    day: 'Friday',
    category: 'Midweek Mains',
    ingredients: [
      { name: 'Rump steaks', quantity: '2-4' },
      { name: 'Chips or sweet potato fries (frozen)', quantity: null },
      { name: 'Mushrooms', quantity: '200g' },
      { name: 'Peppercorn sauce', quantity: 'jar' },
      { name: 'Butter', quantity: null },
      { name: 'Garlic', quantity: 'optional' },
    ]
  },
  {
    id: 'lasagne',
    name: 'Lasagne',
    tags: ['family-favourite', 'kid-approved', 'freezer'],
    serves: '4-6',
    time: '1.5 hrs',
    category: 'Midweek Mains',
    ingredients: [
      { name: 'Beef mince', quantity: '500g' },
      { name: 'Onion', quantity: '1' },
      { name: 'Garlic', quantity: '2 cloves' },
      { name: 'Tinned tomatoes', quantity: '2 cans' },
      { name: 'Tomato puree', quantity: null },
      { name: 'Italian herbs', quantity: null },
      { name: 'Lasagne sheets', quantity: null },
      { name: 'Cheese sauce (jar)', quantity: null },
      { name: 'Cheddar (grated)', quantity: '200g' },
    ]
  },
  {
    id: 'cottage-pie',
    name: 'Cottage Pie / Shepherd\'s Pie',
    tags: ['family-favourite', 'kid-approved', 'freezer'],
    serves: '4-6',
    time: '1 hr',
    category: 'Midweek Mains',
    ingredients: [
      { name: 'Beef mince', quantity: '500g' },
      { name: 'Onion', quantity: '1' },
      { name: 'Carrots', quantity: '2' },
      { name: 'Peas (frozen)', quantity: '150g' },
      { name: 'Beef stock', quantity: '300ml' },
      { name: 'Worcestershire sauce', quantity: null },
      { name: 'Tomato puree', quantity: null },
      { name: 'Potatoes (for mash)', quantity: '1kg' },
      { name: 'Butter', quantity: null },
      { name: 'Milk', quantity: null },
      { name: 'Cheddar (grated)', quantity: '100g' },
    ]
  },
  {
    id: 'pasta-bake',
    name: 'Pasta Bake',
    tags: ['quick', 'kid-approved', 'freezer'],
    serves: '4',
    time: '40 mins',
    category: 'Midweek Mains',
    ingredients: [
      { name: 'Pasta', quantity: '400g' },
      { name: 'Bacon or chicken', quantity: null },
      { name: 'Passata or tomato pasta sauce (jar)', quantity: null },
      { name: 'Cheddar (grated)', quantity: '200g' },
      { name: 'Mushrooms', quantity: 'optional' },
      { name: 'Peppers', quantity: 'optional' },
    ]
  },
  {
    id: 'tomato-pasta',
    name: 'Tomato Pasta',
    tags: ['quick', 'kid-approved'],
    serves: '2-4',
    time: '20 mins',
    category: 'Midweek Mains',
    note: "Dexter's go-to",
    ingredients: [
      { name: 'Pasta', quantity: '300g' },
      { name: 'Passata or chopped tomatoes', quantity: null },
      { name: 'Garlic', quantity: '2 cloves' },
      { name: 'Italian herbs / basil', quantity: null },
      { name: 'Parmesan or cheddar', quantity: null },
      { name: 'Olive oil', quantity: null },
    ]
  },
  {
    id: 'carbonara',
    name: 'Carbonara',
    tags: ['quick'],
    serves: '2-4',
    time: '25 mins',
    category: 'Midweek Mains',
    note: "Rob's go-to",
    ingredients: [
      { name: 'Spaghetti', quantity: '300g' },
      { name: 'Bacon lardons or pancetta', quantity: '200g' },
      { name: 'Eggs', quantity: '3' },
      { name: 'Parmesan', quantity: '75g' },
      { name: 'Garlic', quantity: '1 clove' },
      { name: 'Black pepper', quantity: null },
    ]
  },
  {
    id: 'jacket-potatoes',
    name: 'Jacket Potatoes (Cheese & Bacon)',
    tags: ['quick', 'airfryer', 'kid-approved'],
    serves: '4',
    time: '1 hr',
    category: 'Midweek Mains',
    ingredients: [
      { name: 'Baking potatoes', quantity: '4 large' },
      { name: 'Butter', quantity: null },
      { name: 'Cheddar (grated)', quantity: '200g' },
      { name: 'Bacon', quantity: null },
      { name: 'Baked beans', quantity: 'optional' },
    ]
  },

  // Quick & Easy
  {
    id: 'chicken-strips',
    name: 'Airfryer Chicken Strips',
    tags: ['quick', 'airfryer', 'kid-approved', 'grazer'],
    serves: '4',
    time: '20 mins',
    category: 'Quick & Easy',
    ingredients: [
      { name: 'Chicken strips/goujons (frozen)', quantity: null },
      { name: 'Chips (frozen)', quantity: null },
      { name: 'Dips: ketchup, BBQ sauce, mayo', quantity: null },
    ]
  },
  {
    id: 'hot-dogs',
    name: 'Hot Dogs',
    tags: ['quick', 'kid-approved', 'grazer'],
    serves: '4',
    time: '15 mins',
    category: 'Quick & Easy',
    ingredients: [
      { name: 'Hot dog sausages', quantity: '8' },
      { name: 'Hot dog rolls', quantity: '8' },
      { name: 'Ketchup, mustard', quantity: null },
      { name: 'Fried onions', quantity: 'optional' },
    ]
  },
  {
    id: 'bacon-baps',
    name: 'Bacon Baps',
    tags: ['quick', 'kid-approved', 'grazer'],
    serves: '4',
    time: '15 mins',
    category: 'Quick & Easy',
    ingredients: [
      { name: 'Bacon', quantity: '12 rashers' },
      { name: 'Bread rolls or soft baps', quantity: '4' },
      { name: 'Ketchup / brown sauce', quantity: null },
      { name: 'Butter', quantity: null },
    ]
  },
  {
    id: 'pancakes',
    name: 'Pancakes & Syrup',
    tags: ['quick', 'family-favourite', 'kid-approved'],
    serves: '4',
    time: '25 mins',
    category: 'Quick & Easy',
    ingredients: [
      { name: 'Plain flour', quantity: '250g' },
      { name: 'Eggs', quantity: '2' },
      { name: 'Milk', quantity: '500ml' },
      { name: 'Butter (for frying)', quantity: null },
      { name: 'Maple syrup or golden syrup', quantity: null },
      { name: 'Bacon, berries, Nutella', quantity: 'optional' },
    ]
  },
]

// Grazer options for Logan
export const GRAZER_OPTIONS = [
  'Pasties (frozen)',
  'Sausage rolls (frozen)',
  'Chicken strips (frozen)',
  'Pizza (frozen, individual)',
  'Cheese & crackers',
  'Sandwich stuff (ham, cheese)',
]

// Weekly staples
export const STAPLES = {
  fridge: [
    { name: 'Milk', quantity: '4 pints' },
    { name: 'Butter', quantity: null },
    { name: 'Eggs', quantity: '12' },
    { name: 'Cheddar (block)', quantity: null },
    { name: 'Bacon', quantity: null },
  ],
  cupboard: [
    { name: 'Bread', quantity: '2 loaves' },
    { name: 'Cheerios', quantity: null },
    { name: 'Pasta', quantity: '500g' },
    { name: 'Passata', quantity: null },
    { name: 'Tinned tomatoes', quantity: null },
    { name: 'Rice', quantity: null },
  ],
  freezer: [
    { name: 'Chips (oven/airfryer)', quantity: null },
    { name: 'Sweet potato fries', quantity: null },
    { name: 'Peas', quantity: null },
    { name: 'Chicken strips', quantity: null },
    { name: 'Burgers', quantity: null },
  ],
  sauces: [
    { name: 'Ketchup', quantity: null },
    { name: 'Mayo', quantity: null },
    { name: 'Olive oil', quantity: null },
    { name: 'Gravy granules', quantity: null },
    { name: 'Stock cubes', quantity: null },
  ],
}

// Helper: get all staples as a flat array
export function getAllStaples() {
  const all = []
  for (const [category, items] of Object.entries(STAPLES)) {
    items.forEach(item => all.push({ ...item, category }))
  }
  return all
}

// Helper: get meal by ID
export function getMealById(id) {
  return MEALS.find(m => m.id === id)
}

// Helper: get meals by category
export function getMealsByCategory() {
  const categories = {}
  MEALS.forEach(meal => {
    if (!categories[meal.category]) categories[meal.category] = []
    categories[meal.category].push(meal)
  })
  return categories
}

// Helper: format ingredient for shopping list
export function formatIngredient(ingredient, mealName) {
  let text = ingredient.name
  if (ingredient.quantity) {
    text += ` (${ingredient.quantity})`
  }
  if (mealName) {
    text += ` [${mealName}]`
  }
  return text
}
