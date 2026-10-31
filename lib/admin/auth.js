'use strict';
/**
 * Single-admin auth for /admin.
 *   ADMIN_PASSWORD_HASH   scrypt$<salt hex>$<hash hex>   (create with `npm run admin-password`)
 *   ADMIN_SESSION_SECRET  random hex, signs the session cookie
 * Without both, the admin area is disabled.
 */
const crypto = require('crypto');

const COOKIE = 'incolo_admin';
const SESSION_HOURS = 8;
const HASH = process.env.ADMIN_PASSWORD_HASH || '';
const SECRET = process.env.ADMIN_SESSION_SECRET || '';

const enabled = () => /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(HASH) && SECRET.length >= 32;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password) {
  if (!enabled() || typeof password !== 'string' || !password) return false;
  const [, salt, hex] = HASH.split('$');
  const got = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(got, Buffer.from(hex, 'hex'));
}

const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

function issue(res, req) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600000, n: crypto.randomBytes(8).toString('hex') })).toString('base64url');
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${secure}`);
}

function clear(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

function readCookie(req) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? m[1] : '';
}

function isLoggedIn(req) {
  if (!enabled()) return false;
  const [payload, sig] = readCookie(req).split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}

/** Reject cross-site state changes (defence in depth on top of SameSite=Strict). */
function sameOrigin(req) {
  const origin = req.get('origin') || req.get('referer');
  if (!origin) return false;
  try { return new URL(origin).host === req.get('host'); } catch { return false; }
}

module.exports = { enabled, hashPassword, verifyPassword, issue, clear, isLoggedIn, sameOrigin };
