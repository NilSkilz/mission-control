// Household finances API (parents only; kids are role-gated out entirely).
// Reads come from the finance tables in the family SQLite store; writes arrive
// two ways: Jarvis's sync pushes feed data to /ingest with the shared key, and
// parents (or Jarvis on their behalf) true-up slow assets via /asset-value.
import express from 'express';
import { randomUUID } from 'crypto';
import db from '../lib/financeDb.js';
import { list } from '../lib/familyDb.js';

const router = express.Router();

function actingUser(req) {
  const users = list('users');
  if (req.isJarvis) return users.find((u) => u.username === req.jarvisUser) || null;
  return users.find((u) => u.id === req.userId) || null;
}

function requireParent(req, res) {
  if (req.isJarvis && !req.jarvisUser) return true; // Jarvis acting as itself (sync, briefings)
  const me = actingUser(req);
  if (!me) { res.status(401).json({ error: 'unknown user' }); return null; }
  if (me.role !== 'parent') { res.status(403).json({ error: 'parents only' }); return null; }
  return me;
}

const localDay = () => new Date().toLocaleDateString('en-CA');

// ---- amortisation maths (monthly annuity) ----
function monthlyPayment(balanceMinor, ratePct, nPayments) {
  const r = ratePct / 100 / 12;
  if (!nPayments || nPayments <= 0) return 0;
  if (r === 0) return Math.round(balanceMinor / nPayments);
  return Math.round((balanceMinor * r) / (1 - Math.pow(1 + r, -nPayments)));
}

// Roll a quoted balance forward k months at the quoted rate/payment.
function balanceAfter(balanceMinor, ratePct, paymentMinor, k) {
  const r = ratePct / 100 / 12;
  if (k <= 0) return balanceMinor;
  if (r === 0) return Math.round(balanceMinor - paymentMinor * k);
  const g = Math.pow(1 + r, k);
  return Math.round(balanceMinor * g - paymentMinor * ((g - 1) / r));
}

function monthsBetween(fromISO, toISO) {
  const a = new Date(fromISO), b = new Date(toISO);
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
}

// ---- GET /api/finance/overview ----
router.get('/overview', (req, res) => {
  if (!requireParent(req, res)) return;
  const today = localDay();

  const accounts = db.prepare(`
    SELECT a.*, b.balanceMinor, b.date AS balanceDate
      FROM financeAccounts a
      LEFT JOIN financeBalances b ON b.accountId = a.id
       AND b.date = (SELECT MAX(date) FROM financeBalances WHERE accountId = a.id)
     ORDER BY a.sortOrder, a.name
  `).all().map((a) => ({ ...a, closed: !!a.closed }));

  const assets = db.prepare(`
    SELECT s.*, v.valueMinor, v.date AS valueDate, v.source AS valueSource
      FROM financeAssets s
      LEFT JOIN financeAssetValues v ON v.assetId = s.id
       AND v.date = (SELECT MAX(date) FROM financeAssetValues WHERE assetId = s.id)
     ORDER BY s.kind, s.name
  `).all();

  const mortgages = db.prepare('SELECT * FROM financeMortgages ORDER BY rateEndsOn').all().map((m) => {
    const payment = m.monthlyPaymentMinor || monthlyPayment(m.balanceMinor, m.ratePct, m.paymentsRemaining);
    const elapsed = monthsBetween(m.balanceAsOf, today);
    const currentBalance = Math.min(m.balanceMinor, Math.max(0, balanceAfter(m.balanceMinor, m.ratePct, payment, elapsed)));
    const payoff = new Date(m.balanceAsOf + 'T12:00:00');
    payoff.setMonth(payoff.getMonth() + (m.paymentsRemaining || 0));
    const monthsToRateEnd = m.rateEndsOn ? monthsBetween(today, m.rateEndsOn) : null;
    const secured = assets.find((a) => a.key === m.assetKey);
    return {
      ...m,
      paymentMinor: payment,
      currentBalanceMinor: currentBalance,
      payoffDate: payoff.toLocaleDateString('en-CA'),
      monthsToRateEnd,
      equityMinor: secured?.valueMinor != null ? secured.valueMinor - currentBalance : null,
    };
  });

  // Monthly cash flow, last 12 months, open non-space accounts, internal moves excluded.
  const cashflow = db.prepare(`
    SELECT substr(t.ts, 1, 7) AS month,
           SUM(CASE WHEN t.amountMinor > 0 THEN t.amountMinor ELSE 0 END) AS inMinor,
           SUM(CASE WHEN t.amountMinor < 0 THEN -t.amountMinor ELSE 0 END) AS outMinor
      FROM financeTransactions t
      JOIN financeAccounts a ON a.id = t.accountId
     WHERE a.closed = 0 AND a.kind != 'space'
       AND COALESCE(t.category, '') != 'internal'
       AND t.ts >= datetime('now', '-12 months')
     GROUP BY month ORDER BY month
  `).all();

  const recent = db.prepare(`
    SELECT t.ts, t.amountMinor, t.description, t.counterparty, t.category, a.name AS account
      FROM financeTransactions t
      JOIN financeAccounts a ON a.id = t.accountId
     WHERE a.closed = 0 AND COALESCE(t.category, '') != 'internal'
     ORDER BY t.ts DESC LIMIT 25
  `).all();

  const cash = accounts.filter((a) => !a.closed).reduce((s, a) => s + (a.balanceMinor || 0), 0);
  const assetTotal = assets.reduce((s, a) => s + (a.valueMinor || 0), 0);
  const debt = mortgages.reduce((s, m) => s + m.currentBalanceMinor, 0);

  res.json({
    today,
    accounts,
    assets,
    mortgages,
    cashflow,
    recent,
    totals: { cashMinor: cash, assetsMinor: assetTotal, debtMinor: debt, netWorthMinor: cash + assetTotal - debt },
  });
});

