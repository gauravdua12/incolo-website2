'use strict';
/** Append-only booking log (JSON lines), kept outside the repo in production. */
const fs = require('fs');
const path = require('path');

function file() {
  return process.env.BOOKINGS_FILE || path.join(__dirname, '..', '..', 'bookings.jsonl');
}

function all() {
  let raw = '';
  try { raw = fs.readFileSync(file(), 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  return raw.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function append(record) {
  const f = file();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.appendFileSync(f, JSON.stringify(record) + '\n', { mode: 0o600 });
}

/** Confirmed bookings that end after `fromMs`, soonest first. */
function upcoming(fromMs = Date.now()) {
  return all()
    .filter((b) => b.status === 'confirmed' && Date.parse(b.end) > fromMs)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

module.exports = { file, all, append, upcoming };
