'use strict';
// /api/admin/bookings/:id/cancel against a stubbed Google API and mail transport. Run with: npm test
const fs = require('fs');
const os = require('os');
const path = require('path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cancel-'));
Object.assign(process.env, {
  GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret', GOOGLE_REFRESH_TOKEN: 'refresh',
  BOOKINGS_FILE: path.join(dir, 'b.jsonl'), BOOKING_SETTINGS_FILE: path.join(dir, 's.json'),
  ADMIN_SESSION_SECRET: 'x'.repeat(40),
});
delete process.env.BOOKING_DRY_RUN;
// Same format as `npm run admin-password` (auth.js reads it when first loaded, so set it first).
const salt = '0'.repeat(32);
process.env.ADMIN_PASSWORD_HASH = `scrypt$${salt}$${require('crypto').scryptSync('correct-horse-battery', salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex')}`;

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { adminRouter } = require('../lib/admin/routes');
const store = require('../lib/booking/store');

// Google: token endpoint OK; DELETE answers with `googleStatus`.
let googleStatus = 204;
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  url = String(url);
  if (url.startsWith('http://127.0.0.1')) return realFetch(url, opts);
  if (url.startsWith('https://oauth2.googleapis.com/token')) return { ok: true, status: 200, json: async () => ({ access_token: 't', expires_in: 3600 }) };
  return { ok: googleStatus < 300, status: googleStatus, json: async () => (googleStatus < 300 ? {} : { error: { message: `status ${googleStatus}` } }) };
};
// Mail: records messages, or fails when `mailFails` is set.
const sent = [];
let mailFails = false;
const transporter = { sendMail: async (m) => { if (mailFails) throw new Error('535 Authentication Failed'); sent.push(m); return {}; } };

const app = express();
app.use(adminRouter({ transporter, loginRateLimit: () => false }));
let base, cookie, server;
const post = (p, body, headers = {}) => realFetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookie || '', ...headers }, body: JSON.stringify(body || {}) })
  .then(async (r) => ({ status: r.status, ...(await r.json()), setCookie: r.headers.get('set-cookie') }));

const hour = (h) => new Date(Date.now() + h * 3600000).toISOString();
const booking = (id, startH, extra) => store.append({
  id, iCalUID: `${id}@google.com`, status: 'confirmed', start: hour(startH), end: hour(startH + 0.5),
  name: 'Asha', email: 'asha@acme.com', company: 'Acme', designation: 'COO', challenge: 'c', meetLink: 'https://meet.google.com/abc',
  invitees: ['asha@acme.com', 'success@incolosystems.com'], bcc: ['theedivesh@gmail.com'], ...extra,
});
const status = (id) => store.all().find((b) => b.id === id).status;

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await post('/api/admin/login', { password: 'correct-horse-battery' });
  assert.equal(r.status, 200);
  cookie = r.setCookie.split(';')[0];
});

test.after(() => { server.close(); fs.rmSync(dir, { recursive: true }); });

test('Google error → 502 and the booking stays confirmed, no email', async () => {
  booking('g500', 30);
  googleStatus = 500;
  const r = await post('/api/admin/bookings/g500/cancel', { reason: 'x' });
  assert.equal(r.status, 502);
  assert.match(r.message, /nothing was changed/);
  assert.equal(status('g500'), 'confirmed');
  assert.equal(sent.length, 0);
});

test('event already deleted by hand in Google (410) → still cancels and emails', async () => {
  googleStatus = 410;
  const r = await post('/api/admin/bookings/g500/cancel', { reason: 'Sorry' });
  assert.equal(r.status, 200);
  assert.equal(r.mailed, true);
  assert.equal(status('g500'), 'cancelled');
  const m = sent.at(-1);
  assert.equal(m.icalEvent.method, 'CANCEL');
  assert.deepEqual(m.bcc, ['theedivesh@gmail.com']);
  assert.ok(!r.upcoming.some((b) => b.id === 'g500'));
});

test('email failure → cancelled anyway, message asks you to email the customer', async () => {
  booking('smtp', 31);
  googleStatus = 204;
  mailFails = true;
  const r = await post('/api/admin/bookings/smtp/cancel', {});
  mailFails = false;
  assert.equal(r.status, 200);
  assert.equal(r.mailed, false);
  assert.match(r.message, /could not be sent.*asha@acme\.com/);
  const rec = store.all().find((b) => b.id === 'smtp');
  assert.equal(rec.status, 'cancelled');
  assert.equal(rec.cancelMailed, false);
});

test('meeting already over → 409, unchanged', async () => {
  booking('past', -2);
  const r = await post('/api/admin/bookings/past/cancel', {});
  assert.equal(r.status, 409);
  assert.equal(status('past'), 'confirmed');
});

test('two cancels at once → only one goes through', async () => {
  booking('race', 32);
  const before = sent.length;
  const [a, b] = await Promise.all([post('/api/admin/bookings/race/cancel', {}), post('/api/admin/bookings/race/cancel', {})]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(sent.length, before + 1);
});

test('guards: signed out → 401, cross-site → 403', async () => {
  booking('guard', 33);
  assert.equal((await post('/api/admin/bookings/guard/cancel', {}, { Cookie: '' })).status, 401);
  assert.equal((await post('/api/admin/bookings/guard/cancel', {}, { Origin: 'https://evil.example' })).status, 403);
  assert.equal(status('guard'), 'confirmed');
});