// ---- GET /api/finance/pnl?months=12 ----
// Monthly P&L over the open non-space accounts, internal moves excluded.
// Income splits by who it came from; spending splits into committed bills
// (mortgages, direct debits, subscriptions) vs the variable categories, each
// group broken down by counterparty for the collapsible view.

const NAMES_ROB = new Set(['robert stokes', 'rob stokes', 'r stokes', 'mr robert stokes', 'robert mark stokes']);
const NAMES_AIMEE = new Set(['amy stokes', 'a stokes', 'mrs amy stokes']);
const BILL_SOURCES = new Set(['DIRECT_DEBIT', 'STANDING_ORDER', 'SUBSCRIPTION_CHARGE', 'bacs']);
const BILL_CATEGORIES = new Set(['bills', 'bills_and_services']);

// Income keys are namespaced so 'other income' can't collide with the
// 'everything else' spending bucket in the shared aggregation map.
const INCOME_GROUPS = [
  { key: 'in_rob', label: 'Rob' }, { key: 'in_aimee', label: 'Aimee' }, { key: 'in_other', label: 'Other income' },
];
const SPEND_GROUPS = [
  { key: 'mortgages', label: 'Mortgages' },
  { key: 'bills', label: 'Bills & subscriptions' },
  { key: 'savings', label: 'Savings & investments' },
  { key: 'groceries', label: 'Groceries' },
  { key: 'eating_out', label: 'Eating out' },
  { key: 'transport', label: 'Transport & fuel' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'holidays', label: 'Holidays' },
  { key: 'other', label: 'Everything else' },
];

function pnlGroup(t) {
  const cp = (t.counterparty || '').trim().toLowerCase();
  if (t.amountMinor > 0) {
    if (cp.startsWith('supergroup') || cp.startsWith('aperture') || NAMES_ROB.has(cp)) return 'in_rob';
    if (NAMES_AIMEE.has(cp)) return 'in_aimee';
    return 'in_other';
  }
  if (cp.startsWith('hsbc')) return 'mortgages';
  if (cp === 'ns&i' || cp.startsWith('wealthify')) return 'savings';
  if (BILL_SOURCES.has(t.source) || BILL_CATEGORIES.has(t.category) || cp === 'parentpay') return 'bills';
  if (t.category === 'groceries') return 'groceries';
  if (t.category === 'eating_out') return 'eating_out';
  if (t.category === 'transport' || t.category === 'fuel') return 'transport';
  if (t.category === 'shopping') return 'shopping';
  if (t.category === 'entertainment') return 'entertainment';
  if (t.category === 'holidays') return 'holidays';
  return 'other';
}

