// Screenshot pages at exact viewport sizes (desktop 1440×900, mobile 390×844) for reviews.
// Usage: npm run dev   (in another terminal), then
//        node scripts/capture-screens.mjs docs/mockups/build scripts/shots/build-pages.json
// Drives headless Google Chrome (macOS path below) over CDP using Node's built-in WebSocket.
// Shot fields: name, url, width, height, scale?, js? (runs before capture), wait?, full?, log?
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [, , outDir, shotsFile] = process.argv;
const shots = JSON.parse(readFileSync(shotsFile, 'utf8'));
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9339;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--hide-scrollbars', '--disable-gpu',
  `--user-data-dir=${join(process.env.TMPDIR || '/tmp', 'incolo-cap-profile')}`, 'about:blank',
], { stdio: 'ignore' });

let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params }));
});
try {
  let target;
  for (let k = 0; k < 50 && !target; k++) {
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch { await sleep(200); }
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); }
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
  const evalJs = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });

  for (const s of shots) {
    const mobile = s.width < 768;
    await send('Emulation.setDeviceMetricsOverride', { width: s.width, height: s.height, deviceScaleFactor: s.scale || 1, mobile });
    await send('Page.navigate', { url: s.url });
    await sleep(1600);
    if (s.js) { const r = await evalJs(s.js); if (s.log) console.log('eval', JSON.stringify(r.result.value)); await sleep(s.wait ?? 1400); }
    let clip;
    if (s.full) {
      const h = (await evalJs('document.documentElement.scrollHeight')).result.value;
      await send('Emulation.setDeviceMetricsOverride', { width: s.width, height: h, deviceScaleFactor: s.scale || 1, mobile });
      await evalJs("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'))");
      await sleep(1200);
    }
    const { data } = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
    writeFileSync(join(outDir, s.name + '.png'), Buffer.from(data, 'base64'));
    console.log('saved', s.name);
  }
} catch (e) { console.error(e); process.exitCode = 1; }
finally { ws?.close(); chrome.kill(); }
