'use strict';
/** /api/admin/* — booking settings + upcoming bookings for the site owner. */
const express = require('express');
const auth = require('./auth');
const settingsStore = require('../booking/settings');
const store = require('../booking/store');
const google = require('../booking/google');

function adminRouter({ smtpConfigured, loginRateLimit }) {
  const router = express.Router();
  const json = express.json({ limit: '50kb' });

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
    const upcoming = store.upcoming(Date.now() - 3600000).slice(0, 100);
    res.json({
      ok: true,
      settings: settingsStore.load(),
      defaults: settingsStore.DEFAULTS,
      upcoming,
      status: {
        google: google.mode(),
        smtp: smtpConfigured,
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

  return router;
}

module.exports = { adminRouter };
