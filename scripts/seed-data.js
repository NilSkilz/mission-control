#!/usr/bin/env node
/**
 * Seed initial data for Mission Control
 * Run this after deploying to create users, chores, and meals.
 * 
 * Usage: node scripts/seed-data.js
 * 
 * This script is idempotent - safe to run multiple times.
 * It checks if items exist before creating them.
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

// ==================== USERS ====================
const seedUsers = [
  { username: 'rob', displayName: 'Rob', role: 'parent', avatar: '👨' },
  { username: 'aimee', displayName: 'Aimee', role: 'parent', avatar: '👩' },
  { username: 'dexter', displayName: 'Dexter', role: 'child', avatar: '👦' },
  { username: 'logan', displayName: 'Logan', role: 'child', avatar: '🧒' },
];

// ==================== CHORES ====================
// Chores will be assigned to users by username (resolved to ID after users are seeded)
const seedChores = [
  // Kids' chores
  { title: 'Make bed', assignedTo: 'dexter', paid: false, recurring: 'daily' },
  { title: 'Make bed', assignedTo: 'logan', paid: false, recurring: 'daily' },
  { title: 'Tidy bedroom', assignedTo: 'dexter', paid: true, amount: 100, recurring: 'weekly' },
  { title: 'Tidy bedroom', assignedTo: 'logan', paid: true, amount: 100, recurring: 'weekly' },
  { title: 'Empty dishwasher', assignedTo: 'dexter', paid: true, amount: 50, recurring: null },
  { title: 'Empty dishwasher', assignedTo: 'logan', paid: true, amount: 50, recurring: null },
  { title: 'Take bins out', assignedTo: 'dexter', paid: true, amount: 100, recurring: 'weekly' },
  { title: 'Hoover downstairs', assignedTo: 'dexter', paid: true, amount: 200, recurring: null },
  { title: 'Hoover downstairs', assignedTo: 'logan', paid: true, amount: 200, recurring: null },
];

// ==================== MEALS ====================
// Get dates for this week (Mon-Sun)
function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
  }
  return dates;
}

const weekDates = getWeekDates();
const seedMeals = [
  // Monday
  { date: weekDates[0], mealType: 'dinner', meal: 'Spaghetti Bolognese', mealId: 'spag-bol' },
  // Tuesday
  { date: weekDates[1], mealType: 'dinner', meal: 'Chicken Stir Fry', mealId: 'chicken-stir-fry' },
  // Wednesday
  { date: weekDates[2], mealType: 'dinner', meal: 'Fish Fingers & Chips', mealId: 'fish-fingers' },
  // Thursday
  { date: weekDates[3], mealType: 'dinner', meal: 'Toad in the Hole', mealId: 'toad-in-hole' },
  // Friday
  { date: weekDates[4], mealType: 'dinner', meal: 'Pizza Night', mealId: 'pizza' },
  // Saturday
  { date: weekDates[5], mealType: 'dinner', meal: 'BBQ Burgers', mealId: 'burgers' },
  // Sunday
  { date: weekDates[6], mealType: 'dinner', meal: 'Roast Chicken', mealId: 'roast-chicken' },
];

// ==================== SEED FUNCTIONS ====================

async function seedUsersData() {
  console.log('👥 Seeding users...\n');
  const userMap = {}; // username -> id

  for (const user of seedUsers) {
    const { data: existing } = await client.models.User.list({
      filter: { username: { eq: user.username } },
    });

    if (existing && existing.length > 0) {
      console.log(`  ⏭️  ${user.displayName} already exists`);
      userMap[user.username] = existing[0].id;
      continue;
    }

    const { data, errors } = await client.models.User.create(user);
    if (errors) {
      console.error(`  ❌ Failed to create ${user.displayName}:`, errors);
    } else {
      console.log(`  ✅ Created ${user.displayName} - ID: ${data.id}`);
      userMap[user.username] = data.id;
    }
  }
  
  return userMap;
}

async function seedChoresData(userMap) {
  console.log('\n🧹 Seeding chores...\n');

  // Check existing chores
  const { data: existingChores } = await client.models.Chore.list();
  if (existingChores && existingChores.length > 0) {
    console.log(`  ⏭️  ${existingChores.length} chores already exist, skipping`);
    return;
  }

  for (const chore of seedChores) {
    const userId = userMap[chore.assignedTo];
    if (!userId) {
      console.error(`  ❌ User not found: ${chore.assignedTo}`);
      continue;
    }

    const { data, errors } = await client.models.Chore.create({
      title: chore.title,
      assignedTo: userId,
      paid: chore.paid,
      amount: chore.amount || 0,
      done: false,
      approved: false,
      recurring: chore.recurring,
    });

    if (errors) {
      console.error(`  ❌ Failed to create chore "${chore.title}":`, errors);
    } else {
      console.log(`  ✅ Created: ${chore.title} (${chore.assignedTo})`);
    }
  }
}

async function seedMealsData() {
  console.log('\n🍽️  Seeding meals...\n');

  // Check existing meals
  const { data: existingMeals } = await client.models.Meal.list();
  if (existingMeals && existingMeals.length > 0) {
    console.log(`  ⏭️  ${existingMeals.length} meals already exist, skipping`);
    return;
  }

  for (const meal of seedMeals) {
    const { data, errors } = await client.models.Meal.create(meal);

    if (errors) {
      console.error(`  ❌ Failed to create meal for ${meal.date}:`, errors);
    } else {
      console.log(`  ✅ ${meal.date}: ${meal.meal}`);
    }
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('🌱 Seeding Mission Control data...\n');
  console.log('=' .repeat(40) + '\n');

  const userMap = await seedUsersData();
  await seedChoresData(userMap);
  await seedMealsData();

  console.log('\n' + '=' .repeat(40));
  console.log('\n🎉 Done!\n');
  console.log('Passwords:');
  console.log('  Rob & Aimee: family123');
  console.log('  Dexter: dexter1');
  console.log('  Logan: logan1');
}

main().catch(console.error);
