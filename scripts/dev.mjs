// Local development: rebuild on change + restart the server on change.
// Usage: npm run dev   (serves http://127.0.0.1:4100 unless PORT is set)
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, PORT: process.env.PORT || '4100' };
const run = (args) => spawn(process.execPath, args, { stdio: 'inherit', env, cwd: ROOT });

// --watch-path=scripts restarts the builder when the build code itself changes.
const procs = [run(['--watch-path=scripts', 'scripts/build.mjs', '--watch'])];
// Give the first build a moment so dist/ exists before the server starts.
setTimeout(() => procs.push(run(['--watch-path=server.js', 'server.js'])), 600);

const stop = () => { procs.forEach((p) => p.kill()); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
