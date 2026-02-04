import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-west-2',
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Table names
const TABLES = {
  Users: 'MissionControl_Users',
  Chores: 'MissionControl_Chores',
  Meals: 'MissionControl_Meals',
  Shopping: 'MissionControl_Shopping',
};

// ==================== USERS ====================

export async function getUsers() {
  const result = await docClient.send(
    new ScanCommand({ TableName: TABLES.Users })
  );
  return result.Items || [];
}

export async function getUserById(id) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.Users,
      Key: { id },
    })
  );
  return result.Item || null;
}

export async function getUserByUsername(username) {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLES.Users,
      FilterExpression: 'username = :username',
      ExpressionAttributeValues: { ':username': username },
    })
  );
  return result.Items?.[0] || null;
}

// ==================== CHORES ====================

export async function getChores() {
  const result = await docClient.send(
    new ScanCommand({ TableName: TABLES.Chores })
  );
  return result.Items || [];
}

export async function getChoreById(id) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.Chores,
      Key: { id },
    })
  );
  return result.Item || null;
}

export async function addChore(chore) {
  const id = uuidv4();
  const item = {
    id,
    title: chore.title,
    assignedTo: chore.assigned_to || chore.assignedTo,
    paid: chore.paid ? true : false,
    amount: chore.amount || 0,
    done: false,
    approved: false,
    completedAt: null,
    recurring: chore.recurring || null,
    lastReset: null,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.Chores,
      Item: item,
    })
  );

  return id;
}

export async function updateChore(id, updates) {
  // Build update expression dynamically
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  Object.entries(updates).forEach(([key, value]) => {
    // Convert snake_case to camelCase for DynamoDB
    const dbKey = key === 'assigned_to' ? 'assignedTo' 
               : key === 'completed_at' ? 'completedAt'
               : key === 'last_reset' ? 'lastReset'
               : key;
    
    const placeholder = `#${dbKey}`;
    const valuePlaceholder = `:${dbKey}`;
    
    updateExpressions.push(`${placeholder} = ${valuePlaceholder}`);
    expressionAttributeNames[placeholder] = dbKey;
    
    // Convert 1/0 to boolean for done/approved
    if (dbKey === 'done' || dbKey === 'approved' || dbKey === 'paid') {
      expressionAttributeValues[valuePlaceholder] = value === 1 || value === true;
    } else {
      expressionAttributeValues[valuePlaceholder] = value;
    }
  });

  if (updateExpressions.length === 0) return;

  await docClient.send(
    new UpdateCommand({
      TableName: TABLES.Chores,
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

export async function deleteChore(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLES.Chores,
      Key: { id },
    })
  );
}

export async function resetRecurringChores() {
  const chores = await getChores();
  const now = new Date();
  const today = now.toDateString();

  for (const chore of chores) {
    if (!chore.recurring) continue;

    const lastReset = chore.lastReset ? new Date(chore.lastReset) : null;
    const lastResetDay = lastReset?.toDateString();

    if (lastResetDay === today) continue;

    let shouldReset = false;

    if (chore.recurring === 'daily') {
      shouldReset = true;
    } else if (chore.recurring === 'weekly') {
      const daysSince = lastReset
        ? Math.floor((now - lastReset) / (1000 * 60 * 60 * 24))
        : 999;
      shouldReset = daysSince >= 7;
    }

    if (shouldReset) {
      await updateChore(chore.id, {
        done: false,
        approved: false,
        completedAt: null,
        lastReset: now.toISOString(),
      });
    }
  }
}

// ==================== MEALS ====================

export async function getMeals() {
  const result = await docClient.send(
    new ScanCommand({ TableName: TABLES.Meals })
  );
  return result.Items || [];
}

export async function getMealByDateAndType(date, type) {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLES.Meals,
      FilterExpression: '#date = :date AND #type = :type',
      ExpressionAttributeNames: { '#date': 'date', '#type': 'type' },
      ExpressionAttributeValues: { ':date': date, ':type': type },
    })
  );
  return result.Items?.[0] || null;
}

export async function setMeal(date, mealType, meal, mealId = null) {
  const existing = await getMealByDateAndType(date, mealType);

  if (existing) {
    if (meal) {
      // Update existing
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.Meals,
          Key: { id: existing.id },
          UpdateExpression: 'SET meal = :meal, mealId = :mealId, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':meal': meal,
            ':mealId': mealId,
            ':updatedAt': new Date().toISOString(),
          },
        })
      );
    } else {
      // Delete if meal is empty
      await docClient.send(
        new DeleteCommand({
          TableName: TABLES.Meals,
          Key: { id: existing.id },
        })
      );
    }
  } else if (meal) {
    // Create new
    const id = uuidv4();
    await docClient.send(
      new PutCommand({
        TableName: TABLES.Meals,
        Item: {
          id,
          date,
          type: mealType,
          meal,
          mealId,
          createdAt: new Date().toISOString(),
        },
      })
    );
  }
}

// ==================== SHOPPING ====================

export async function getShoppingItems() {
  const result = await docClient.send(
    new ScanCommand({ TableName: TABLES.Shopping })
  );
  return result.Items || [];
}

export async function addShoppingItem(item) {
  const id = uuidv4();
  const newItem = {
    id,
    name: item.name,
    quantity: item.quantity || 1,
    estimatedCost: item.estimated_cost || item.estimatedCost || null,
    addedBy: item.added_by || item.addedBy || null,
    checked: false,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.Shopping,
      Item: newItem,
    })
  );

  return id;
}

export async function updateShoppingItem(id, updates) {
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  Object.entries(updates).forEach(([key, value]) => {
    // Convert snake_case to camelCase
    const dbKey = key === 'estimated_cost' ? 'estimatedCost'
               : key === 'added_by' ? 'addedBy'
               : key;
    
    const placeholder = `#${dbKey}`;
    const valuePlaceholder = `:${dbKey}`;

    updateExpressions.push(`${placeholder} = ${valuePlaceholder}`);
    expressionAttributeNames[placeholder] = dbKey;
    expressionAttributeValues[valuePlaceholder] = value;
  });

  if (updateExpressions.length === 0) return;

  await docClient.send(
    new UpdateCommand({
      TableName: TABLES.Shopping,
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

export async function deleteShoppingItem(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLES.Shopping,
      Key: { id },
    })
  );
}

export async function clearCheckedItems() {
  const items = await getShoppingItems();
  const checkedItems = items.filter((i) => i.checked);

  for (const item of checkedItems) {
    await deleteShoppingItem(item.id);
  }
}

// ==================== EARNINGS ====================

export async function getEarnings() {
  const users = await getUsers();
  const chores = await getChores();
  const children = users.filter((u) => u.role === 'child');

  return children.map((child) => {
    const approvedChores = chores.filter(
      (c) => c.assignedTo === child.id && c.approved && c.paid
    );
    const total = approvedChores.reduce((sum, c) => sum + (c.amount || 0), 0);
    return {
      user: child,
      total,
      chores: approvedChores.length,
    };
  });
}
