'use strict';
/**
 * Google Calendar access for the success@incolosystems.com Google account, via the
 * REST API and an OAuth refresh token (see docs/BOOKING-SETUP.md and
 * `npm run google-auth`). Events are created with a Google Meet link and
 * sendUpdates=none: Google sends no email. The invitation email goes out from the
 * success@ mailbox instead (see invite.js).
 *
 * BOOKING_DRY_RUN=true replaces Google with a local stand-in (no network) for development.
 */
const crypto = require('crypto');

const API = 'https://www.googleapis.com/calendar/v3';
const DRY_RUN = String(process.env.BOOKING_DRY_RUN || '') === 'true';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

const configured = () => DRY_RUN || Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
const mode = () => (DRY_RUN ? 'dry-run' : configured() ? 'google' : 'not-configured');

let token = null; // { value, expires }
async function accessToken() {
  if (token && token.expires > Date.now() + 60000) return token.value;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: REFRESH_TOKEN, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(10000),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.access_token) throw new Error(`Google token refresh failed: ${d.error || res.status} ${d.error_description || ''}`.trim());
  token = { value: d.access_token, expires: Date.now() + (d.expires_in || 3600) * 1000 };
  return token.value;
}

async function call(method, urlPath, body) {
  const res = await fetch(API + urlPath, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Google Calendar ${method} ${urlPath.split('?')[0]} failed: ${res.status} ${d.error?.message || ''}`.trim());
    err.status = res.status;
    throw err;
  }
  return d;
}

// Free/busy is queried on every slot request; cache it briefly.
let fbCache = null; // { key, at, busy }
async function freeBusy(timeMin, timeMax) {
  if (DRY_RUN) return [];
  const key = `${Math.floor(timeMin / 60000)}:${Math.floor(timeMax / 60000)}`;
  if (fbCache && fbCache.key === key && Date.now() - fbCache.at < 60000) return fbCache.busy;
  const d = await call('POST', '/freeBusy', {
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    items: [{ id: CALENDAR_ID }],
  });
  const cal = d.calendars?.[CALENDAR_ID] || Object.values(d.calendars || {})[0] || {};
  if (cal.errors?.length) throw new Error(`Google free/busy error: ${cal.errors.map((e) => e.reason).join(', ')}`);
  const busy = (cal.busy || []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
  fbCache = { key: `${Math.floor(timeMin / 60000)}:${Math.floor(timeMax / 60000)}`, at: Date.now(), busy };
  return busy;
}
const invalidateFreeBusy = () => { fbCache = null; };

/**
 * Create the calendar event with a Google Meet link. Google sends no email.
 * @returns { id, iCalUID, meetLink, htmlLink }
 */
async function createEvent({ summary, description, start, end, timezone, attendees, hideGuests }) {
  const requestId = crypto.randomUUID();
  if (DRY_RUN) {
    const code = crypto.randomBytes(5).toString('hex');
    return {
      id: 'dryrun-' + requestId,
      iCalUID: `dryrun-${requestId}@incolo.si`,
      meetLink: `https://meet.google.com/dry-run-${code.slice(0, 4)}-${code.slice(4)}`,
      htmlLink: '',
    };
  }
  let ev = await call('POST', `/calendars/${encodeURIComponent(CALENDAR_ID)}/events?conferenceDataVersion=1&sendUpdates=none`, {
    summary,
    description,
    start: { dateTime: new Date(start).toISOString(), timeZone: timezone },
    end: { dateTime: new Date(end).toISOString(), timeZone: timezone },
    attendees: attendees.map((a) => ({ email: a.email, displayName: a.name || undefined })),
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    guestsCanSeeOtherGuests: !hideGuests,
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 15 }] },
    conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    source: { title: 'Incolo Systems', url: 'https://incolo.si/contact' },
  });
  // Meet links are usually ready immediately; occasionally the request is still pending.
  for (let i = 0; i < 5 && !ev.hangoutLink && ev.conferenceData?.createRequest?.status?.statusCode === 'pending'; i++) {
    await new Promise((r) => setTimeout(r, 800));
    ev = await call('GET', `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(ev.id)}`);
  }
  const meetLink = ev.hangoutLink || ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri;
  if (!meetLink) throw new Error('Google created the event but did not return a Meet link');
  return { id: ev.id, iCalUID: ev.iCalUID, meetLink, htmlLink: ev.htmlLink || '' };
}

/**
 * Delete a booking's event (and its Meet link) without Google emailing anyone; the
 * cancellation email goes out from the organizer's mailbox instead. An event that is
 * already gone (deleted by hand in Google Calendar) counts as deleted.
 */
async function deleteEvent(id) {
  if (DRY_RUN) return { deleted: true };
  try {
    await call('DELETE', `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(id)}?sendUpdates=none`);
    return { deleted: true };
  } catch (e) {
    if (e.status === 404 || e.status === 410) return { deleted: true, alreadyGone: true };
    throw e;
  }
}

/** Used by /admin's "Test connection" button. */
async function check() {
  if (DRY_RUN) return { ok: true, mode: 'dry-run', detail: 'Dry run: no Google calls are made.' };
  if (!configured()) return { ok: false, mode: 'not-configured', detail: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN are not set in .env.' };
  try {
    const cal = await call('GET', `/users/me/calendarList/${encodeURIComponent(CALENDAR_ID)}`);
    await freeBusy(Date.now(), Date.now() + 86400000); // proves the free/busy permission too
    return { ok: true, mode: 'google', detail: `Connected to calendar "${cal.summary || cal.id}" (${cal.timeZone || 'no timezone'}).` };
  } catch (e) {
    return { ok: false, mode: 'google', detail: e.message };
  }
}

module.exports = { configured, mode, freeBusy, invalidateFreeBusy, createEvent, deleteEvent, check };
