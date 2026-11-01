'use strict';
// Google Calendar calls with a stubbed fetch (no network). Run with: npm test
process.env.GOOGLE_CLIENT_ID = 'id';
process.env.GOOGLE_CLIENT_SECRET = 'secret';
process.env.GOOGLE_REFRESH_TOKEN = 'refresh';
delete process.env.BOOKING_DRY_RUN;

const test = require('node:test');
const assert = require('node:assert/strict');
const google = require('../lib/booking/google');

const calls = [];
let reply = () => ({ status: 200, body: {} });
global.fetch = async (url, opts = {}) => {
  if (String(url).startsWith('https://oauth2.googleapis.com/token')) {
    return { ok: true, status: 200, json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
  }
  const call = { url: String(url), method: opts.method, body: opts.body ? JSON.parse(opts.body) : undefined };
  calls.push(call);
  const { status, body } = reply(call);
  return { ok: status >= 200 && status < 300, status, json: async () => { if (body === undefined) throw new Error('no body'); return body; } };
};

test('mode is google when credentials are set', () => {
  assert.equal(google.mode(), 'google');
});

test('createEvent: Meet link, no Google emails, guest list hidden when asked', async () => {
  reply = () => ({ status: 200, body: { id: 'ev1', iCalUID: 'ev1@google.com', hangoutLink: 'https://meet.google.com/abc-defg-hij', htmlLink: 'https://cal/ev1' } });
  const ev = await google.createEvent({ summary: 'S', description: 'D', start: 0, end: 1800000, timezone: 'Asia/Kolkata', attendees: [{ email: 'a@x.com', name: 'A' }, { email: 'hidden@x.com' }], hideGuests: true });
  assert.deepEqual(ev, { id: 'ev1', iCalUID: 'ev1@google.com', meetLink: 'https://meet.google.com/abc-defg-hij', htmlLink: 'https://cal/ev1' });
  const c = calls.at(-1);
  assert.equal(c.method, 'POST');
  assert.match(c.url, /\/calendars\/primary\/events\?conferenceDataVersion=1&sendUpdates=none$/);
  assert.equal(c.body.guestsCanSeeOtherGuests, false);
  assert.deepEqual(c.body.attendees.map((a) => a.email), ['a@x.com', 'hidden@x.com']);
  await google.createEvent({ summary: 'S', description: 'D', start: 0, end: 1, timezone: 'UTC', attendees: [], hideGuests: false });
  assert.equal(calls.at(-1).body.guestsCanSeeOtherGuests, true);
});

test('deleteEvent: DELETE with sendUpdates=none; 404/410 count as deleted; other errors throw', async () => {
  reply = () => ({ status: 204, body: undefined });
  assert.deepEqual(await google.deleteEvent('ev/1'), { deleted: true });
  const c = calls.at(-1);
  assert.equal(c.method, 'DELETE');
  assert.match(c.url, /\/calendars\/primary\/events\/ev%2F1\?sendUpdates=none$/);

  reply = () => ({ status: 410, body: { error: { message: 'Resource has been deleted' } } });
  assert.deepEqual(await google.deleteEvent('ev1'), { deleted: true, alreadyGone: true });
  reply = () => ({ status: 404, body: { error: { message: 'Not Found' } } });
  assert.deepEqual(await google.deleteEvent('ev1'), { deleted: true, alreadyGone: true });

  reply = () => ({ status: 500, body: { error: { message: 'Backend Error' } } });
  await assert.rejects(google.deleteEvent('ev1'), (e) => e.status === 500 && /Backend Error/.test(e.message));
  reply = () => ({ status: 403, body: { error: { message: 'Insufficient Permission' } } });
  await assert.rejects(google.deleteEvent('ev1'), (e) => e.status === 403);
});
