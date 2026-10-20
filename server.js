/**
 * Incolo Systems 2.0 — Node.js server.
 *
 * Serves the built site (dist/, from `npm run build`) with clean URLs and handles
 * the contact form. Designed to sit behind nginx (which terminates TLS) on an OCI VM,
 * but also runs stand-alone for local testing.
 *
 * No third-party runtime calls except the SMTP relay used to send enquiry email.
 * All configuration and secrets come from environment variables (see .env.example).
 */

'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const DIST = path.join(__dirname, 'dist');

// ------------------------------------------------------------------ settings
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1'; // bind to localhost; nginx is the public face

const TO = process.env.CONTACT_TO || 'business@incolosystems.com';
const FROM = process.env.CONTACT_FROM || 'noreply@incolosystems.com';
const SUBJECT = process.env.CONTACT_SUBJECT || 'New enquiry — incolo.si';
const BACKUP = process.env.LEADS_FILE || path.join(__dirname, 'leads.jsonl');

// SMTP (authenticated send). Fill these in .env. Without SMTP_HOST, enquiries are
// still saved to the leads file, but no email is sent (useful for local testing).
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'true') === 'true'; // true for 465, false for 587
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

// Contact-form rate limit per client IP.
const RATE_MAX = parseInt(process.env.CONTACT_RATE_MAX || '5', 10);
const RATE_WINDOW_MS = parseInt(process.env.CONTACT_RATE_WINDOW_MIN || '15', 10) * 60 * 1000;

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

// Trust the nginx proxy so req.ip reflects the real client address.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// One reusable SMTP transport (only when configured).
const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;
if (!transporter) console.warn('SMTP_HOST not set: enquiries will be saved to the leads file only.');

// ---------------------------------------------------------------- security headers
// Everything is self-hosted, so the policy can be strict: no third-party origins at all.
app.use(function (req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; " +
      "font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  next();
});

// ---------------------------------------------------------------- helpers
function wantsJson(req) {
  const xrw = (req.get('x-requested-with') || '').toLowerCase();
  const accept = req.get('accept') || '';
  return xrw === 'fetch' || accept.indexOf('application/json') !== -1;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Non-JS form posts get a small branded page; fetch() callers get JSON.
function respond(req, res, ok, message, code) {
  res.status(code || 200);
  if (wantsJson(req)) {
    return res.json({ ok: ok, message: message });
  }
  const title = ok ? 'Thank you' : 'Something went wrong';
  res.type('html').send(
    "<!doctype html><html lang='en'><head><meta charset='utf-8'>" +
      "<meta name='viewport' content='width=device-width, initial-scale=1'>" +
      "<meta name='robots' content='noindex'>" +
      '<title>' + title + ' | Incolo Systems</title>' +
      "<link rel='stylesheet' href='/styles/tokens.css'><link rel='stylesheet' href='/styles/main.css'>" +
      "</head><body><main class='hero notfound'><div class='container hero-inner'>" +
      "<span class='eyebrow'>" + (ok ? 'Enquiry received' : 'Please check the form') + '</span>' +
      "<h1 class='h1'>" + title + "</h1><p class='lede'>" + escapeHtml(message) + '</p>' +
      "<div class='hero-actions'><a class='btn btn-primary btn-lg' href='" + (ok ? '/' : '/contact') + "'>" +
      (ok ? 'Back to home' : 'Back to the form') + '</a></div></div></main></body></html>'
  );
}

const hits = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(function (t) { return now - t < RATE_WINDOW_MS; });
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_MAX;
}
setInterval(function () {
  const now = Date.now();
  for (const [ip, ts] of hits) if (ts.every(function (t) { return now - t >= RATE_WINDOW_MS; })) hits.delete(ip);
}, 10 * 60 * 1000).unref();

const clip = function (v, max) { return String(v || '').trim().slice(0, max); };

