// Captures real Volume Guard popup screenshots with live meters.
// Uses a scratch copy of the built extension whose manifest grants one local test origin.
// Usage: node scripts/assets/popup-shots.cjs <outdir>  (needs the extension built in ../volcon/dist)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.VOLCON_DIR || require('path').join(__dirname, '../../../volcon')] }));
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const OUT = process.argv[2];
const SRC = path.join(process.env.VOLCON_DIR || path.join(__dirname, '../../../volcon'), 'dist');
const EXT = path.join(os.tmpdir(), 'vg-ext-shots');

function buildWav(segments, rate = 22050) {
  const total = segments.reduce((s, x) => s + Math.round(x.seconds * rate), 0);
  const b = Buffer.alloc(44 + total * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + total * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(total * 2, 40);
  let o = 44, n = 0;
  for (const s of segments) for (let i = 0; i < Math.round(s.seconds * rate); i++, n++) {
    b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 330 * n) / rate) * s.amplitude * 32767), o); o += 2;
  }
  return b;
}

(async () => {
  fs.rmSync(EXT, { recursive: true, force: true });
  fs.cpSync(SRC, EXT, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));
  manifest.host_permissions = ['http://watch.example/*'];
  manifest.content_scripts = [{ matches: ['http://watch.example/*'], js: ['content.js'], all_frames: true, run_at: 'document_idle' }];
  fs.writeFileSync(path.join(EXT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // A loud-ish scene, so the popup shows the leveller pulling the volume down.
  const wav = buildWav([{ seconds: 30, amplitude: 0.85 }]);
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/tone.wav')) { res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': wav.length }); res.end(wav); return; }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!doctype html><title>Movie night</title><audio src="/tone.wav" loop></audio>');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const origin = `http://watch.example:${port}`;

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vg-shot-profile-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, colorScheme: 'dark', deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--autoplay-policy=no-user-gesture-required', `--host-resolver-rules=MAP watch.example 127.0.0.1`],
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const id = new URL(worker.url()).host;

  const movie = await context.newPage();
  await movie.goto(origin + '/');
  await movie.evaluate(() => document.querySelector('audio').play());
  await movie.waitForTimeout(2500);

  const popup = await context.newPage();
  await popup.setViewportSize({ width: 360, height: 1000 });
  // The popup asks for the active tab; point it at the movie tab instead of itself.
  await popup.addInitScript(() => {
    const query = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = (info) => (info && info.active ? query({ url: 'http://watch.example/*' }) : query(info));
  });
  const errors = [];
  popup.on('pageerror', (e) => errors.push(e.message));
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForTimeout(2500);

  const shot = async (name) => {
    await popup.waitForTimeout(1800);
    await popup.setViewportSize({ width: 360, height: 1000 });
    const height = await popup.evaluate(() => Math.ceil(document.querySelector('.footer').getBoundingClientRect().bottom + 14));
    await popup.setViewportSize({ width: 360, height });
    await popup.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log(name, 'height', height, 'status:', await popup.locator('#status-text').textContent());
  };
  await shot('popup-normal');
  await popup.click('.preset[data-preset="night"]');
  await shot('popup-night');
  await popup.click('.preset[data-preset="cinema"]');
  await shot('popup-cinema');
  await popup.click('.preset[data-preset="normal"]');
  await popup.click('#pause-button');
  await shot('popup-paused');
  await popup.click('#pause-button');
  await popup.emulateMedia({ colorScheme: 'light' });
  await shot('popup-light');
  console.log(errors.length ? 'errors: ' + errors.join(' | ') : 'no page errors');
  await context.close();
  server.close();
})();
