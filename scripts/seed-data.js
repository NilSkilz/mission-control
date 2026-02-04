#!/usr/bin/env node
/**
 * Seed initial data for Mission Control
 * Run this after deploying to create the family users.
 * 
 * Usage: node scripts/seed-data.js
 * 
 * This script is idempotent - safe to run multiple times.
 * It checks if users exist before creating them.
 * 
 * Note: Requires amplify_outputs.json to be present.
 * Run `npx ampx sandbox` first for local dev, or run after deployment.
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';

// Load config
let outputs;
try {
  outputs = await import('../amplify_outputs.json', { with: { type: 'json' } });
} catch (e) {
  console.error('❌ amplify_outputs.json not found');
  console.error('   Run `npx ampx sandbox` for local dev, or deploy first.');
  process.exit(1);
}

Amplify.configure(outputs.default, { ssr: true });
const client = generateClient();

const seedUsers = [
  {
    username: 'rob',
    displayName: 'Rob',
    role: 'parent',
    avatar: '👨',
  },
  {
    username: 'aimee',
    displayName: 'Aimee',
    role: 'parent',
    avatar: '👩',
  },
  {
    username: 'dexter',
    displayName: 'Dexter',
    role: 'child',
    avatar: '👦',
  },
  {
    username: 'logan',
    displayName: 'Logan',
    role: 'child',
    avatar: '🧒',
  },
];

async function main() {
  console.log('🌱 Seeding users for Mission Control...\n');

  for (const user of seedUsers) {
    // Check if user already exists
    const { data: existing } = await client.models.User.list({
      filter: { username: { eq: user.username } },
    });

    if (existing && existing.length > 0) {
      console.log(`  ⏭️  ${user.displayName} (${user.username}) already exists`);
      continue;
    }

    const { data, errors } = await client.models.User.create(user);
    if (errors) {
      console.error(`  ❌ Failed to create ${user.displayName}:`, errors);
    } else {
      console.log(`  ✅ Created ${user.displayName} (${user.username}) - ID: ${data.id}`);
    }
  }

  console.log('\n🎉 Done!\n');
  console.log('Passwords (hardcoded in login route):');
  console.log('  Rob & Aimee: family123');
  console.log('  Dexter: dexter1');
  console.log('  Logan: logan1');
}

main().catch(console.error);