// ---------------------------------------------------------------- contact API
app.post(
  '/api/contact',
  express.urlencoded({ extended: false, limit: '20kb' }),
  express.json({ limit: '20kb' }),
  async function (req, res) {
    const b = req.body || {};

    // Honeypot — a bot filled the hidden "website" field. Silently accept & drop.
    if (b.website) {
      return respond(req, res, true, 'Thank you — we will be in touch shortly.');
    }

    if (rateLimited(req.ip)) {
      return respond(req, res, false, 'Too many enquiries from this connection. Please try again later, or email ' + TO + '.', 429);
    }

    const name = clip(b.name, 120);
    const company = clip(b.company, 160);
    const email = clip(b.email, 254);
    const phone = clip(b.phone, 40);
    const program = clip(b.program, 120);
    const message = clip(b.message, 5000);

    // Validate.
    const errors = [];
    if (name === '') errors.push('name');
    if (company === '') errors.push('company');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('a valid work email');
    if (message === '') errors.push('a short message');
    if (errors.length) {
      return respond(req, res, false, 'Please add ' + errors.join(', ') + '.', 422);
    }

    // Guard against header injection via fields that reach mail headers.
    if (/[\r\n]/.test(email + name + company + program)) {
      return respond(req, res, false, 'Invalid input.', 422);
    }

    // Always write a local backup first (never lose a lead).
    try {
      fs.appendFileSync(
        BACKUP,
        JSON.stringify({ name, company, email, phone, program, message, ts: new Date().toISOString() }) + '\n'
      );
    } catch (e) {
      console.error('leads backup failed:', e.message);
    }

    if (!transporter) {
      return respond(req, res, true, 'Thank you — we have received your enquiry and will be in touch shortly.');
    }

    // Build + send the email.
    const text =
      'New enquiry from the Incolo Systems website\n' +
      '-------------------------------------------\n' +
      'Name:    ' + name + '\n' +
      'Company: ' + company + '\n' +
      'Email:   ' + email + '\n' +
      'Phone:   ' + (phone !== '' ? phone : '—') + '\n' +
      'Program: ' + (program !== '' ? program : 'Not sure yet') + '\n' +
      'Time:    ' + new Date().toISOString() + '\n' +
      'IP:      ' + (req.ip || '—') + '\n\n' +
      'Message:\n' + message + '\n';

    try {
      await transporter.sendMail({
        from: 'Incolo Systems <' + FROM + '>',
        to: TO,
        replyTo: { name: name, address: email },
        subject: program ? SUBJECT + ' · ' + program : SUBJECT,
        text: text,
      });
      return respond(req, res, true, 'Thank you — your enquiry is on its way. We usually reply within one business day.');
    } catch (e) {
      // Mail failed but the backup is saved; treat as soft success for the visitor.
      console.error('mail send failed:', e.message);
      return respond(req, res, true, 'Thank you — we have received your enquiry and will be in touch shortly.');
    }
  }
);

app.get('/healthz', function (req, res) { res.type('text').send('ok'); });

// ---------------------------------------------------------------- static site
function cacheHeaders(res, filePath) {
  if (/\.html$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'no-cache'); // always revalidate pages
  } else if (/\.(css|js)$/i.test(filePath)) {
    // URLs carry a content hash (?v=…) from the build, so a new deploy always busts the cache.
    res.setHeader('Cache-Control', res.req && res.req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
  } else if (/\.(woff2|png|jpg|jpeg|webp|svg|ico)$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days for fonts/images
  }
}

// Legacy URLs from the previous site.
app.get('/contact.php', function (req, res) { res.redirect(301, '/contact'); });

// Canonical URLs: /programs.html → /programs, /programs/ → /programs
app.use(function (req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const q = req.originalUrl.slice(req.path.length);
  if (/\.html$/i.test(req.path)) {
    const clean = req.path.replace(/(index)?\.html$/i, '').replace(/\/$/, '') || '/';
    return res.redirect(301, clean + q);
  }
  if (req.path.length > 1 && req.path.endsWith('/')) return res.redirect(301, req.path.replace(/\/+$/, '') + q);
  next();
});

// Clean URLs: /solutions/advisory → dist/solutions/advisory.html
app.use(function (req, res, next) {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || path.extname(req.path)) return next();
  const rel = req.path === '/' ? 'index.html' : req.path.slice(1) + '.html';
  const file = path.join(DIST, rel);
  if (!file.startsWith(DIST + path.sep) || !fs.existsSync(file)) return next();
  cacheHeaders(res, file);
  res.sendFile(file);
});

app.use(express.static(DIST, { dotfiles: 'deny', index: false, redirect: false, setHeaders: cacheHeaders }));

// Fallback: anything unmatched → the site's 404 page.
app.use(function (req, res) {
  res.status(404).setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(DIST, '404.html'));
});

app.listen(PORT, HOST, function () {
  console.log('Incolo site listening on http://' + HOST + ':' + PORT);
});
