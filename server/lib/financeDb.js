// Household finance tables (parents only, gated in the route + nav).
// Lives in the same SQLite file as the family data. Money is stored in signed
// integer minor units (pence): negative = out, positive = in. Feeds are pushed
// by Jarvis from the LXC (Starling + Monzo pulls) via POST /api/finance/ingest;
// slow-moving things (NS&I, Wealthify, pensions, property) are "assets" with a
// dated value series, seeded below from the numbers Rob gave on 24 Sep 2026.
import db from './familyDb.js';
import { randomUUID } from 'crypto';

db.exec(`
  CREATE TABLE IF NOT EXISTS financeAccounts (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,               -- 'starling' | 'monzo'
    providerId TEXT NOT NULL,             -- provider's account/space uid
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'current', -- 'current' | 'joint' | 'space'
    closed INTEGER NOT NULL DEFAULT 0,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE (provider, providerId)
  );

  CREATE TABLE IF NOT EXISTS financeTransactions (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL REFERENCES financeAccounts(id),
    providerTxnId TEXT NOT NULL,
    ts TEXT NOT NULL,                     -- ISO timestamp
    amountMinor INTEGER NOT NULL,
    description TEXT,
    counterparty TEXT,
    category TEXT,
    UNIQUE (accountId, providerTxnId)
  );
  CREATE INDEX IF NOT EXISTS idx_fin_txn_acct_ts ON financeTransactions(accountId, ts);
  CREATE INDEX IF NOT EXISTS idx_fin_txn_ts ON financeTransactions(ts);

  -- One balance row per account per day (the sync overwrites today's).
  CREATE TABLE IF NOT EXISTS financeBalances (
    accountId TEXT NOT NULL REFERENCES financeAccounts(id),
    date TEXT NOT NULL,                   -- YYYY-MM-DD
    balanceMinor INTEGER NOT NULL,
    PRIMARY KEY (accountId, date)
  );

  CREATE TABLE IF NOT EXISTS financeAssets (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,                   -- 'savings' | 'investment' | 'property' | 'pension'
    note TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS financeAssetValues (
    id TEXT PRIMARY KEY,
    assetId TEXT NOT NULL REFERENCES financeAssets(id),
    date TEXT NOT NULL,
    valueMinor INTEGER NOT NULL,
    source TEXT,                          -- 'seed' | 'true-up' | 'ledger' | 'hpi'
    note TEXT,
    UNIQUE (assetId, date)
  );

  CREATE TABLE IF NOT EXISTS financeMortgages (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    assetKey TEXT,                        -- asset it secures ('house' | 'field')
    originalMinor INTEGER,
    balanceMinor INTEGER NOT NULL,
    balanceAsOf TEXT NOT NULL,            -- YYYY-MM-DD the balance was quoted
    ratePct REAL NOT NULL,
    rateEndsOn TEXT,
    paymentsRemaining INTEGER,
    monthlyPaymentMinor INTEGER,
    startDate TEXT,
    note TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

// Provider payment scheme (DIRECT_DEBIT, STANDING_ORDER, bacs, ...): the honest
// signal for "committed bill" in the P&L. Added 24 Sep 2026, backfilled by sync.
if (!db.prepare('PRAGMA table_info(financeTransactions)').all().some((c) => c.name === 'source')) {
  db.exec('ALTER TABLE financeTransactions ADD COLUMN source TEXT');
}

const now = () => new Date().toISOString();

// ---- seeds (idempotent: keyed rows are only inserted when missing) ----

const SEED_ASSETS = [
  { key: 'nsi', name: 'NS&I Premium Bonds', kind: 'savings',
    note: 'Ledger-tracked: £250/mo in from the Bills space, transfers out to joint. True-up occasionally (reinvested wins are invisible).' },
  { key: 'wealthify', name: 'Wealthify', kind: 'investment',
    note: 'Ledger-tracked via the Starling personal feed (DDs in, Winterflood/Wealthify credits out). True-up value from the app.' },
  { key: 'house', name: 'House', kind: 'property',
    note: 'Bought 2 Feb 2015 for £199,950. Valued from the purchase price (HPI true-ups via sync).' },
  { key: 'field', name: 'The Field', kind: 'property',
    note: 'A couple of acres of meadow + woodland (woodlands.co.uk), ~Dec 2021, held at cost as an investment for the kids.' },
  { key: 'pension-rob', name: "Rob's pensions", kind: 'pension', note: 'Manual: value needed.' },
  { key: 'pension-aimee', name: "Aimee's pensions", kind: 'pension', note: 'Manual: value needed.' },
];

const SEED_VALUES = [
  { key: 'nsi', date: '2026-09-24', valueMinor: 400000, source: 'seed', note: 'From Rob' },
  { key: 'wealthify', date: '2026-09-24', valueMinor: 122607, source: 'seed', note: 'From the app (net contributions £987.02, so +£239 growth)' },
  { key: 'house', date: '2015-02-02', valueMinor: 19995000, source: 'seed', note: 'Purchase price' },
  { key: 'field', date: '2021-12-01', valueMinor: 4200000, source: 'seed', note: 'Purchase price (100% mortgaged)' },
];

const SEED_MORTGAGES = [
  { key: 'house', name: 'House mortgage', assetKey: 'house',
    originalMinor: 17995500, balanceMinor: 12631100, balanceAsOf: '2026-09-24',
    ratePct: 4.44, rateEndsOn: '2027-05-31', paymentsRemaining: 221,
    monthlyPaymentMinor: null, startDate: null,
    note: 'Fix ends 31 May 2027. 10%/yr overpayment allowed. Original £179,955; 221 payments left implies a 30yr term or a remortgage reset.' },
  { key: 'field', name: 'Field mortgage', assetKey: 'field',
    originalMinor: 4200000, balanceMinor: 3512683, balanceAsOf: '2026-09-24',
    ratePct: 1.89, rateEndsOn: '2027-01-31', paymentsRemaining: 231,
    monthlyPaymentMinor: 18151, startDate: '2021-12-01',
    note: '5yr fix from ~Jan 2022 on a 24yr term; rate expires Jan 2027 (nearest cliff in the household).' },
];

const hasAsset = db.prepare('SELECT id FROM financeAssets WHERE key = ?');
const insAsset = db.prepare(
  'INSERT INTO financeAssets (id, key, name, kind, note, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
for (const a of SEED_ASSETS) {
  if (!hasAsset.get(a.key)) insAsset.run(randomUUID(), a.key, a.name, a.kind, a.note, now(), now());
}

const insValue = db.prepare(`
  INSERT INTO financeAssetValues (id, assetId, date, valueMinor, source, note)
  VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (assetId, date) DO NOTHING
`);
for (const v of SEED_VALUES) {
  const asset = hasAsset.get(v.key);
  if (asset) insValue.run(randomUUID(), asset.id, v.date, v.valueMinor, v.source, v.note);
}

const hasMortgage = db.prepare('SELECT id FROM financeMortgages WHERE key = ?');
const insMortgage = db.prepare(`
  INSERT INTO financeMortgages (id, key, name, assetKey, originalMinor, balanceMinor, balanceAsOf,
    ratePct, rateEndsOn, paymentsRemaining, monthlyPaymentMinor, startDate, note, createdAt, updatedAt)
  VALUES (@id, @key, @name, @assetKey, @originalMinor, @balanceMinor, @balanceAsOf,
    @ratePct, @rateEndsOn, @paymentsRemaining, @monthlyPaymentMinor, @startDate, @note, @now, @now)
`);
for (const m of SEED_MORTGAGES) {
  if (!hasMortgage.get(m.key)) insMortgage.run({ ...m, id: randomUUID(), now: now() });
}

// Payments verified against the actual HSBC direct debits in the Starling joint
// feed (24 Sep 2026): house £837.88/mo since the May 2025 rate change, field
// £181.54/mo. Guarded so a future manual edit isn't clobbered.
db.prepare(`UPDATE financeMortgages SET monthlyPaymentMinor = 83788, updatedAt = ?
  WHERE key = 'house' AND monthlyPaymentMinor IS NULL`).run(now());
db.prepare(`UPDATE financeMortgages SET monthlyPaymentMinor = 18154, updatedAt = ?
  WHERE key = 'field' AND monthlyPaymentMinor = 18151`).run(now());

export default db;
