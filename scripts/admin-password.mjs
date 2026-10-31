#!/usr/bin/env node
/**
 * Create the /admin password hash + session secret for .env.
 *   npm run admin-password
 * The password itself is never stored; only its scrypt hash.
 */
import { createInterface } from 'node:readline';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

const { hashPassword } = createRequire(import.meta.url)('../lib/admin/auth.js');

function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); }; // hide typing
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

const pw = await ask('New admin password (min 12 characters): ');
if (pw.length < 12) { console.error('Too short: use at least 12 characters.'); process.exit(1); }
if ((await ask('Repeat password: ')) !== pw) { console.error('Passwords did not match.'); process.exit(1); }

console.log('\nAdd these two lines to the server .env (replacing any old ones), then restart:\n');
console.log('ADMIN_PASSWORD_HASH=' + hashPassword(pw));
console.log('ADMIN_SESSION_SECRET=' + randomBytes(32).toString('hex') + '\n');
