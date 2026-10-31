#!/usr/bin/env node
/**
 * One-time Google authorisation for the booking calendar.
 *
 *   GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=… npm run google-auth
 *   (or put both in .env first)
 *
 * Opens a local page on http://127.0.0.1:8765, sends you to Google's consent screen
 * (sign in as business@incolosystems.com), then prints GOOGLE_REFRESH_TOKEN to paste
 * into the server's .env. Run it on your Mac; the token works anywhere.
 * See docs/BOOKING-SETUP.md for creating the OAuth client.
 */
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(join(ROOT, '.env')); } catch { /* optional */ }

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (in .env or on the command line) first.');
  process.exit(1);
}

const PORT = 8765;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',   // create the booking events (with Meet links)
  'https://www.googleapis.com/auth/calendar.freebusy', // read busy times only, never event details
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly', // "Test connection" in /admin
].join(' ');
const state = randomBytes(16).toString('hex');

const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: CLIENT_ID, redirect_uri: REDIRECT, response_type: 'code', scope: SCOPES,
  access_type: 'offline', prompt: 'consent', state, login_hint: 'business@incolosystems.com',
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== '/callback') { res.writeHead(302, { Location: authUrl }).end(); return; }
  if (url.searchParams.get('state') !== state) { res.writeHead(400).end('State mismatch. Start again.'); return; }
  const code = url.searchParams.get('code');
  if (!code) { res.writeHead(400).end('Google returned: ' + (url.searchParams.get('error') || 'no code')); return; }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
  });
  const d = await r.json();
  if (!d.refresh_token) {
    res.writeHead(500).end('No refresh token returned: ' + JSON.stringify(d));
    console.error('No refresh token returned:', d);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' }).end('<h2>Done.</h2><p>Return to the terminal and copy the GOOGLE_REFRESH_TOKEN line into the server .env.</p>');
    console.log('\nAdd this line to the server .env (keep it secret):\n');
    console.log('GOOGLE_REFRESH_TOKEN=' + d.refresh_token + '\n');
  }
  server.close();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Open this link and sign in as business@incolosystems.com:\n\n  http://127.0.0.1:${PORT}/\n`);
});
