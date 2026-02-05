import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  User: a.model({
    username: a.string().required(),
    displayName: a.string().required(),
    role: a.string().required(), // 'parent' | 'child'
    avatar: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // Template chores that can be quickly assigned
  ChoreTemplate: a.model({
    title: a.string().required(),
    defaultAmount: a.float().default(0), // in pence
    paid: a.boolean().default(false),
    suggestedRecurring: a.string(), // 'daily' | 'weekly' | null
  }).authorization(allow => [allow.publicApiKey()]),

  // Active assigned chores
  Chore: a.model({
    title: a.string().required(),
    assignedTo: a.string().required(), // User ID
    paid: a.boolean().default(false),
    amount: a.float().default(0),
    recurring: a.string(), // 'daily' | 'weekly' | null
    templateId: a.string(), // optional link to ChoreTemplate
  }).authorization(allow => [allow.publicApiKey()]),

  // Completion log - one record per completion
  ChoreCompletion: a.model({
    choreId: a.string().required(),
    userId: a.string().required(),
    choreTitle: a.string().required(), // denormalized for easy display
    amount: a.float().default(0),
    completedAt: a.string().required(),
    approved: a.boolean().default(false),
    approvedAt: a.string(),
    paidOut: a.boolean().default(false),
    paidAt: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  Meal: a.model({
    date: a.string().required(), // YYYY-MM-DD
    mealType: a.string().required(), // 'breakfast' | 'lunch' | 'dinner'
    meal: a.string().required(),
    mealId: a.string(), // reference to meals-data.js ID
  }).authorization(allow => [allow.publicApiKey()]),

  ShoppingItem: a.model({
    name: a.string().required(),
    quantity: a.integer().default(1),
    estimatedCost: a.float(),
    addedBy: a.string(), // User ID
    checked: a.boolean().default(false),
  }).authorization(allow => [allow.publicApiKey()]),

  // Custom meal recipes (the "recipe book")
  MealRecipe: a.model({
    name: a.string().required(),
    category: a.string().required(),
    tags: a.string().array(), // array of tag IDs from MEAL_TAGS
    serves: a.string(),
    time: a.string(),
    day: a.string(), // suggested day (e.g., "Sunday", "Weekend")
    note: a.string(),
    ingredients: a.string(), // JSON string of [{name, quantity}]
    isCustom: a.boolean().default(true), // false = seeded from static data
  }).authorization(allow => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
