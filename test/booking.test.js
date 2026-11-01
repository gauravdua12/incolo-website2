'use strict';
// Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { zonedToUtc, dateKey, isoWeekday, label } = require('../lib/booking/time');
const { computeSlots } = require('../lib/booking/slots');
const { validate, DEFAULTS } = require('../lib/booking/settings');
const { buildIcs, fold, message, cancelMessage } = require('../lib/booking/invite');

const S = { ...DEFAULTS };
const iso = (ms) => new Date(ms).toISOString();

test('IST wall-clock → UTC', () => {
  assert.equal(iso(zonedToUtc('2026-11-03', '10:00', 'Asia/Kolkata')), '2026-11-03T04:30:00.000Z');
  assert.equal(dateKey(Date.parse('2026-11-02T20:00:00Z'), 'Asia/Kolkata'), '2026-11-03'); // 01:30 IST next day
  assert.equal(isoWeekday('2026-11-01'), 7); // Sunday
  assert.equal(isoWeekday('2026-11-02'), 1); // Monday
  assert.match(label(Date.parse('2026-11-03T05:30:00Z'), 'Asia/Kolkata'), /Tue.*3 Nov 2026.*11:00/);
});

test('DST timezone conversion stays on the wall clock', () => {
  // New York: EST (UTC-5) on 2026-11-03, EDT (UTC-4) on 2026-10-30
  assert.equal(iso(zonedToUtc('2026-11-03', '09:00', 'America/New_York')), '2026-11-03T14:00:00.000Z');
  assert.equal(iso(zonedToUtc('2026-10-30', '09:00', 'America/New_York')), '2026-10-30T13:00:00.000Z');
});

test('slots: Mon–Sat 10–18 IST, 30 min, 24h notice, Sunday excluded', () => {
  const now = Date.parse('2026-11-02T04:30:00Z'); // Mon 2 Nov, 10:00 IST
  const days = computeSlots(S, [], now);
  const dates = days.map((d) => d.date);
  assert.ok(!dates.includes('2026-11-02'), 'today is inside the 24h notice');
  assert.ok(!dates.includes('2026-11-08'), 'Sunday is closed');
  const tue = days.find((d) => d.date === '2026-11-03');
  assert.equal(tue.slots.length, 16); // 10:00…17:30, 8 hours of 30-min slots
  assert.equal(iso(tue.slots[0].start), '2026-11-03T04:30:00.000Z'); // 10:00 IST
  assert.equal(iso(tue.slots.at(-1).end), '2026-11-03T12:30:00.000Z'); // ends 18:00 IST
  assert.ok(dates.at(-1) <= '2026-11-16', 'window is 14 days');
});

test('slots: busy intervals and buffer remove overlapping times', () => {
  const now = Date.parse('2026-11-02T04:30:00Z');
  const busy = [{ start: Date.parse('2026-11-03T05:30:00Z'), end: Date.parse('2026-11-03T06:30:00Z') }]; // 11:00–12:00 IST
  const tue = (s, b) => computeSlots(s, b, now).find((d) => d.date === '2026-11-03').slots.map((x) => iso(x.start));
  const plain = tue(S, busy);
  assert.ok(!plain.includes('2026-11-03T05:30:00.000Z') && !plain.includes('2026-11-03T06:00:00.000Z'));
  assert.ok(plain.includes('2026-11-03T05:00:00.000Z') && plain.includes('2026-11-03T06:30:00.000Z'));
  const buffered = tue({ ...S, bufferMinutes: 15 }, busy);
  assert.ok(!buffered.includes('2026-11-03T05:00:00.000Z') && !buffered.includes('2026-11-03T06:30:00.000Z'));
});

test('slots: blackout dates and custom hours', () => {
  const now = Date.parse('2026-11-02T04:30:00Z');
  const days = computeSlots({ ...S, blackoutDates: ['2026-11-03'], startTime: '14:00', endTime: '15:00', slotMinutes: 60 }, [], now);
  assert.ok(!days.some((d) => d.date === '2026-11-03'));
  assert.deepEqual(days[0].slots.map((s) => iso(s.start)), ['2026-11-04T08:30:00.000Z']);
});

