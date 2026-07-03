// Local SQLite store for family data (users, chores, meals, shopping, notes).
// Replaces the AWS Amplify/DynamoDB backend. Column names are camelCase so rows
// can be returned to the frontend as-is, matching the old Amplify shapes.
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const DEFAULT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'family.sqlite'
);
const DB_PATH = process.env.FAMILY_DB_PATH || DEFAULT_PATH;

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    displayName TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
    avatar TEXT,
    color TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS choreTemplates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    defaultAmount REAL NOT NULL DEFAULT 0,
    paid INTEGER NOT NULL DEFAULT 0,
    suggestedRecurring TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chores (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    assignedTo TEXT NOT NULL REFERENCES users(id),
    paid INTEGER NOT NULL DEFAULT 0,
    amount REAL NOT NULL DEFAULT 0,
    recurring TEXT,
    templateId TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS choreCompletions (
    id TEXT PRIMARY KEY,
    choreId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES users(id),
    choreTitle TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    completedAt TEXT NOT NULL,
    approved INTEGER NOT NULL DEFAULT 0,
    approvedAt TEXT,
    paidOut INTEGER NOT NULL DEFAULT 0,
    paidAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_completions_user ON choreCompletions(userId);
  CREATE INDEX IF NOT EXISTS idx_completions_chore ON choreCompletions(choreId);

  CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    mealType TEXT NOT NULL,
    meal TEXT NOT NULL,
    mealId TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE (date, mealType)
  );

  CREATE TABLE IF NOT EXISTS mealRecipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    serves TEXT,
    time TEXT,
    day TEXT,
    note TEXT,
    ingredients TEXT NOT NULL DEFAULT '[]',
    isCustom INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shoppingItems (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    estimatedCost REAL,
    addedBy TEXT,
    checked INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    authorId TEXT NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    expiresAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS noteReceipts (
    noteId TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES users(id),
    seenAt TEXT NOT NULL,
    PRIMARY KEY (noteId, userId)
  );
`);

// Seed the family on first run (matches the old mock users, plus Tide person colours)
const seedUsers = [
  { username: 'rob', displayName: 'Rob', role: 'parent', avatar: '👨', color: '#5D6470' },
  { username: 'aimee', displayName: 'Aimee', role: 'parent', avatar: '👩', color: '#C25E7E' },
  { username: 'dexter', displayName: 'Dexter', role: 'child', avatar: '🧒', color: '#3D6BC6' },
  { username: 'logan', displayName: 'Logan', role: 'child', avatar: '👦', color: '#3C9D5D' },
];

if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0) {
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO users (id, username, displayName, role, avatar, color, createdAt, updatedAt)
    VALUES (@id, @username, @displayName, @role, @avatar, @color, @now, @now)
  `);
  for (const u of seedUsers) insert.run({ ...u, id: randomUUID(), now });
}

const BOOL_COLUMNS = {
  choreTemplates: ['paid'],
  chores: ['paid'],
  choreCompletions: ['approved', 'paidOut'],
  mealRecipes: ['isCustom'],
  shoppingItems: ['checked'],
};

// SQLite stores booleans as 0/1; convert both directions so the API speaks JSON booleans
function toRow(table, obj) {
  const out = { ...obj };
  for (const col of BOOL_COLUMNS[table] || []) {
    if (col in out) out[col] = out[col] ? 1 : 0;
  }
  return out;
}

function fromRow(table, row) {
  if (!row) return row;
  const out = { ...row };
  for (const col of BOOL_COLUMNS[table] || []) {
    if (col in out) out[col] = !!out[col];
  }
  return out;
}

const TABLE_COLUMNS = {};
function columnsFor(table) {
  if (!TABLE_COLUMNS[table]) {
    TABLE_COLUMNS[table] = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  }
  return TABLE_COLUMNS[table];
}

export function list(table, where = {}) {
  const keys = Object.keys(where);
  const clause = keys.length ? ` WHERE ${keys.map((k) => `${k} = @${k}`).join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM ${table}${clause} ORDER BY createdAt`).all(toRow(table, where));
  return rows.map((r) => fromRow(table, r));
}

export function get(table, id) {
  return fromRow(table, db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
}

export function create(table, data) {
  const now = new Date().toISOString();
  const row = toRow(table, { ...data, id: data.id || randomUUID(), createdAt: now, updatedAt: now });
  const cols = columnsFor(table).filter((c) => c in row);
  db.prepare(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`
  ).run(row);
  return get(table, row.id);
}

export function update(table, id, data) {
  const row = toRow(table, { ...data, updatedAt: new Date().toISOString() });
  delete row.id;
  delete row.createdAt;
  const cols = columnsFor(table).filter((c) => c in row);
  if (!cols.length) return get(table, id);
  const result = db.prepare(
    `UPDATE ${table} SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @__id`
  ).run({ ...row, __id: id });
  if (result.changes === 0) return null;
  return get(table, id);
}

export function remove(table, id) {
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0;
}

export default db;
