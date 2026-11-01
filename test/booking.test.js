'use strict';
// Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { zonedToUtc, dateKey, isoWeekday, label } = require('../lib/booking/time');
const { computeSlots, withinLimit } = require('../lib/booking/slots');
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

const at = (days, date) => (days.find((d) => d.date === date) || { slots: [] }).slots;
const ist = (ms) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);
const only = (slots, id) => slots.filter((x) => x.groups.includes(id)).map((x) => ist(x.start));

test('slots: 3 India/Middle East + 2 Europe calls a day, 45 min, merged when they coincide', () => {
  const now = Date.parse('2026-11-02T04:30:00Z'); // Mon 2 Nov, 10:00 IST
  const days = computeSlots(S, [], now);
  const dates = days.map((d) => d.date);
  assert.ok(!dates.includes('2026-11-02'), 'today is inside the 24h notice');
  assert.ok(!dates.includes('2026-11-08'), 'Sunday is closed');
  const tue = at(days, '2026-11-03');
  assert.deepEqual(only(tue, 'in'), ['11:30', '14:30', '17:00']);
  assert.deepEqual(only(tue, 'eu'), ['14:30', '19:00'], 'winter: 10:00 and 14:30 CET');
  assert.equal(tue.length, 4, '10:00 CET is 14:30 IST, so one slot serves both regions');
  assert.deepEqual(tue.find((x) => ist(x.start) === '14:30').groups, ['in', 'eu']);
  assert.ok(tue.every((x) => x.end - x.start === 45 * 60000));
  assert.ok(dates.at(-1) <= '2026-11-16', 'window is 14 days');
});

test('slots: European times follow European summer time and stay inside 09:00–22:00 IST', () => {
  const now = Date.parse('2027-07-12T04:30:00Z'); // Mon 12 Jul 2027
  const tue = at(computeSlots(S, [], now), '2027-07-13');
  assert.deepEqual(only(tue, 'eu'), ['13:30', '18:00'], 'summer: 10:00 and 14:30 CEST');
  assert.deepEqual(only(tue, 'in'), ['11:30', '14:30', '17:00']);
});

test('slots: the 09:00–22:00 IST limit holds even for unvalidated settings', () => {
  const now = Date.parse('2026-11-02T04:30:00Z');
  const s = { ...S, slotGroups: [{ id: 'x', label: 'X', timezone: 'Asia/Kolkata', times: ['08:30', '09:00', '21:15', '21:30'] }] };
  assert.deepEqual(only(at(computeSlots(s, [], now), '2026-11-04'), 'x'), ['09:00', '21:15']);
  assert.equal(withinLimit(Date.parse('2026-11-03T15:45:00Z'), 45), true); // 21:15 IST, ends 22:00
  assert.equal(withinLimit(Date.parse('2026-11-03T16:15:00Z'), 45), false); // 21:45 IST would end 22:30
});

test('slots: busy intervals and buffer remove overlapping times', () => {
  const now = Date.parse('2026-11-02T04:30:00Z');
  const busy = [{ start: Date.parse('2026-11-03T06:30:00Z'), end: Date.parse('2026-11-03T07:00:00Z') }]; // 12:00–12:30 IST
  const tue = (s, b) => at(computeSlots(s, b, now), '2026-11-03').map((x) => ist(x.start));
  assert.deepEqual(tue(S, busy), ['14:30', '17:00', '19:00'], 'overlaps 11:30–12:15');
  const busy3 = [{ start: Date.parse('2026-11-03T06:50:00Z'), end: Date.parse('2026-11-03T07:00:00Z') }]; // 12:20–12:30 IST
  assert.ok(tue(S, busy3).includes('11:30'));
  assert.ok(!tue({ ...S, bufferMinutes: 10 }, busy3).includes('11:30'), 'buffer widens the busy time');
});

test('slots: blackout dates and work days', () => {
  const now = Date.parse('2026-11-02T04:30:00Z');
  const days = computeSlots({ ...S, blackoutDates: ['2026-11-03'], workDays: [3] }, [], now);
  assert.ok(!days.some((d) => d.date === '2026-11-03'));
  assert.equal(days[0].date, '2026-11-04');
  assert.ok(days.every((d) => isoWeekday(d.date) === 3));
});

test('settings: slot groups are checked against the IST limit, spacing and timezone', () => {
  const g = (times, timezone = 'Asia/Kolkata', id = 'in') => ({ slotGroups: [{ id, label: 'G', timezone, times }] });
  assert.equal(validate(g(['11:30', '14:30', '17:00'])).ok, true);
  assert.match(validate(g(['21:30'])).errors.join(), /outside 09:00–22:00 IST/);
  assert.match(validate(g(['08:45'])).errors.join(), /outside/);
  assert.match(validate(g(['18:00'], 'Europe/Berlin', 'eu')).errors.join(), /outside/, '18:00 CET is 22:30 IST');
  assert.match(validate(g(['11:30', '12:00'])).errors.join(), /45 minutes apart/);
  assert.match(validate(g(['11:30'], 'Mars/Base')).errors.join(), /timezone/);
  assert.match(validate({ slotGroups: [] }).errors.join(), /at least one group/);
  assert.deepEqual(validate(g([' 17:00', '11:30', '11:30'])).settings.slotGroups[0].times, ['11:30', '17:00']);
  assert.equal('startTime' in validate({ startTime: '10:00', endTime: '18:00' }).settings, false, 'old fields are dropped');
});

test('settings validation', () => {
  assert.equal(validate({}).ok, true);
  const bad = validate({ invitees: ['ok@x.com', 'nope'], workDays: [], slotMinutes: 5, timezone: 'Mars/Base' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.length >= 4);
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

test('invite: shows the customer\'s own clock time when it differs from IST', () => {
  const base = { name: 'Lena', email: 'lena@acme.de', company: 'Acme', designation: 'COO', challenge: 'Scrap', startMs: Date.parse('2026-11-10T09:00:00Z'), endMs: Date.parse('2026-11-10T09:45:00Z') };
  const run = (tz) => message({ booking: { ...base, tz }, settings: S, event: { iCalUID: 'u@google.com', meetLink: 'https://meet.google.com/abc-defg-hij' }, summary: 'Call', description: 'd' }).mail.text;
  assert.match(run('Europe/Berlin'), /14:30 IST · 10:00 CET your time \(45 min\)/);
  assert.match(run('Asia/Kolkata'), /14:30 IST \(45 min\)/);
  assert.match(run(''), /14:30 IST \(45 min\)/);
  assert.match(run('America/Los_Angeles'), /14:30 IST · 01:00 GMT-8 your time/);
  const early = message({ booking: { ...base, tz: 'America/Los_Angeles', startMs: Date.parse('2026-11-10T06:00:00Z'), endMs: Date.parse('2026-11-10T06:45:00Z') }, settings: S, event: { iCalUID: 'u', meetLink: 'm' }, summary: 'Call', description: 'd' }).mail.text;
  assert.match(early, /11:30 IST · Mon, 9 Nov 2026, 22:00 GMT-8 your time/, 'adds the date when it differs');
});
