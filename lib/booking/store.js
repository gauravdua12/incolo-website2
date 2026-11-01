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

/** Merge `patch` into the booking with this id (atomic rewrite). Returns the updated record or null. */
function update(id, patch) {
  const f = file();
  let raw = '';
  try { raw = fs.readFileSync(f, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  let updated = null;
  const lines = raw.split('\n').filter(Boolean).map((l) => {
    let b;
    try { b = JSON.parse(l); } catch { return l; } // keep unreadable lines as they were
    if (updated || b.id !== id) return l;
    updated = { ...b, ...patch };
    return JSON.stringify(updated);
  });
  if (!updated) return null;
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, lines.join('\n') + '\n', { mode: 0o600 });
  fs.renameSync(tmp, f);
  return updated;
}

/** Confirmed bookings that end after `fromMs`, soonest first. */
function upcoming(fromMs = Date.now()) {
  return all()
    .filter((b) => b.status === 'confirmed' && Date.parse(b.end) > fromMs)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

module.exports = { file, all, append, update, upcoming };
