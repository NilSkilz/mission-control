// Amplify Gen2 Data Schema Definition
// This defines the DynamoDB tables for Mission Control

export const schema = {
  Users: {
    id: 'string', // Primary key
    username: 'string',
    displayName: 'string',
    role: 'string', // 'parent' | 'child'
    avatar: 'string',
    createdAt: 'string',
  },
  Chores: {
    id: 'string', // Primary key
    title: 'string',
    assignedTo: 'string', // User ID
    paid: 'boolean',
    amount: 'number',
    done: 'boolean',
    approved: 'boolean',
    completedAt: 'string?', // nullable
    recurring: 'string?', // 'daily' | 'weekly' | null
    lastReset: 'string?',
    createdAt: 'string',
  },
  Meals: {
    id: 'string', // Primary key
    date: 'string', // YYYY-MM-DD
    type: 'string', // 'breakfast' | 'lunch' | 'dinner'
    meal: 'string',
    mealId: 'string?', // reference to meals-data.js ID
    createdAt: 'string',
    updatedAt: 'string?',
  },
  Shopping: {
    id: 'string', // Primary key
    name: 'string',
    quantity: 'number',
    estimatedCost: 'number?',
    addedBy: 'string?', // User ID
    checked: 'boolean',
    createdAt: 'string',
  },
} as const;

// Table names used in DynamoDB
export const TABLE_NAMES = {
  Users: 'MissionControl_Users',
  Chores: 'MissionControl_Chores',
  Meals: 'MissionControl_Meals',
  Shopping: 'MissionControl_Shopping',
} as const;
