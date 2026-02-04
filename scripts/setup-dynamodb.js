#!/usr/bin/env node
import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const REGION = process.env.AWS_REGION || 'eu-west-2';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLES = {
  Users: 'MissionControl_Users',
  Chores: 'MissionControl_Chores',
  Meals: 'MissionControl_Meals',
  Shopping: 'MissionControl_Shopping',
};

// Table definitions
const tableDefinitions = [
  {
    TableName: TABLES.Users,
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: TABLES.Chores,
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: TABLES.Meals,
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: TABLES.Shopping,
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

// Seed users with known IDs
const seedUsers = [
  {
    id: 'user-rob',
    username: 'rob',
    displayName: 'Rob',
    role: 'parent',
    avatar: '👨',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-aimee',
    username: 'aimee',
    displayName: 'Aimee',
    role: 'parent',
    avatar: '👩',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-dexter',
    username: 'dexter',
    displayName: 'Dexter',
    role: 'child',
    avatar: '👦',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-logan',
    username: 'logan',
    displayName: 'Logan',
    role: 'child',
    avatar: '🧒',
    createdAt: new Date().toISOString(),
  },
];

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return false;
    }
    throw error;
  }
}

async function waitForTable(tableName) {
  console.log(`  Waiting for ${tableName} to be active...`);
  let attempts = 0;
  while (attempts < 30) {
    try {
      const response = await client.send(
        new DescribeTableCommand({ TableName: tableName })
      );
      if (response.Table.TableStatus === 'ACTIVE') {
        console.log(`  ✓ ${tableName} is active`);
        return;
      }
    } catch (error) {
      // Table might not exist yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }
  throw new Error(`Timeout waiting for table ${tableName}`);
}

async function createTables() {
  console.log('\n📦 Creating DynamoDB tables...\n');

  for (const tableDef of tableDefinitions) {
    const exists = await tableExists(tableDef.TableName);
    if (exists) {
      console.log(`  ⏭️  ${tableDef.TableName} already exists, skipping`);
    } else {
      console.log(`  Creating ${tableDef.TableName}...`);
      await client.send(new CreateTableCommand(tableDef));
      await waitForTable(tableDef.TableName);
    }
  }

  console.log('\n✅ All tables created!\n');
}

async function seedData() {
  console.log('🌱 Seeding users...\n');

  for (const user of seedUsers) {
    console.log(`  Adding user: ${user.displayName} (${user.username})`);
    await docClient.send(
      new PutCommand({
        TableName: TABLES.Users,
        Item: user,
      })
    );
  }

  console.log('\n✅ Users seeded!\n');
}

async function main() {
  console.log('🚀 Mission Control DynamoDB Setup');
  console.log('==================================\n');
  console.log(`Region: ${REGION}`);

  try {
    await createTables();
    await seedData();
    console.log('🎉 Setup complete!\n');
    console.log('User IDs for reference:');
    seedUsers.forEach((u) => {
      console.log(`  ${u.displayName}: ${u.id}`);
    });
    console.log('\nPasswords (hardcoded in login route):');
    console.log('  Rob & Aimee: family123');
    console.log('  Dexter: dexter1');
    console.log('  Logan: logan1');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