router.get('/pnl', (req, res) => {
  if (!requireParent(req, res)) return;
  const nMonths = Math.min(Math.max(parseInt(req.query.months || '12', 10) || 12, 1), 24);
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() - (nMonths - 1));
  const startKey = start.toISOString().slice(0, 7) + '-01';

  const txns = db.prepare(`
    SELECT substr(t.ts, 1, 7) AS month, t.amountMinor, t.counterparty, t.description, t.category, t.source
      FROM financeTransactions t
      JOIN financeAccounts a ON a.id = t.accountId
     WHERE a.closed = 0 AND a.kind != 'space'
       AND COALESCE(t.category, '') != 'internal'
       AND t.ts >= ?
  `).all(startKey);

  const months = [];
  for (let i = 0; i < nMonths; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    months.push(d.toISOString().slice(0, 7));
  }

  const groups = {}; // key -> { byMonth, total, rows: label -> {byMonth,total} }
  for (const t of txns) {
    const key = pnlGroup(t);
    const g = (groups[key] ||= { byMonth: {}, total: 0, rows: {} });
    const amt = Math.abs(t.amountMinor);
    g.byMonth[t.month] = (g.byMonth[t.month] || 0) + amt;
    g.total += amt;
    const label = (t.counterparty || t.description || '(unknown)').trim();
    const r = (g.rows[label] ||= { byMonth: {}, total: 0 });
    r.byMonth[t.month] = (r.byMonth[t.month] || 0) + amt;
    r.total += amt;
  }

  const shape = (defs) => defs
    .filter((d) => groups[d.key])
    .map((d) => {
      const g = groups[d.key];
      const rows = Object.entries(g.rows)
        .sort((a, b) => b[1].total - a[1].total);
      const top = rows.slice(0, 12).map(([label, r]) => ({ label, totalMinor: r.total, byMonth: r.byMonth }));
      const rest = rows.slice(12);
      if (rest.length) {
        const byMonth = {};
        let total = 0;
        for (const [, r] of rest) {
          total += r.total;
          for (const [m, v] of Object.entries(r.byMonth)) byMonth[m] = (byMonth[m] || 0) + v;
        }
        top.push({ label: `${rest.length} smaller payees`, totalMinor: total, byMonth });
      }
      return { key: d.key, label: d.label, totalMinor: g.total, byMonth: g.byMonth, rows: top };
    });

  // Committed vs total, averaged over the last 6 FULL months (current month excluded).
  const thisMonth = localDay().slice(0, 7);
  const full = months.filter((m) => m < thisMonth).slice(-6);
  const avgOver = (keys) => full.length
    ? Math.round(full.reduce((s, m) => s + keys.reduce((k, key) => k + (groups[key]?.byMonth[m] || 0), 0), 0) / full.length)
    : 0;

  res.json({
    months,
    income: shape(INCOME_GROUPS),
    spending: shape(SPEND_GROUPS),
    summary: {
      avgMonths: full,
      minMonthlyOutgoingsMinor: avgOver(['mortgages', 'bills']),
      avgIncomeMinor: avgOver(['in_rob', 'in_aimee', 'in_other']),
      avgSpendMinor: avgOver(SPEND_GROUPS.map((g) => g.key)),
    },
  });
});

// ---- GET /api/finance/transactions?limit=&offset=&accountId=&q= ----
router.get('/transactions', (req, res) => {
  if (!requireParent(req, res)) return;
  const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 500);
  const offset = parseInt(req.query.offset || '0', 10) || 0;
  const where = ['1=1'];
  const params = { limit, offset };
  if (req.query.accountId) { where.push('t.accountId = @accountId'); params.accountId = req.query.accountId; }
  if (req.query.q) { where.push("(t.description LIKE @q OR t.counterparty LIKE @q)"); params.q = `%${req.query.q}%`; }
  const rows = db.prepare(`
    SELECT t.*, a.name AS account FROM financeTransactions t
      JOIN financeAccounts a ON a.id = t.accountId
     WHERE ${where.join(' AND ')}
     ORDER BY t.ts DESC LIMIT @limit OFFSET @offset
  `).all(params);
  res.json({ transactions: rows });
});

