'use strict';
// Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { zonedToUtc, dateKey, isoWeekday, label } = require('../lib/booking/time');
const { computeSlots } = require('../lib/booking/slots');
const { validate, DEFAULTS } = require('../lib/booking/settings');
const { buildIcs, fold } = require('../lib/booking/invite');

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