test('settings validation', () => {
  assert.equal(validate({}).ok, true);
  const bad = validate({ invitees: ['ok@x.com', 'nope'], startTime: '18:00', endTime: '10:00', workDays: [], slotMinutes: 5, timezone: 'Mars/Base' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.length >= 5);
  const norm = validate({ invitees: [' A@X.com ', 'a@x.com'], workDays: ['2', 2, 9], extra: 1 });
  assert.deepEqual(norm.settings.invitees, ['a@x.com']);
  assert.deepEqual(norm.settings.workDays, [2]);
  assert.equal('extra' in norm.settings, false);
  const bcc = validate({ invitees: ['a@x.com'], bcc: ['A@x.com', 'b@x.com', 'success@incolosystems.com'] });
  assert.deepEqual(bcc.settings.bcc, ['b@x.com'], 'bcc drops invitees and the organizer');
  assert.equal(validate({ bcc: ['nope'] }).ok, false);
});

test('invite: From is the sender name, Bcc copies are hidden from the guest list', () => {
  const { mail, ics, attendees, bcc } = message({
    booking: { name: 'Asha', email: 'asha@acme.com', company: 'Acme', designation: 'COO', challenge: 'Scrap', startMs: Date.parse('2026-11-03T05:30:00Z'), endMs: Date.parse('2026-11-03T06:00:00Z') },
    settings: S, event: { iCalUID: 'u@google.com', meetLink: 'https://meet.google.com/abc-defg-hij' }, summary: 'Call', description: 'd',
  });
  assert.deepEqual(mail.from, { name: 'Gaurav Dua', address: 'success@incolosystems.com' });
  assert.deepEqual(mail.bcc, ['theedivesh@gmail.com']);
  assert.deepEqual(bcc, ['theedivesh@gmail.com']);
  assert.deepEqual(attendees.map((a) => a.email), ['asha@acme.com', 'success@incolosystems.com']);
  assert.ok(!JSON.stringify(mail.to).includes('theedivesh') && !ics.includes('theedivesh'));
  assert.ok(ics.includes('ORGANIZER;CN=Gaurav Dua:mailto:success@incolosystems.com'));
});

test('ics: structure, escaping, CRLF and folding', () => {
  const ics = buildIcs({
    uid: 'abc123@google.com', start: Date.parse('2026-11-03T05:30:00Z'), end: Date.parse('2026-11-03T06:00:00Z'),
    summary: 'Scoping call · Acme, Inc; Plant 2', description: 'Line 1\nLine 2 with a very long sentence that should definitely be folded because it exceeds seventy-five octets',
    meetLink: 'https://meet.google.com/abc-defg-hij',
    organizer: { name: 'Incolo Systems', email: 'business@incolosystems.com' },
    attendees: [{ name: 'Asha', email: 'asha@acme.com' }, { name: 'Incolo Systems', email: 'business@incolosystems.com' }],
  });
  assert.ok(ics.includes('\r\nMETHOD:REQUEST\r\n'));
  assert.ok(ics.includes('DTSTART:20261103T053000Z'));
  assert.ok(ics.includes('SUMMARY:Scoping call · Acme\\, Inc\\; Plant 2'));
  assert.ok(ics.includes('ORGANIZER;CN=Incolo Systems:mailto:business@incolosystems.com'));
  assert.ok(/ATTENDEE[^\r]*RSVP=TRUE;CN=Asha:mailto:asha@acme.com/.test(ics.replace(/\r\n /g, '')));
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, `line too long: ${line}`);
  assert.equal(fold('é'.repeat(60)).split('\r\n').every((l) => Buffer.byteLength(l) <= 75), true);
  assert.ok(!/[^\r]\n/.test(ics), 'bare LF found');
});

