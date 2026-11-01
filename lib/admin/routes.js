'use strict';
/** /api/admin/* — booking settings, upcoming bookings and cancellations for the site owner. */
const express = require('express');
const auth = require('./auth');
const settingsStore = require('../booking/settings');
const store = require('../booking/store');
const google = require('../booking/google');
const invite = require('../booking/invite');
const { makeMailer } = require('../booking/mailer');

function adminRouter({ transporter, loginRateLimit }) {
  const router = express.Router();
  const json = express.json({ limit: '50kb' });
  const send = makeMailer(transporter);
  const upcomingList = () => store.upcoming(Date.now() - 3600000).slice(0, 100);

  router.use('/api/admin', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (req.method !== 'GET' && !auth.sameOrigin(req)) return res.status(403).json({ ok: false, message: 'Cross-site request blocked.' });
    next();
  });

  router.get('/api/admin/session', (req, res) => {
    res.json({ ok: true, enabled: auth.enabled(), loggedIn: auth.isLoggedIn(req) });
  });

  router.post('/api/admin/login', json, (req, res) => {
    if (!auth.enabled()) return res.status(503).json({ ok: false, message: 'Admin is not configured on this server (see docs/BOOKING-SETUP.md).' });
    if (loginRateLimit(req.ip)) return res.status(429).json({ ok: false, message: 'Too many attempts. Wait 15 minutes and try again.' });
    if (!auth.verifyPassword(req.body && req.body.password)) {
      console.warn('admin login failed from', req.ip);
      return res.status(401).json({ ok: false, message: 'Wrong password.' });
    }
    auth.issue(res, req);
    res.json({ ok: true });
  });

  router.post('/api/admin/logout', (req, res) => { auth.clear(res); res.json({ ok: true }); });

  const requireAdmin = (req, res, next) => (auth.isLoggedIn(req) ? next() : res.status(401).json({ ok: false, message: 'Please sign in.' }));

  router.get('/api/admin/state', requireAdmin, (req, res) => {
    res.json({
      ok: true,
      settings: settingsStore.load(),
      defaults: settingsStore.DEFAULTS,
      upcoming: upcomingList(),
      status: {
        google: google.mode(),
        smtp: Boolean(transporter),
        settingsFile: settingsStore.file(),
        bookingsFile: store.file(),
      },
    });
  });

  router.put('/api/admin/settings', requireAdmin, json, (req, res) => {
    const v = settingsStore.save(req.body && req.body.settings);
    if (!v.ok) return res.status(422).json({ ok: false, message: v.errors.join('; ') + '.' });
    console.log('booking settings updated from', req.ip);
    res.json({ ok: true, settings: v.settings });
  });

  router.post('/api/admin/test-google', requireAdmin, async (req, res) => {
    res.json(await google.check());
  });

  // Cancel a booking: delete the Google event (and Meet link), email the cancellation from
  // the organizer's mailbox to the same guests (and Bcc copies), and free the slot.
  const cancelling = new Set();
  router.post('/api/admin/bookings/:id/cancel', requireAdmin, json, async (req, res) => {
    const id = String(req.params.id);
    const reason = String((req.body && req.body.reason) || '').trim().slice(0, 1000);
    const notify = !(req.body && req.body.notify === false);
    const b = store.all().find((x) => x.id === id);
    if (!b) return res.status(404).json({ ok: false, message: 'Booking not found.' });
    if (b.status !== 'confirmed') return res.status(409).json({ ok: false, message: 'This booking is already cancelled.', upcoming: upcomingList() });
    if (Date.parse(b.end) <= Date.now()) return res.status(409).json({ ok: false, message: 'This meeting is already over.' });
    if (cancelling.has(id)) return res.status(409).json({ ok: false, message: 'This booking is already being cancelled.' });
    cancelling.add(id);
    try {
      try {
        await google.deleteEvent(b.id);
      } catch (e) {
        console.error('cancel: Google delete failed:', e.message);
        return res.status(502).json({ ok: false, message: `Google Calendar didn't delete the event, so nothing was changed. Try again. (${e.message})` });
      }
      google.invalidateFreeBusy();

      let mailed = false;
      if (notify && send) {
        const msg = invite.cancelMessage({ record: b, settings: settingsStore.load(), reason });
        try {
          await send(msg.mail, `cancel-${b.start.replace(/[:.]/g, '-')}-${b.email}`);
          mailed = true;
        } catch (e) {
          console.error('cancel email failed:', e.message);
        }
      }
      store.update(id, { status: 'cancelled', cancelledAt: new Date().toISOString(), cancelReason: reason || undefined, cancelMailed: mailed });
      console.log(`booking ${id} cancelled from ${req.ip}${mailed ? ', customer emailed' : ''}`);

      const organizer = (b.organizer && b.organizer.email) || settingsStore.load().organizerEmail;
      res.json({
        ok: true,
        mailed,
        upcoming: upcomingList(),
        message: mailed
          ? `Cancelled. ${b.name} (${b.email}) was emailed a cancellation from ${organizer}, and the slot is open again.`
          : notify
            ? `Cancelled and the slot is open again, but the cancellation email could not be sent. Please email ${b.email} yourself.`
            : `Cancelled and the slot is open again. No email was sent.`,
      });
    } finally {
      cancelling.delete(id);
    }
  });

  return router;
}

module.exports = { adminRouter };
