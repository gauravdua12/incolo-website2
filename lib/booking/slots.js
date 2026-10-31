'use strict';
/** Turns settings + busy intervals into bookable slots (all instants in UTC ms). */
const { zonedToUtc, dateKey, addDays, isoWeekday } = require('./time');

/**
 * @param settings  validated booking settings
 * @param busy      [{ start, end }] in UTC ms (Google free/busy + local bookings)
 * @param now       UTC ms
 * @returns [{ date: 'YYYY-MM-DD', slots: [{ start, end }] }]  dates in settings.timezone
 */
function computeSlots(settings, busy, now = Date.now()) {
  const { timezone: tz, slotMinutes, bufferMinutes, minNoticeHours, windowDays } = settings;
  const step = slotMinutes * 60000;
  const pad = bufferMinutes * 60000;
  const earliest = now + minNoticeHours * 3600000;
  const blackout = new Set(settings.blackoutDates);
  const workDays = new Set(settings.workDays);
  const today = dateKey(now, tz);
  const days = [];

  for (let i = 0; i <= windowDays; i++) {
    const date = addDays(today, i);
    if (!workDays.has(isoWeekday(date)) || blackout.has(date)) continue;
    const open = zonedToUtc(date, settings.startTime, tz);
    const close = zonedToUtc(date, settings.endTime, tz);
    const slots = [];
    for (let start = open; start + step <= close; start += step) {
      const end = start + step;
      if (start < earliest) continue;
      // A slot is taken if any busy interval overlaps it (widened by the buffer on both sides).
      if (busy.some((b) => b.start < end + pad && b.end > start - pad)) continue;
      slots.push({ start, end });
    }
    if (slots.length) days.push({ date, slots });
  }
  return days;
}

/** Range the free/busy query must cover. */
function queryRange(settings, now = Date.now()) {
  return { timeMin: now, timeMax: now + (settings.windowDays + 2) * 86400000 };
}

module.exports = { computeSlots, queryRange };