test('ics: cancellation keeps the UID, marks it cancelled, drops the reminder', () => {
  const ics = buildIcs({
    uid: 'abc@google.com', start: Date.parse('2026-11-03T05:30:00Z'), end: Date.parse('2026-11-03T06:00:00Z'),
    summary: 'Call', description: 'Sorry', meetLink: 'https://meet.google.com/x', sequence: 1, method: 'CANCEL',
    organizer: { name: 'Gaurav Dua', email: 'success@incolosystems.com' }, attendees: [{ name: 'Asha', email: 'asha@acme.com' }],
  });
  for (const l of ['METHOD:CANCEL', 'STATUS:CANCELLED', 'UID:abc@google.com', 'SEQUENCE:1']) assert.ok(ics.includes(`\r\n${l}\r\n`), l);
  assert.ok(!ics.includes('VALARM'));
});

test('cancel email: same guests, Bcc hidden, from the original organizer', () => {
  const record = {
    id: 'ev1', iCalUID: 'ev1@google.com', start: '2026-11-03T05:30:00.000Z', end: '2026-11-03T06:00:00.000Z',
    name: 'Asha', email: 'asha@acme.com', company: 'Acme', meetLink: 'https://meet.google.com/abc', summary: 'Incolo Systems scoping call · Acme',
    organizer: { name: 'Gaurav Dua', email: 'success@incolosystems.com' },
    invitees: ['asha@acme.com', 'success@incolosystems.com'], bcc: ['theedivesh@gmail.com'],
  };
  const { mail, ics } = cancelMessage({ record, settings: { ...S, organizerName: 'Someone Else', organizerEmail: 'other@x.com' }, reason: 'Urgent <visit>' });
  assert.deepEqual(mail.from, { name: 'Gaurav Dua', address: 'success@incolosystems.com' });
  assert.deepEqual(mail.to, [{ name: 'Asha', address: 'asha@acme.com' }, { name: 'Gaurav Dua', address: 'success@incolosystems.com' }]);
  assert.deepEqual(mail.bcc, ['theedivesh@gmail.com']);
  assert.equal(mail.icalEvent.method, 'CANCEL');
  assert.match(mail.subject, /^Cancelled: Incolo Systems scoping call · Acme · Tue/);
  assert.ok(mail.html.includes('Urgent &lt;visit&gt;') && !mail.html.includes('<visit>'), 'reason is HTML-escaped');
  assert.ok(mail.text.includes('Urgent <visit>'));
  assert.ok(ics.includes('UID:ev1@google.com') && !ics.includes('theedivesh'));
  // Older records without summary/organizer fall back to the current settings
  const old = cancelMessage({ record: { ...record, summary: undefined, organizer: undefined, bcc: undefined }, settings: S, reason: '' });
  assert.equal(old.mail.from.address, S.organizerEmail);
  assert.match(old.mail.subject, /Incolo Systems scoping call · Acme/);
  assert.equal(old.mail.bcc, undefined);
});

test('store.update rewrites one record and keeps the rest', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bk-'));
  process.env.BOOKINGS_FILE = path.join(dir, 'b.jsonl');
  const store = require('../lib/booking/store');
  const future = (h) => new Date(Date.now() + h * 3600000).toISOString();
  store.append({ id: 'a', status: 'confirmed', start: future(1), end: future(2) });
  fs.appendFileSync(process.env.BOOKINGS_FILE, 'not json\n');
  store.append({ id: 'b', status: 'confirmed', start: future(3), end: future(4) });
  assert.equal(store.update('missing', { status: 'cancelled' }), null);
  assert.equal(store.update('a', { status: 'cancelled' }).status, 'cancelled');
  assert.deepEqual(store.upcoming().map((b) => b.id), ['b']);
  assert.ok(fs.readFileSync(process.env.BOOKINGS_FILE, 'utf8').includes('not json\n'), 'unreadable lines are preserved');
  assert.equal((fs.statSync(process.env.BOOKINGS_FILE).mode & 0o777).toString(8), '600');
  fs.rmSync(dir, { recursive: true });
  delete process.env.BOOKINGS_FILE;
});
