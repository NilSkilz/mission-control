// Family data API backed by the local SQLite store (server/lib/familyDb.js).
// Response shapes match the old Amplify models so the frontend data layer maps 1:1.
import express from 'express';
import db, { list, get, create, update, remove } from '../lib/familyDb.js';
import { getEvents } from '../lib/icsCalendar.js';

const router = express.Router();

// ==================== CALENDAR (read-only, from published iCloud ICS) ====================
// GET /api/family/calendar?date=YYYY-MM-DD&days=N  (defaults: today, 1 day)
router.get('/calendar', async (req, res) => {
  const url = process.env.CALENDAR_ICS_URL;
  if (!url) return res.json({ events: [], configured: false });
  const startDate = req.query.date || new Date().toISOString().slice(0, 10);
  const days = Math.min(Math.max(parseInt(req.query.days || '1', 10) || 1, 1), 42);
  try {
    const events = await getEvents({ url, startDate, days });
    res.json({ events, configured: true });
  } catch (e) {
    res.status(502).json({ events: [], configured: true, error: e.message });
  }
});

function crud(resource, table, { creatable, updatable }) {
  router.get(`/${resource}`, (req, res) => res.json(list(table)));

  router.get(`/${resource}/:id`, (req, res) => {
    const row = get(table, req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  });

  router.post(`/${resource}`, (req, res) => {
    const data = pick(req.body, creatable);
    try {
      res.status(201).json(create(table, data));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.patch(`/${resource}/:id`, (req, res) => {
    const data = pick(req.body, updatable || creatable);
    try {
      const row = update(table, req.params.id, data);
      if (!row) return res.status(404).json({ error: 'not found' });
      res.json(row);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.delete(`/${resource}/:id`, (req, res) => {
    if (!remove(table, req.params.id)) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  });
}

function pick(body, keys) {
  const out = {};
  for (const k of keys) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

crud('users', 'users', {
  creatable: ['username', 'displayName', 'role', 'avatar', 'color'],
});

crud('chore-templates', 'choreTemplates', {
  creatable: ['title', 'defaultAmount', 'paid', 'suggestedRecurring'],
});

crud('chores', 'chores', {
  creatable: ['title', 'assignedTo', 'paid', 'amount', 'recurring', 'templateId'],
});

crud('shopping', 'shoppingItems', {
  creatable: ['name', 'quantity', 'estimatedCost', 'addedBy', 'checked'],
});

router.post('/shopping/clear-checked', (req, res) => {
  const cleared = db.prepare('DELETE FROM shoppingItems WHERE checked = 1').run().changes;
  res.json({ cleared });
});

// ---- Chore completions (the approval/wallet loop) ----

router.get('/completions', (req, res) => {
  const where = {};
  if (req.query.userId) where.userId = req.query.userId;
  if (req.query.choreId) where.choreId = req.query.choreId;
  res.json(list('choreCompletions', where));
});

router.post('/chores/:id/complete', (req, res) => {
  const chore = get('chores', req.params.id);
  if (!chore) return res.status(404).json({ error: 'chore not found' });
  const completion = create('choreCompletions', {
    choreId: chore.id,
    userId: req.body.userId || chore.assignedTo,
    choreTitle: chore.title,
    amount: chore.paid ? chore.amount || 0 : 0,
    completedAt: new Date().toISOString(),
    approved: false,
    paidOut: false,
  });
  res.status(201).json(completion);
});

router.post('/completions/:id/approve', (req, res) => {
  const row = update('choreCompletions', req.params.id, {
    approved: true,
    approvedAt: new Date().toISOString(),
  });
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

router.delete('/completions/:id', (req, res) => {
  if (!remove('choreCompletions', req.params.id)) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

// Pay out all approved unpaid completions for a user
router.post('/users/:id/payout', (req, res) => {
  const now = new Date().toISOString();
  const paid = db.prepare(`
    UPDATE choreCompletions SET paidOut = 1, paidAt = ?, updatedAt = ?
    WHERE userId = ? AND approved = 1 AND paidOut = 0
  `).run(now, now, req.params.id).changes;
  res.json({ paid });
});

// ---- Meals (upsert keyed on date + mealType; empty meal deletes the slot) ----

router.get('/meals', (req, res) => res.json(list('meals')));

router.put('/meals', (req, res) => {
  const { date, mealType, meal, mealId = null } = req.body;
  if (!date || !mealType) return res.status(400).json({ error: 'date and mealType required' });
  const existing = db.prepare('SELECT * FROM meals WHERE date = ? AND mealType = ?').get(date, mealType);
  if (!meal) {
    if (existing) remove('meals', existing.id);
    return res.json({ deleted: !!existing });
  }
  const row = existing
    ? update('meals', existing.id, { meal, mealId })
    : create('meals', { date, mealType, meal, mealId });
  res.json(row);
});

// ---- Meal recipes (tags/ingredients stored as JSON text, served as arrays) ----

function serveRecipe(row) {
  return { ...row, tags: JSON.parse(row.tags || '[]'), ingredients: JSON.parse(row.ingredients || '[]') };
}

function storeRecipe(body) {
  const data = pick(body, ['name', 'category', 'tags', 'serves', 'time', 'day', 'note', 'ingredients', 'isCustom']);
  if (data.tags !== undefined) data.tags = JSON.stringify(data.tags || []);
  if (data.ingredients !== undefined) data.ingredients = JSON.stringify(data.ingredients || []);
  return data;
}

router.get('/recipes', (req, res) => res.json(list('mealRecipes').map(serveRecipe)));

router.get('/recipes/:id', (req, res) => {
  const row = get('mealRecipes', req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(serveRecipe(row));
});

router.post('/recipes', (req, res) => {
  try {
    res.status(201).json(serveRecipe(create('mealRecipes', storeRecipe(req.body))));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/recipes/:id', (req, res) => {
  const row = update('mealRecipes', req.params.id, storeRecipe(req.body));
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(serveRecipe(row));
});

router.delete('/recipes/:id', (req, res) => {
  if (!remove('mealRecipes', req.params.id)) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

// ---- Notes (family noticeboard: seen-by receipts, optional expiry) ----

function serveNote(row) {
  const receipts = db.prepare('SELECT userId, seenAt FROM noteReceipts WHERE noteId = ?').all(row.id);
  return { ...row, seenBy: receipts };
}

router.get('/notes', (req, res) => {
  let notes = list('notes');
  if (req.query.includeExpired !== '1') {
    const now = new Date().toISOString();
    notes = notes.filter((n) => !n.expiresAt || n.expiresAt > now);
  }
  // pinned first, then newest
  notes.sort((a, b) => (b.pinned - a.pinned) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.json(notes.map(serveNote));
});

router.post('/notes', (req, res) => {
  const data = pick(req.body, ['authorId', 'body', 'targetUserId', 'pinned', 'expiresAt']);
  if (!data.authorId || !data.body) return res.status(400).json({ error: 'authorId and body required' });
  try {
    res.status(201).json(serveNote(create('notes', data)));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/notes/:id', (req, res) => {
  const row = update('notes', req.params.id, pick(req.body, ['body', 'targetUserId', 'pinned', 'expiresAt']));
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(serveNote(row));
});

router.delete('/notes/:id', (req, res) => {
  if (!remove('notes', req.params.id)) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

router.post('/notes/:id/seen', (req, res) => {
  const note = get('notes', req.params.id);
  if (!note) return res.status(404).json({ error: 'not found' });
  if (!req.body.userId) return res.status(400).json({ error: 'userId required' });
  db.prepare(`
    INSERT INTO noteReceipts (noteId, userId, seenAt) VALUES (?, ?, ?)
    ON CONFLICT (noteId, userId) DO NOTHING
  `).run(note.id, req.body.userId, new Date().toISOString());
  res.json(serveNote(note));
});

// ---- Jarvis (family chat, grounded in the family's own data, scoped per person) ----
// No LLM required: answers real questions deterministically from the store, and
// routes kids' "can I..." asks to a parent note. If ANTHROPIC_API_KEY is ever set
// this is where a freeform fallback would hook in.

const todayStr = () => new Date().toISOString().slice(0, 10);

async function jarvisReply(user, text) {
  const q = (text || '').toLowerCase().trim();
  const isKid = user.role === 'child';
  const name = (user.displayName || '').split(' ')[0];

  const ask = (re) => re.test(q);

  // add to shopping: "add milk to shopping" / "add milk to the list"
  const addMatch = q.match(/add (.+?)(?: to (?:the )?(?:shopping|list|shop))?$/);
  if (ask(/\b(add|need|buy|get)\b/) && ask(/shop|list|milk|bread|need|buy/) && addMatch) {
    const item = addMatch[1].replace(/\b(to|the|shopping|list|shop)\b/g, '').trim();
    if (item) {
      create('shoppingItems', { name: item, quantity: 1, addedBy: user.id, checked: false });
      return { reply: `Done — added **${item}** to the shopping list.` };
    }
  }

  // dinner / food tonight
  if (ask(/dinner|tea|eat|food|cook|what'?s for/)) {
    const m = list('meals').find((x) => x.date === todayStr() && (x.mealType || '').toLowerCase() === 'dinner');
    return { reply: m ? `Dinner tonight is **${m.meal}** 🍽️` : `No dinner's planned yet. Someone can pick one on the meals page.` };
  }

  // tomorrow / today's calendar
  if (ask(/tomorrow|what'?s on|calendar|schedule|plan|happening/)) {
    const wantsTomorrow = ask(/tomorrow/);
    const start = wantsTomorrow ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : todayStr();
    let events = [];
    try { events = await getEvents({ url: process.env.CALENDAR_ICS_URL, startDate: start, days: 1 }); } catch { /* offline */ }
    if (events.length === 0) return { reply: `Nothing on the calendar ${wantsTomorrow ? 'tomorrow' : 'today'}.` };
    const lines = events.map((e) => `• ${e.allDay ? 'all day' : e.time} — ${e.summary}`).join('\n');
    return { reply: `${wantsTomorrow ? 'Tomorrow' : 'Today'}:\n${lines}` };
  }

  // chores / wallet
  if (ask(/chore|job|task|wallet|money|pocket|earn/)) {
    const completions = list('choreCompletions').filter((c) => c.userId === user.id);
    const balance = completions.filter((c) => c.paidOut).reduce((s, c) => s + (c.amount || 0), 0);
    const pending = completions.filter((c) => c.approved && !c.paidOut).reduce((s, c) => s + (c.amount || 0), 0);
    if (ask(/wallet|money|pocket|earn/)) {
      return { reply: `Your wallet is **£${balance.toFixed(2)}**${pending > 0 ? `, with £${pending.toFixed(2)} approved and waiting for Sunday's payout.` : '.'}` };
    }
    const mine = list('chores').filter((c) => c.assignedTo === user.id);
    const doneIds = new Set(completions.filter((c) => c.completedAt?.slice(0, 10) === todayStr()).map((c) => c.choreId));
    const left = mine.filter((c) => !doneIds.has(c.id));
    return { reply: left.length ? `You've got ${left.length} chore${left.length > 1 ? 's' : ''} left today: ${left.map((c) => c.title).join(', ')}.` : `All your chores are done — nice one. 🎉` };
  }

  // kid requests: "can I ..." -> parent note
  if (isKid && ask(/can i|could i|please can|may i|i want to|allowed to/)) {
    create('notes', { authorId: user.id, body: `${name} asks: "${text.trim()}"`, targetUserId: null, pinned: 0 });
    return { reply: `I've passed that to Mum and Dad to say yes or no. 🙏` };
  }

  // shopping view
  if (ask(/shopping|shop|list/)) {
    const items = list('shoppingItems').filter((i) => !i.checked);
    return { reply: items.length ? `On the shopping list: ${items.map((i) => i.name).join(', ')}.` : `The shopping list is empty right now.` };
  }

  // help / greeting
  return {
    reply: `Hi ${name}! I know the family's calendar, chores, meals and shopping. Try "what's for dinner?", "my chores", "what's on tomorrow?"${isKid ? ', or ask me for something and I\'ll check with a grown-up.' : ', or "add milk to the shopping".'}`,
  };
}

router.post('/jarvis', async (req, res) => {
  const { userId, message } = req.body;
  const user = userId && get('users', userId);
  if (!user) return res.status(400).json({ error: 'unknown user' });
  if (!message || !message.trim()) return res.status(400).json({ error: 'message required' });
  try {
    const result = await jarvisReply(user, message);
    res.json({ ...result, at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Film requests (cinema: kid asks -> parent approves; the 90% wrapped, Seerr for the 10%) ----

router.get('/film-requests', (req, res) => {
  const rows = list('filmRequests');
  rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.json(rows);
});

router.post('/film-requests', (req, res) => {
  const data = pick(req.body, ['title', 'requestedBy', 'note']);
  if (!data.title || !data.requestedBy) return res.status(400).json({ error: 'title and requestedBy required' });
  data.status = 'pending';
  try {
    res.status(201).json(create('filmRequests', data));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/film-requests/:id', (req, res) => {
  const row = update('filmRequests', req.params.id, pick(req.body, ['status', 'note', 'title']));
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

router.delete('/film-requests/:id', (req, res) => {
  if (!remove('filmRequests', req.params.id)) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

export default router;
