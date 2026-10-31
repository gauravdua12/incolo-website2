'use strict';
/**
 * Booking settings: editable from /admin, stored as JSON outside the repo
 * (BOOKING_SETTINGS_FILE, e.g. /home/opc/incolo-data/booking-settings.json).
 * Missing file → defaults below.
 */
const fs = require('fs');
const path = require('path');

const DEFAULTS = Object.freeze({
  timezone: 'Asia/Kolkata',
  workDays: [1, 2, 3, 4, 5, 6], // ISO weekdays: 1 = Mon … 7 = Sun
  startTime: '10:00',
  endTime: '18:00',
  slotMinutes: 30,
  bufferMinutes: 0,
  minNoticeHours: 24,
  windowDays: 14,
  blackoutDates: [],
  organizerName: 'Gaurav Dua', // shown as the email's From name and the invite's organizer
  organizerEmail: 'success@incolosystems.com',
  invitees: [], // listed on the invite; the organizer is always included
  bcc: ['theedivesh@gmail.com'], // get the invite and the calendar event, hidden from the customer
  meetingTitle: 'Incolo Systems scoping call · {company}',
  meetingNote: 'A focused 30-minute conversation about your production priorities and whether Incolo is the right fit. Join with the Google Meet link below.',
});

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function file() {
  return process.env.BOOKING_SETTINGS_FILE || path.join(__dirname, '..', '..', 'booking-settings.json');
}

/** Validate + normalise. Returns { ok, settings } or { ok:false, errors:[…] }. */
function validate(input) {
  const s = { ...DEFAULTS, ...(input || {}) };
  const errors = [];
  const int = (k, min, max) => {
    const n = Number(s[k]);
    if (!Number.isInteger(n) || n < min || n > max) errors.push(`${k} must be a whole number from ${min} to ${max}`);
    else s[k] = n;
  };

  try { new Intl.DateTimeFormat('en', { timeZone: s.timezone }); } catch { errors.push('timezone is not a valid IANA timezone'); }
  s.workDays = [...new Set((Array.isArray(s.workDays) ? s.workDays : []).map(Number))].filter((d) => d >= 1 && d <= 7).sort();
  if (!s.workDays.length) errors.push('choose at least one working day');
  if (!TIME.test(s.startTime) || !TIME.test(s.endTime)) errors.push('start and end times must be HH:MM');
  else if (s.startTime >= s.endTime) errors.push('end time must be after start time');
  int('slotMinutes', 15, 180);
  int('bufferMinutes', 0, 120);
  int('minNoticeHours', 0, 24 * 30);
  int('windowDays', 1, 90);
  s.blackoutDates = [...new Set((Array.isArray(s.blackoutDates) ? s.blackoutDates : []).map((d) => String(d).trim()).filter(Boolean))].sort();
  const badDates = s.blackoutDates.filter((d) => !DATE.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')));
  if (badDates.length) errors.push(`blackout dates must be YYYY-MM-DD (check: ${badDates.join(', ')})`);
  s.organizerName = String(s.organizerName || '').trim().slice(0, 80);
  if (!s.organizerName || /[\r\n<>"]/.test(s.organizerName)) errors.push('organizer name is required and cannot contain < > " or line breaks');
  s.organizerEmail = String(s.organizerEmail || '').trim().toLowerCase();
  if (!EMAIL.test(s.organizerEmail)) errors.push('organizer email is not valid');
  const emails = (v) => [...new Set((Array.isArray(v) ? v : []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
  s.invitees = emails(s.invitees);
  s.bcc = emails(s.bcc).filter((e) => e !== s.organizerEmail && !s.invitees.includes(e));
  const badEmails = [...s.invitees, ...s.bcc].filter((e) => !EMAIL.test(e));
  if (badEmails.length) errors.push(`invalid email: ${badEmails.join(', ')}`);
  if (s.invitees.length + s.bcc.length > 20) errors.push('at most 20 invitees and hidden copies in total');
  s.meetingTitle = String(s.meetingTitle || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 150);
  if (!s.meetingTitle) errors.push('meeting title is required');
  s.meetingNote = String(s.meetingNote || '').trim().slice(0, 2000);

  for (const k of Object.keys(s)) if (!(k in DEFAULTS)) delete s[k];
  return errors.length ? { ok: false, errors } : { ok: true, settings: s };
}

let cache = null;
function load() {
  if (cache) return cache;
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') console.error('booking settings unreadable, using defaults:', e.message); }
  const v = validate(raw);
  if (!v.ok) console.error('booking settings invalid, using defaults:', v.errors.join('; '));
  cache = v.ok ? v.settings : { ...DEFAULTS };
  return cache;
}

function save(input) {
  const v = validate(input);
  if (!v.ok) return v;
  const f = file();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(v.settings, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, f); // atomic replace
  cache = v.settings;
  return v;
}

module.exports = { DEFAULTS, validate, load, save, file, EMAIL };
