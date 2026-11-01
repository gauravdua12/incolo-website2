'use strict';
/** Turns settings + busy intervals into bookable slots (all instants in UTC ms). */
const { zonedToUtc, zonedParts, dateKey, addDays, isoWeekday } = require('./time');

/** Hard outer limit for every call, whatever the settings say: 09:00–22:00 IST. */
const LIMIT = Object.freeze({ timezone: 'Asia/Kolkata', from: '09:00', to: '22:00' });
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

/** True if a call starting at `start` (UTC ms) and lasting `minutes` stays inside LIMIT. */
function withinLimit(start, minutes) {
  const p = zonedParts(start, LIMIT.timezone);
  const m = p.hour * 60 + p.minute;
  return m >= toMin(LIMIT.from) && m + minutes <= toMin(LIMIT.to);
}

/**
 * Each slot group lists fixed start times in its own timezone (e.g. 11:30 IST, 10:00 CET).
 * Slots from different groups that land on the same instant are merged.
 * @param settings  validated booking settings
 * @param busy      [{ start, end }] in UTC ms (Google free/busy + local bookings)
 * @param now       UTC ms
 * @returns [{ date: 'YYYY-MM-DD', slots: [{ start, end, groups: ['in', …] }] }]  dates in settings.timezone
 */
function computeSlots(settings, busy, now = Date.now()) {
  const { timezone: tz, slotMinutes, bufferMinutes, minNoticeHours, windowDays } = settings;
  const step = slotMinutes * 60000;
  const pad = bufferMinutes * 60000;
  const earliest = now + minNoticeHours * 3600000;
  const blackout = new Set(settings.blackoutDates);
  const workDays = new Set(settings.workDays);
  const today = dateKey(now, tz);
  const last = addDays(today, windowDays);
  const byStart = new Map();

  // One day either side, since a group's local date can differ from the settings-timezone date.
  for (let i = -1; i <= windowDays + 1; i++) {
    const local = addDays(today, i);
    for (const g of settings.slotGroups) {
      for (const t of g.times) {
        const start = zonedToUtc(local, t, g.timezone);
        const end = start + step;
        const date = dateKey(start, tz);
        if (date < today || date > last || !workDays.has(isoWeekday(date)) || blackout.has(date)) continue;
        if (start < earliest || !withinLimit(start, slotMinutes)) continue;
        // A slot is taken if any busy interval overlaps it (widened by the buffer on both sides).
        if (busy.some((b) => b.start < end + pad && b.end > start - pad)) continue;
        const slot = byStart.get(start) || { date, start, end, groups: [] };
        if (!slot.groups.includes(g.id)) slot.groups.push(g.id);
        byStart.set(start, slot);
      }
    }
  }

  const days = new Map();
  for (const { date, ...slot } of [...byStart.values()].sort((a, b) => a.start - b.start)) {
    if (!days.has(date)) days.set(date, []);
    days.get(date).push(slot);
  }
  return [...days].map(([date, slots]) => ({ date, slots }));
}

/** Range the free/busy query must cover. */
function queryRange(settings, now = Date.now()) {
  return { timeMin: now, timeMax: now + (settings.windowDays + 2) * 86400000 };
}

module.exports = { LIMIT, withinLimit, computeSlots, queryRange };
