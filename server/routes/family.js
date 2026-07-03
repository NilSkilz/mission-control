// Family data API backed by the local SQLite store (server/lib/familyDb.js).
// Response shapes match the old Amplify models so the frontend data layer maps 1:1.
import express from 'express';
import db, { list, get, create, update, remove } from '../lib/familyDb.js';

const router = express.Router();

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
  res.json(notes.map(serveNote));
});

router.post('/notes', (req, res) => {
  const data = pick(req.body, ['authorId', 'body', 'expiresAt']);
  if (!data.authorId || !data.body) return res.status(400).json({ error: 'authorId and body required' });
  try {
    res.status(201).json(serveNote(create('notes', data)));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/notes/:id', (req, res) => {
  const row = update('notes', req.params.id, pick(req.body, ['body', 'expiresAt']));
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

export default router;
