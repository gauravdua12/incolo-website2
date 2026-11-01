'use strict';
/**
 *   GET  /api/slots   → bookable slots for the next N days
 *   POST /api/book    → validate, re-check the slot, create the Google event (+ Meet link),
 *                       record it, email the invitation from the organizer's mailbox
 */
const express = require('express');
const settingsStore = require('./settings');
const store = require('./store');
const google = require('./google');
const { computeSlots, queryRange } = require('./slots');
const { label } = require('./time');
const invite = require('./invite');
const { makeMailer } = require('./mailer');

const clip = (v, max) => String(v ?? '').trim().slice(0, max);

/** Busy intervals = Google free/busy + bookings we've recorded (covers Google lag/races). */
async function busyIntervals(settings) {
  const { timeMin, timeMax } = queryRange(settings);
  const fromGoogle = await google.freeBusy(timeMin, timeMax);
  const local = store.upcoming(timeMin).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
  return [...fromGoogle, ...local];
}

function bookingRouter({ transporter, rateLimit }) {
  const router = express.Router();
  const json = express.json({ limit: '20kb' });
  const DRY_RUN = google.mode() === 'dry-run';
  const send = makeMailer(transporter);

  router.get('/api/slots', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!google.configured()) return res.status(503).json({ ok: false, message: 'Online booking is not available right now.' });
    try {
      const settings = settingsStore.load();
      const days = computeSlots(settings, await busyIntervals(settings));
      res.json({
        ok: true,
        timezone: settings.timezone,
        slotMinutes: settings.slotMinutes,
        organizer: { name: settings.organizerName, email: settings.organizerEmail },
        days: days.map((d) => ({ date: d.date, slots: d.slots.map((s) => new Date(s.start).toISOString()) })),
      });
    } catch (e) {
      console.error('slots failed:', e.message);
      res.status(502).json({ ok: false, message: 'We could not load available times. Please try again shortly.' });
    }
  });

  const locks = new Set();

  router.post('/api/book', json, async (req, res) => {
    const b = req.body || {};
    if (b.website) return res.json({ ok: true, message: 'Thank you.' }); // honeypot
    if (!google.configured()) return res.status(503).json({ ok: false, message: 'Online booking is not available right now.' });
    if (rateLimit(req.ip)) return res.status(429).json({ ok: false, message: 'Too many bookings from this connection. Please try again later.' });

    const booking = {
      name: clip(b.name, 120),
      email: clip(b.email, 254).toLowerCase(),
      company: clip(b.company, 160),
      designation: clip(b.designation, 120),
      phone: clip(b.phone, 40),
      program: clip(b.program, 120),
      challenge: clip(b.challenge, 3000),
      startMs: Date.parse(clip(b.start, 40)),
    };
    const errors = [];
    if (!booking.name) errors.push('your name');
    if (!settingsStore.EMAIL.test(booking.email)) errors.push('a valid work email');
    if (!booking.company) errors.push('company name');
    if (!booking.designation) errors.push('designation');
    if (!booking.challenge) errors.push('the challenge you are facing');
    if (Number.isNaN(booking.startMs)) errors.push('a time slot');
    if (errors.length) return res.status(422).json({ ok: false, message: 'Please add ' + errors.join(', ') + '.' });
    if (/[\r\n]/.test(booking.name + booking.email + booking.company + booking.designation + booking.program + booking.phone)) {
      return res.status(422).json({ ok: false, message: 'Invalid input.' });
    }

    const key = String(booking.startMs);
    if (locks.has(key)) return res.status(409).json({ ok: false, message: 'Someone is booking that time right now. Please choose another slot.' });
    locks.add(key);
    try {
      const settings = settingsStore.load();
      google.invalidateFreeBusy();
      const days = computeSlots(settings, await busyIntervals(settings));
      const slot = days.flatMap((d) => d.slots).find((s) => s.start === booking.startMs);
      if (!slot) return res.status(409).json({ ok: false, message: 'That time is no longer available. Please choose another slot.', refresh: true });
      booking.endMs = slot.end;

      const fill = (t) => t.replace(/\{company\}/g, booking.company).replace(/\{name\}/g, booking.name);
      const summary = fill(settings.meetingTitle);
      const details = [
        `Booked by: ${booking.name}, ${booking.designation}, ${booking.company}`,
        `Email: ${booking.email}${booking.phone ? ` · Phone: ${booking.phone}` : ''}`,
        ...(booking.program ? [`Program of interest: ${booking.program}`] : []),
        '',
        'Challenge:',
        booking.challenge,
      ].join('\n');
      const attendees = [{ name: booking.name, email: booking.email }, ...settings.invitees.filter((e) => e !== booking.email).map((email) => ({ email }))];
      // Hidden copies are Google guests too (so it's in their calendar), with the guest list hidden.
      const hidden = settings.bcc.filter((e) => e !== booking.email).map((email) => ({ email }));

      const event = await google.createEvent({
        summary,
        description: `${settings.meetingNote ? settings.meetingNote + '\n\n' : ''}${details}`,
        start: booking.startMs, end: booking.endMs, timezone: settings.timezone,
        attendees: [...attendees, ...hidden], hideGuests: hidden.length > 0,
      });
      google.invalidateFreeBusy();

      const msg = invite.message({
        booking, settings, event, summary,
        description: `${settings.meetingNote ? settings.meetingNote + '\n\n' : ''}Join with Google Meet: ${event.meetLink}\n\n${details}`,
      });

      const record = {
        id: event.id, status: 'confirmed', createdAt: new Date().toISOString(),
        start: new Date(booking.startMs).toISOString(), end: new Date(booking.endMs).toISOString(),
        name: booking.name, email: booking.email, company: booking.company, designation: booking.designation,
        phone: booking.phone, program: booking.program, challenge: booking.challenge,
        meetLink: event.meetLink, htmlLink: event.htmlLink, iCalUID: event.iCalUID,
        summary, organizer: { name: settings.organizerName, email: settings.organizerEmail },
        invitees: msg.attendees.map((a) => a.email), bcc: msg.bcc, dryRun: DRY_RUN || undefined, mailed: false,
      };

      let mailed = false;
      if (send) {
        try {
          await send(msg.mail, `${record.start.replace(/[:.]/g, '-')}-${booking.email}`);
          mailed = true;
        } catch (e) {
          console.error('invite email failed:', e.message);
        }
      } else {
        console.error('invite email not sent: SMTP is not configured');
      }
      record.mailed = mailed;
      store.append(record);

      res.json({
        ok: true,
        booking: {
          start: record.start, end: record.end, label: label(booking.startMs, settings.timezone),
          meetLink: event.meetLink, email: booking.email, organizer: settings.organizerEmail, mailed,
        },
        ics: msg.ics,
        message: mailed
          ? `A calendar invitation with the Google Meet link is on its way to ${booking.email} from ${settings.organizerEmail}.`
          : `We couldn't email the invitation just now. Use "Add to calendar" below, and we'll follow up from ${settings.organizerEmail}.`,
      });
    } catch (e) {
      console.error('booking failed:', e.message);
      res.status(502).json({ ok: false, message: `We couldn't complete the booking. Please try again, or email ${settingsStore.load().organizerEmail}.` });
    } finally {
      locks.delete(key);
    }
  });

  return router;
}

module.exports = { bookingRouter };