// ---- POST /api/finance/ingest (Jarvis sync only) ----
// Body: { accounts: [{provider, providerId, name, kind, closed, sortOrder}],
//         transactions: [{provider, providerAccountId, providerTxnId, ts, amountMinor, description, counterparty, category}],
//         balances: [{provider, providerAccountId, date?, balanceMinor}] }
router.post('/ingest', (req, res) => {
  if (!req.isJarvis) return res.status(403).json({ error: 'sync key required' });
  const { accounts = [], transactions = [], balances = [] } = req.body || {};
  const ts = new Date().toISOString();

  const upsertAccount = db.prepare(`
    INSERT INTO financeAccounts (id, provider, providerId, name, kind, closed, sortOrder, createdAt, updatedAt)
    VALUES (@id, @provider, @providerId, @name, @kind, @closed, @sortOrder, @ts, @ts)
    ON CONFLICT (provider, providerId) DO UPDATE SET
      name = excluded.name, kind = excluded.kind, closed = excluded.closed,
      sortOrder = excluded.sortOrder, updatedAt = excluded.updatedAt
  `);
  const findAccount = db.prepare('SELECT id FROM financeAccounts WHERE provider = ? AND providerId = ?');
  const upsertTxn = db.prepare(`
    INSERT INTO financeTransactions (id, accountId, providerTxnId, ts, amountMinor, description, counterparty, category, source)
    VALUES (@id, @accountId, @providerTxnId, @ts, @amountMinor, @description, @counterparty, @category, @source)
    ON CONFLICT (accountId, providerTxnId) DO UPDATE SET
      ts = excluded.ts, amountMinor = excluded.amountMinor, description = excluded.description,
      counterparty = excluded.counterparty, category = excluded.category, source = excluded.source
  `);
  const upsertBalance = db.prepare(`
    INSERT INTO financeBalances (accountId, date, balanceMinor) VALUES (?, ?, ?)
    ON CONFLICT (accountId, date) DO UPDATE SET balanceMinor = excluded.balanceMinor
  `);

  let nAcc = 0, nTxn = 0, nBal = 0, skipped = 0;
  const run = db.transaction(() => {
    for (const a of accounts) {
      if (!a.provider || !a.providerId || !a.name) { skipped++; continue; }
      upsertAccount.run({
        id: randomUUID(), provider: a.provider, providerId: a.providerId, name: a.name,
        kind: a.kind || 'current', closed: a.closed ? 1 : 0, sortOrder: a.sortOrder || 0, ts,
      });
      nAcc++;
    }
    for (const t of transactions) {
      const acc = findAccount.get(t.provider, t.providerAccountId);
      if (!acc || !t.providerTxnId || !t.ts || typeof t.amountMinor !== 'number') { skipped++; continue; }
      upsertTxn.run({
        id: randomUUID(), accountId: acc.id, providerTxnId: t.providerTxnId, ts: t.ts,
        amountMinor: Math.round(t.amountMinor), description: t.description || null,
        counterparty: t.counterparty || null, category: t.category || null, source: t.source || null,
      });
      nTxn++;
    }
    for (const b of balances) {
      const acc = findAccount.get(b.provider, b.providerAccountId);
      if (!acc || typeof b.balanceMinor !== 'number') { skipped++; continue; }
      upsertBalance.run(acc.id, b.date || localDay(), Math.round(b.balanceMinor));
      nBal++;
    }
  });
  run();
  res.json({ accounts: nAcc, transactions: nTxn, balances: nBal, skipped });
});

// ---- POST /api/finance/asset-value  { key, valuePounds | valueMinor, date?, source?, note? } ----
router.post('/asset-value', (req, res) => {
  if (!requireParent(req, res)) return;
  const { key, valuePounds, valueMinor, date, source, note } = req.body || {};
  const asset = db.prepare('SELECT id FROM financeAssets WHERE key = ?').get(key || '');
  if (!asset) return res.status(404).json({ error: 'unknown asset' });
  const minor = typeof valueMinor === 'number' ? Math.round(valueMinor)
    : typeof valuePounds === 'number' ? Math.round(valuePounds * 100) : null;
  if (minor == null) return res.status(400).json({ error: 'valuePounds or valueMinor required' });
  db.prepare(`
    INSERT INTO financeAssetValues (id, assetId, date, valueMinor, source, note)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (assetId, date) DO UPDATE SET valueMinor = excluded.valueMinor,
      source = excluded.source, note = excluded.note
  `).run(randomUUID(), asset.id, date || localDay(), minor, source || 'true-up', note || null);
  res.json({ ok: true });
});

export default router;
