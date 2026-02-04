import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  User: a.model({
    username: a.string().required(),
    displayName: a.string().required(),
    role: a.string().required(), // 'parent' | 'child'
    avatar: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  Chore: a.model({
    title: a.string().required(),
    assignedTo: a.string().required(), // User ID
    paid: a.boolean().default(false),
    amount: a.float().default(0),
    done: a.boolean().default(false),
    approved: a.boolean().default(false),
    completedAt: a.string(),
    recurring: a.string(), // 'daily' | 'weekly' | null
    lastReset: a.string(),
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
