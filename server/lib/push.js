// Web push (VAPID). Keys are generated once and persisted next to the DB, like
// the auth secret — each deployment gets its own pair. The client fetches the
// public key at runtime, so keys never need to match across environments.
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './familyDb.js';

const VAPID_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', '.vapid.json');

let keys;
try {
  keys = JSON.parse(fs.readFileSync(VAPID_PATH, 'utf8'));
} catch {
  keys = webpush.generateVAPIDKeys();
  fs.mkdirSync(path.dirname(VAPID_PATH), { recursive: true });
  fs.writeFileSync(VAPID_PATH, JSON.stringify(keys), { mode: 0o600 });
}
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:rob@cracky.co.uk', keys.publicKey, keys.privateKey);

export function vapidPublicKey() {
  return keys.publicKey;
}

// Send a JSON payload to every subscription owned by the given user ids.
// Prunes dead subscriptions (404/410). Fire-and-forget: never throws.
export async function sendToUsers(userIds, payload) {
  const ids = (userIds || []).filter(Boolean);
  if (!ids.length) return;
  const rows = db
    .prepare(`SELECT * FROM pushSubscriptions WHERE userId IN (${ids.map(() => '?').join(',')})`)
    .all(...ids);
  const body = JSON.stringify(payload);
  await Promise.all(rows.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        db.prepare('DELETE FROM pushSubscriptions WHERE id = ?').run(s.id);
      } else {
        console.error('push send failed:', e.statusCode || e.message);
      }
    }
  }));
}

function whenLabel(iso) {
  const d = new Date(iso);
  const opts = { timeZone: 'Europe/London' };
  const t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...opts });
  const today = new Date().toDateString() === d.toDateString();
  const day = today ? 'today' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...opts });
  return `${day} ${t}`;
}

// New open request -> ping the parents (not the creator).
export function notifyNewLift(row, users) {
  const creator = users.find((u) => u.id === row.createdBy);
  const parents = users.filter((u) => u.role === 'parent' && u.id !== row.createdBy).map((u) => u.id);
  return sendToUsers(parents, {
    title: '🚗 Lift needed',
    body: `${creator ? creator.displayName : 'Someone'} needs a lift ${whenLabel(row.dateTime)} — ${row.location}`,
    url: '/lifts',
    tag: `lift-${row.id}`,
  });
}

// Accepted/denied -> tell the person who asked.
export function notifyLiftResolved(row, users) {
  const responder = users.find((u) => u.id === row.respondedBy);
  const name = responder ? responder.displayName : 'A parent';
  const note = row.responseNote ? ` — "${row.responseNote}"` : '';
  const payload = row.status === 'accepted'
    ? { title: '✅ Lift sorted', body: `${name} is taking you ${whenLabel(row.dateTime)}${note}`, url: '/lifts', tag: `lift-${row.id}` }
    : { title: '🚗 Lift: not this time', body: `${name} can't do it${note}`, url: '/lifts', tag: `lift-${row.id}` };
  return sendToUsers([row.createdBy], payload);
}
