// Local SQLite store for family data (users, chores, meals, shopping, notes).
// Replaces the AWS Amplify/DynamoDB backend. Column names are camelCase so rows
// can be returned to the frontend as-is, matching the old Amplify shapes.
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { hashPassword } from './auth.js';

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
    assignedTo TEXT REFERENCES users(id),
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
    settled INTEGER NOT NULL DEFAULT 0,
    settledAt TEXT,
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
    targetUserId TEXT REFERENCES users(id),
    pinned INTEGER NOT NULL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS filmRequests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    requestedBy TEXT NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL DEFAULT 'film',
    status TEXT NOT NULL DEFAULT 'pending',
    note TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS liftRequests (
    id TEXT PRIMARY KEY,
    createdBy TEXT NOT NULL REFERENCES users(id),
    dateTime TEXT NOT NULL,              -- ISO: when the lift is needed
    location TEXT NOT NULL,
    lat REAL,
    lng REAL,
    extras TEXT,                         -- e.g. "bike rack"
    note TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','denied','cancelled','arrived')),
    respondedBy TEXT REFERENCES users(id),
    respondedAt TEXT,
    responseNote TEXT,
    deniedBy TEXT,                       -- JSON array of parent ids who passed; deny closes only when all have
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lifts_status ON liftRequests(status);

  CREATE TABLE IF NOT EXISTS pushSubscriptions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_push_user ON pushSubscriptions(userId);

  -- Calorie + exercise tracking (parents only; gated in the route + nav).
  CREATE TABLE IF NOT EXISTS foodLog (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,                       -- YYYY-MM-DD, local day
    mealType TEXT NOT NULL DEFAULT 'snack',   -- breakfast|lunch|dinner|snack
    description TEXT NOT NULL,
    calories INTEGER NOT NULL DEFAULT 0,
    loggedBy TEXT,                            -- 'self' (UI) | 'jarvis' (chat)
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_food_user_date ON foodLog(userId, date);

  CREATE TABLE IF NOT EXISTS exerciseLog (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    minutes INTEGER,
    calories INTEGER NOT NULL DEFAULT 0,      -- calories burned
    loggedBy TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_exercise_user_date ON exerciseLog(userId, date);

  -- Private journal + mood tracking (parents only, and PER-PERSON private:
  -- each parent only ever sees their own rows; enforced in the route by scoping
  -- every query to the acting user's id. One table serves both jobs — a row can
  -- be a quick mood check-in (mood set, body empty), a written entry (body set),
  -- or both. The mood trend reads every row with a mood; the journal list reads
  -- every row with a body.
  CREATE TABLE IF NOT EXISTS journalEntries (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,                       -- YYYY-MM-DD, local day the entry is "for"
    mood INTEGER,                             -- 1..5 (1 rough … 5 great), null if none
    title TEXT,
    body TEXT,
    loggedBy TEXT,                            -- 'self' (UI) | 'jarvis' (chat)
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journalEntries(userId, date);
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

// Migrate DBs created before the notes targeting/pinning columns existed.
for (const [col, def] of [['targetUserId', 'TEXT'], ['pinned', 'INTEGER NOT NULL DEFAULT 0']]) {
  const has = db.prepare('PRAGMA table_info(notes)').all().some((c) => c.name === col);
  if (!has) db.exec(`ALTER TABLE notes ADD COLUMN ${col} ${def}`);
}

// A wallet can now be reset to £0 once the cash is physically handed over.
// "settled" marks paid-out completions as cashed out so they drop off the
// balance without deleting the record (keeps streaks + week-earned history).
for (const [col, def] of [['settled', 'INTEGER NOT NULL DEFAULT 0'], ['settledAt', 'TEXT']]) {
  const has = db.prepare('PRAGMA table_info(choreCompletions)').all().some((c) => c.name === col);
  if (!has) db.exec(`ALTER TABLE choreCompletions ADD COLUMN ${col} ${def}`);
}

// Make chores.assignedTo nullable ("anyone can do it") on DBs where it was
// created NOT NULL. SQLite can't drop a NOT NULL in place, so rebuild the table.
const assignedCol = db.prepare('PRAGMA table_info(chores)').all().find((c) => c.name === 'assignedTo');
if (assignedCol && assignedCol.notnull === 1) {
  db.pragma('foreign_keys = OFF');
  db.exec(`
    BEGIN;
    CREATE TABLE chores_new (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      assignedTo TEXT REFERENCES users(id),
      paid INTEGER NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      recurring TEXT,
      templateId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    INSERT INTO chores_new SELECT id, title, assignedTo, paid, amount, recurring, templateId, createdAt, updatedAt FROM chores;
    DROP TABLE chores;
    ALTER TABLE chores_new RENAME TO chores;
    COMMIT;
  `);
  db.pragma('foreign_keys = ON');
}

// Film requests can be films or TV — add kind to DBs created before it existed.
if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='filmRequests'").get()
    && !db.prepare('PRAGMA table_info(filmRequests)').all().some((c) => c.name === 'kind')) {
  db.exec("ALTER TABLE filmRequests ADD COLUMN kind TEXT NOT NULL DEFAULT 'film'");
}

// A single deny no longer closes a lift — it now needs every parent to pass.
// Track who has passed so far; DBs created before this need the column.
if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='liftRequests'").get()
    && !db.prepare('PRAGMA table_info(liftRequests)').all().some((c) => c.name === 'deniedBy')) {
  db.exec('ALTER TABLE liftRequests ADD COLUMN deniedBy TEXT');
}

// An accepted lift can now be marked 'arrived' (picked up) to clear it from the
// active view. SQLite can't ALTER a CHECK constraint, so rebuild the table when
// the existing one still forbids 'arrived'.
{
  const liftDef = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='liftRequests'").get();
  if (liftDef && !liftDef.sql.includes("'arrived'")) {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      BEGIN TRANSACTION;
      CREATE TABLE liftRequests_new (
        id TEXT PRIMARY KEY,
        createdBy TEXT NOT NULL REFERENCES users(id),
        dateTime TEXT NOT NULL,
        location TEXT NOT NULL,
        lat REAL,
        lng REAL,
        extras TEXT,
        note TEXT,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','denied','cancelled','arrived')),
        respondedBy TEXT REFERENCES users(id),
        respondedAt TEXT,
        responseNote TEXT,
        deniedBy TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      INSERT INTO liftRequests_new
        SELECT id, createdBy, dateTime, location, lat, lng, extras, note, status,
               respondedBy, respondedAt, responseNote, deniedBy, createdAt, updatedAt
          FROM liftRequests;
      DROP TABLE liftRequests;
      ALTER TABLE liftRequests_new RENAME TO liftRequests;
      CREATE INDEX IF NOT EXISTS idx_lifts_status ON liftRequests(status);
      COMMIT;
      PRAGMA foreign_keys=ON;
    `);
  }
}

// Add passwordHash for real server-side auth (was a client-side hardcoded map).
if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'passwordHash')) {
  db.exec('ALTER TABLE users ADD COLUMN passwordHash TEXT');
}
// Backfill hashes for anyone missing one, from the known starter passwords.
// These are the family's existing logins; they can be changed later.
const STARTER_PASSWORDS = { rob: 'family123', aimee: 'family123', dexter: 'dexter1', logan: 'logan1' };
for (const u of db.prepare('SELECT id, username, passwordHash FROM users').all()) {
  if (!u.passwordHash && STARTER_PASSWORDS[u.username]) {
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(hashPassword(STARTER_PASSWORDS[u.username]), u.id);
  }
}

// Health tracking: per-user daily calorie target (null = not tracking).
// Seed the two parents with sensible weight-loss defaults; both editable in the
// UI. Kids stay null and never see the feature.
if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'calorieTarget')) {
  db.exec('ALTER TABLE users ADD COLUMN calorieTarget INTEGER');
  const TARGET_DEFAULTS = { rob: 1900, aimee: 1500 };
  for (const u of db.prepare("SELECT id, username FROM users WHERE role = 'parent'").all()) {
    if (TARGET_DEFAULTS[u.username]) {
      db.prepare('UPDATE users SET calorieTarget = ? WHERE id = ?').run(TARGET_DEFAULTS[u.username], u.id);
    }
  }
}

// Shared parents-only agreements ("us" page). Unlike the journal this is the
// opposite privacy model: both parents read and write the SAME list, so an
// agreement is never one person's memory of a conversation. Kids are role-gated
// out entirely (nav hidden, routes 403).
db.exec(`
  CREATE TABLE IF NOT EXISTS enmAgreements (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    note TEXT,
    addedBy TEXT REFERENCES users(id),
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

// Entries are typed: a plain agreement, a soft limit (approach with care, talk
// first) or a hard limit (absolute no, not negotiable in the moment).
if (!db.prepare('PRAGMA table_info(enmAgreements)').all().some((c) => c.name === 'kind')) {
  db.exec("ALTER TABLE enmAgreements ADD COLUMN kind TEXT NOT NULL DEFAULT 'agreement'");
}

// Interested-list entries carry whose interest it is (a parent's username);
// the page renders them as one column per parent. Null for every other kind.
if (!db.prepare('PRAGMA table_info(enmAgreements)').all().some((c) => c.name === 'who')) {
  db.exec('ALTER TABLE enmAgreements ADD COLUMN who TEXT');
}

// Seed the initial agreed rules once (agreed Rob + Aimee, 8-9 Sep 2026).
if (db.prepare('SELECT COUNT(*) AS n FROM enmAgreements').get().n === 0) {
  const rob = db.prepare("SELECT id FROM users WHERE username = 'rob'").get();
  const seedRules = [
    { text: 'Sexting is fine, as long as we’re not together at the time.' },
    { text: 'Safe sex, always.' },
    { text: 'No sleeping in the same bed overnight with someone else.' },
    { text: 'Nothing happens at home.' },
    { text: 'Kids and family come first, every time.' },
  ];
  const now = Date.now();
  const insert = db.prepare(
    'INSERT INTO enmAgreements (id, text, note, addedBy, createdAt, updatedAt) VALUES (?, ?, NULL, ?, ?, ?)'
  );
  seedRules.forEach((r, i) => {
    // Stagger createdAt so "ORDER BY createdAt" keeps the agreed order stable.
    const ts = new Date(now + i * 1000).toISOString();
    insert.run(randomUUID(), r.text, rob?.id || null, ts, ts);
  });
}

const BOOL_COLUMNS = {
  choreTemplates: ['paid'],
  chores: ['paid'],
  choreCompletions: ['approved', 'paidOut', 'settled'],
  mealRecipes: ['isCustom'],
  shoppingItems: ['checked'],
  notes: ['pinned'],
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
  // Never leak the password hash through the generic get/list helpers.
  if (table === 'users') delete out.passwordHash;
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
