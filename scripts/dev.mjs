// `npm run dev`: builds the site, rebuilds on change and serves dist/ with clean URLs and live reload.
import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from './build.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, '.dev-dist'); // separate from dist/ so builds and checks never race the dev server
const PORT = Number(process.env.PORT ?? 8000);
const WATCH = ['src', 'content', 'static'];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

const RELOAD_JS = `new EventSource('/__dev/events').addEventListener('reload', () => location.reload());`;
const clients = new Set();

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Maps a URL path to a file in dist/, the way Firebase Hosting does with cleanUrls. */
async function resolve(urlPath) {
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  if (safe.startsWith('..')) return null;
  const base = join(DIST, safe);
  for (const candidate of [base, `${base}.html`, join(base, 'index.html')]) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname === '/__dev/events') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    response.write(': connected\n\n');
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }
  if (url.pathname === '/__dev/reload.js') {
    response.writeHead(200, { 'Content-Type': TYPES['.js'] }).end(RELOAD_JS);
    return;
  }
  const file = await resolve(url.pathname);
  const status = file ? 200 : 404;
  const target = file ?? join(DIST, '404.html');
  try {
    const body = await readFile(target);
    response.writeHead(status, { 'Content-Type': TYPES[extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

let timer = null;
let building = false;
let queued = false;

async function rebuild() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  try {
    await buildSite({ dev: true, outDir: DIST });
    for (const client of clients) client.write('event: reload\ndata: now\n\n');
  } catch (error) {
    console.error(error.message ?? error);
  } finally {
    building = false;
    if (queued) {
      queued = false;
      void rebuild();
    }
  }
}

await rebuild();
for (const dir of WATCH) {
  watch(join(ROOT, dir), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 120);
  });
}
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use (another dev server is probably running). Stop it, or pick another port: PORT=8001 npm run dev`);
    process.exit(1);
  }
  throw error;
});
server.listen(PORT, () => console.log(`Volume Guard site: http://localhost:${PORT}`));
