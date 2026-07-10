// Family data API backed by the local SQLite store (server/lib/familyDb.js).
// Response shapes match the old Amplify models so the frontend data layer maps 1:1.
import express from 'express';
import db, { list, get, create, update, remove } from '../lib/familyDb.js';
import { getEvents } from '../lib/icsCalendar.js';
import { randomUUID } from 'crypto';
import { vapidPublicKey, notifyNewLift, notifyLiftResolved, notifyLiftStillWaiting } from '../lib/push.js';

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

function crud(resource, table, { creatable, updatable, afterCreate }) {
  router.get(`/${resource}`, (req, res) => res.json(list(table)));

  router.get(`/${resource}/:id`, (req, res) => {
    const row = get(table, req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  });

  router.post(`/${resource}`, (req, res) => {
    const data = pick(req.body, creatable);
    try {
      const row = create(table, data);
      if (afterCreate) Promise.resolve(afterCreate(row, req)).catch((e) => console.error(`${resource} afterCreate:`, e));
      res.status(201).json(row);
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

// ---- Lifts (kids ask for a lift, parents accept/deny, first response wins) ----

crud('lifts', 'liftRequests', {
  creatable: ['createdBy', 'dateTime', 'location', 'lat', 'lng', 'extras', 'note'],
  afterCreate: (row) => notifyNewLift(row, list('users')),
});

// A parent accepts or denies an open request.
//  - First ACCEPT wins: the atomic UPDATE only fires while still 'open', so a
//    second responder trying to accept gets a 409.
//  - A DENY does not close the request. We record the parent in `deniedBy` and
//    leave it open for the other parent(s). It only flips to 'denied' once every
//    parent who could take it has passed. Node is single-threaded and there's no
//    await between the read and write below, so the read-modify-write is atomic.
router.post('/lifts/:id/respond', (req, res) => {
  const { userId, decision, note } = req.body;
  if (!['accepted', 'denied'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be "accepted" or "denied"' });
  }
  const actor = userId ? get('users', userId) : null;
  if (!actor || actor.role !== 'parent') {
    return res.status(403).json({ error: 'only a parent can respond to a lift request' });
  }
  const row = get('liftRequests', req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (row.status !== 'open') return res.status(409).json({ error: 'already resolved', request: row });

  const now = new Date().toISOString();
  const trimmedNote = (note && note.trim()) || null;
  const users = list('users');

  if (decision === 'accepted') {
    const result = db.prepare(
      `UPDATE liftRequests
          SET status = 'accepted', respondedBy = @userId, respondedAt = @now,
              responseNote = @note, updatedAt = @now
        WHERE id = @id AND status = 'open'`
    ).run({ id: req.params.id, userId, now, note: trimmedNote });
    const updated = get('liftRequests', req.params.id);
    if (result.changes === 0) return res.status(409).json({ error: 'already resolved', request: updated });
    notifyLiftResolved(updated, users).catch((e) => console.error('lift resolve notify:', e));
    return res.json(updated);
  }

  // decision === 'denied'
  const requiredDeniers = users
    .filter((u) => u.role === 'parent' && u.id !== row.createdBy)
    .map((u) => u.id);
  const deniedBy = new Set(JSON.parse(row.deniedBy || '[]'));
  deniedBy.add(userId);
  const deniedJson = JSON.stringify([...deniedBy]);
  const allPassed = requiredDeniers.length > 0 && requiredDeniers.every((id) => deniedBy.has(id));

  if (allPassed) {
    db.prepare(
      `UPDATE liftRequests
          SET status = 'denied', respondedBy = @userId, respondedAt = @now,
              responseNote = @note, deniedBy = @deniedBy, updatedAt = @now
        WHERE id = @id AND status = 'open'`
    ).run({ id: req.params.id, userId, now, note: trimmedNote, deniedBy: deniedJson });
    const updated = get('liftRequests', req.params.id);
    notifyLiftResolved(updated, users).catch((e) => console.error('lift resolve notify:', e));
    return res.json(updated);
  }

  // Still open — this parent passed, waiting on the other(s). Nudge them.
  db.prepare(
    `UPDATE liftRequests
        SET deniedBy = @deniedBy, updatedAt = @now
      WHERE id = @id AND status = 'open'`
  ).run({ id: req.params.id, now, deniedBy: deniedJson });
  const updated = get('liftRequests', req.params.id);
  notifyLiftStillWaiting(updated, users, userId).catch((e) => console.error('lift waiting notify:', e));
  res.json(updated);
});

// The requester cancels their own still-open request.
router.post('/lifts/:id/cancel', (req, res) => {
  const row = get('liftRequests', req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (row.createdBy !== req.body.userId) {
    return res.status(403).json({ error: 'only the requester can cancel' });
  }
  if (row.status !== 'open') return res.status(409).json({ error: 'not open', request: row });
  res.json(update('liftRequests', req.params.id, { status: 'cancelled' }));
});

// ---- Web push subscriptions ----

router.get('/push/key', (req, res) => res.json({ publicKey: vapidPublicKey() }));

router.post('/push/subscribe', (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: 'invalid subscription' });
  }
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pushSubscriptions (id, userId, endpoint, p256dh, auth, createdAt, updatedAt)
    VALUES (@id, @userId, @endpoint, @p256dh, @auth, @now, @now)
    ON CONFLICT(endpoint) DO UPDATE SET userId = @userId, p256dh = @p256dh, auth = @auth, updatedAt = @now
  `).run({ id: randomUUID(), userId: req.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, now });
  res.status(201).json({ ok: true });
});

router.post('/push/unsubscribe', (req, res) => {
  if (req.body && req.body.endpoint) {
    db.prepare('DELETE FROM pushSubscriptions WHERE endpoint = ?').run(req.body.endpoint);
  }
  res.json({ ok: true });
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
    const data = storeRecipe(req.body);
    if (!data.category) data.category = 'Midweek Mains';
    res.status(201).json(serveRecipe(create('mealRecipes', data)));
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

// ---- Jarvis (family chat) ----
// Real conversation is powered by the Jarvis chat bridge (Rob's Claude Code
// subscription, running on the jarvis LXC) when JARVIS_BRIDGE_URL is set.
// Actions (add to shopping, kids' "can I..." -> parent note) are always handled
// here deterministically since the bridge is text-only. If the bridge is
// unreachable, we fall back to the grounded responder below.

const todayStr = () => new Date().toISOString().slice(0, 10);
const firstNameOf = (u) => (u.displayName || '').split(' ')[0];
const isKidRequest = (q) => /can i|could i|please can|may i|i want to|allowed to|are we allowed/.test(q);

// Build a compact, current snapshot of family life for the LLM to ground on.
async function buildContext(user) {
  const isKid = user.role === 'child';
  const lines = [`Today is ${new Date().toDateString()}.`];

  const dinner = list('meals').find((m) => m.date === todayStr() && (m.mealType || '').toLowerCase() === 'dinner');
  if (dinner) lines.push(`Dinner tonight: ${dinner.meal}.`);

  try {
    const evs = await getEvents({ url: process.env.CALENDAR_ICS_URL, startDate: todayStr(), days: 2 });
    const byDay = { today: [], tomorrow: [] };
    for (const e of evs) (e.date === todayStr() ? byDay.today : byDay.tomorrow).push(`${e.allDay ? 'all day' : e.time} ${e.summary}`);
    if (byDay.today.length) lines.push(`Today's calendar: ${byDay.today.join('; ')}.`);
    if (byDay.tomorrow.length) lines.push(`Tomorrow: ${byDay.tomorrow.join('; ')}.`);
  } catch { /* calendar offline */ }

  const completions = list('choreCompletions');
  if (isKid) {
    const mine = completions.filter((c) => c.userId === user.id);
    const balance = mine.filter((c) => c.paidOut).reduce((s, c) => s + (c.amount || 0), 0);
    const pending = mine.filter((c) => c.approved && !c.paidOut).reduce((s, c) => s + (c.amount || 0), 0);
    const doneToday = new Set(mine.filter((c) => c.completedAt?.slice(0, 10) === todayStr()).map((c) => c.choreId));
    const left = list('chores').filter((c) => c.assignedTo === user.id && !doneToday.has(c.id)).map((c) => c.title);
    lines.push(`${firstNameOf(user)}'s wallet: £${balance.toFixed(2)}${pending ? ` (£${pending.toFixed(2)} awaiting Sunday payout)` : ''}.`);
    lines.push(left.length ? `Chores left today: ${left.join(', ')}.` : `All chores done today.`);
  } else {
    const pendingApprovals = completions.filter((c) => c.approved === false && c.completedAt?.slice(0, 10) === todayStr()).length;
    if (pendingApprovals) lines.push(`${pendingApprovals} chore(s) waiting for a parent to approve.`);
  }

  const notes = list('notes')
    .filter((n) => (!n.expiresAt || n.expiresAt > new Date().toISOString()))
    .filter((n) => !n.targetUserId || n.targetUserId === user.id || n.authorId === user.id)
    .slice(-4).map((n) => n.body);
  if (notes.length) lines.push(`Notice board: ${notes.map((b) => `"${b}"`).join('; ')}.`);

  const shop = list('shoppingItems').filter((i) => !i.checked).map((i) => i.name);
  if (shop.length) lines.push(`Shopping list: ${shop.join(', ')}.`);

  return lines.join('\n');
}

async function callBridge(user, message, context) {
  const url = process.env.JARVIS_BRIDGE_URL;
  if (!url) return null;
  const res = await fetch(`${url.replace(/\/$/, '')}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bridge-Token': process.env.JARVIS_BRIDGE_TOKEN || '' },
    body: JSON.stringify({ name: firstNameOf(user), role: user.role, context, message }),
    signal: AbortSignal.timeout(95_000),
  });
  if (!res.ok) throw new Error(`bridge ${res.status}`);
  return (await res.json()).reply;
}

async function groundedReply(user, text) {
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

  // kid requests: "can I ..." (the note is created in the route, not here)
  if (isKid && isKidRequest(q)) {
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
  const at = new Date().toISOString();
  const q = message.toLowerCase().trim();

  try {
    // ACTION: add to shopping — reliable, done here (the bridge is text-only)
    const addMatch = q.match(/(?:add|put)\s+(.+?)\s+(?:to|on|onto)\s+(?:the\s+)?(?:shopping|list|shop)/);
    if (addMatch && addMatch[1]) {
      const item = addMatch[1].trim();
      create('shoppingItems', { name: item, quantity: 1, addedBy: user.id, checked: false });
      return res.json({ reply: `Done — added **${item}** to the shopping list.`, at });
    }

    // ACTION: a kid asking permission always gets logged as a note for the parents
    if (user.role === 'child' && isKidRequest(q)) {
      create('notes', { authorId: user.id, body: `${firstNameOf(user)} asks: "${message.trim()}"`, targetUserId: null, pinned: 0 });
    }

    // Conversation: real reply via the bridge (Rob's Claude), grounded fallback otherwise
    try {
      const reply = await callBridge(user, message, await buildContext(user));
      if (reply) return res.json({ reply, at, via: 'jarvis' });
    } catch { /* bridge down -> fall through to grounded */ }

    const result = await groundedReply(user, message);
    res.json({ ...result, at, via: 'grounded' });
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
  const data = pick(req.body, ['title', 'requestedBy', 'kind', 'note']);
  if (!data.title || !data.requestedBy) return res.status(400).json({ error: 'title and requestedBy required' });
  data.kind = data.kind === 'tv' ? 'tv' : 'film';
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
