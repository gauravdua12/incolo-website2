'use strict';
/**
 * Timezone helpers built on Intl (no dependencies). Business hours are defined in the
 * settings timezone (Asia/Kolkata by default); everything stored/exchanged is UTC ISO.
 */

const partsCache = new Map();
function formatter(tz) {
  if (!partsCache.has(tz)) {
    partsCache.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return partsCache.get(tz);
}

/** Wall-clock parts of a UTC instant in `tz`. */
function zonedParts(ms, tz) {
  const o = {};
  for (const p of formatter(tz).formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10);
  return o; // { year, month, day, hour, minute, second }
}

/** Offset of `tz` from UTC at instant `ms`, in milliseconds. */
function tzOffset(ms, tz) {
  const p = zonedParts(ms, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/** UTC ms for a wall-clock time in `tz` ("2026-11-03", "10:30"). */
function zonedToUtc(dateStr, timeStr, tz) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let ms = guess - tzOffset(guess, tz);
  ms = guess - tzOffset(ms, tz); // second pass settles DST edges
  return ms;
}

/** "YYYY-MM-DD" of instant `ms` in `tz`. */
function dateKey(ms, tz) {
  const p = zonedParts(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Add `n` days to a "YYYY-MM-DD" key. */
function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** ISO weekday of a "YYYY-MM-DD" key: 1 = Monday … 7 = Sunday. */
function isoWeekday(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
}

/** "Tue 4 Nov 2026, 11:00 IST"-style label for emails. */
function label(ms, tz, { withDate = true } = {}) {
  const opts = { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' };
  if (withDate) Object.assign(opts, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return new Intl.DateTimeFormat('en-GB', opts).format(new Date(ms)).replace('GMT+5:30', 'IST');
}

module.exports = { zonedParts, tzOffset, zonedToUtc, dateKey, addDays, isoWeekday, label };
