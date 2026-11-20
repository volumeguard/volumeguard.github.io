// Checks the built site in dist/ against the site's promises:
// no third-party resources, no inline scripts or style attributes (strict CSP),
// alt text on every image, and no broken internal links or assets.
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const problems = [];

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Resolves a site path the way Firebase Hosting does with cleanUrls. */
async function resolves(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0] ?? '');
  if (clean === '' || clean === '/') return exists(join(DIST, 'index.html'));
  const base = join(DIST, clean);
  return (await exists(base)) || (await exists(`${base}.html`)) || (await exists(join(base, 'index.html')));
}

const files = await walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const cssFiles = files.filter((f) => f.endsWith('.css'));

for (const file of htmlFiles) {
  const name = relative(DIST, file);
  const html = await readFile(file, 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=/.test(match[1] ?? '')) problems.push(`${name}: inline <script> (blocked by CSP)`);
  }
  if (/<style\b/.test(html)) problems.push(`${name}: inline <style> element (blocked by CSP)`);
  if (/\sstyle="/.test(html)) problems.push(`${name}: inline style attribute (blocked by CSP)`);

  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(match[0])) problems.push(`${name}: <img> without alt: ${match[0].slice(0, 80)}`);
    if (!/\swidth="/.test(match[0]) || !/\sheight="/.test(match[0])) problems.push(`${name}: <img> without width/height: ${match[0].slice(0, 80)}`);
  }

  // Resources must come from this site. Plain <a> links to other sites are fine.
  for (const match of html.matchAll(/<(script|img|link|source|iframe|video|audio)\b[^>]*\s(?:src|href)="([^"]+)"/g)) {
    const [, tag, url] = match;
    if (/^(https?:)?\/\//.test(url) && !(tag === 'link' && /rel="canonical"/.test(match[0]))) {
      problems.push(`${name}: external resource ${url}`);
    }
  }

  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(url) || url.startsWith('//')) continue;
    if (url.startsWith('#')) {
      if (url.length > 1 && !ids.has(url.slice(1))) problems.push(`${name}: missing in-page target ${url}`);
      continue;
    }
    if (url.startsWith('/__dev/')) continue;
    if (!url.startsWith('/')) {
      problems.push(`${name}: relative URL ${url} (use site-absolute paths)`);
      continue;
    }
    if (!(await resolves(url))) problems.push(`${name}: broken link ${url}`);
  }
}

for (const file of cssFiles) {
  const css = await readFile(file, 'utf8');
  for (const match of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    const url = match[1];
    if (url.startsWith('data:')) continue;
    if (/^(https?:)?\/\//.test(url)) problems.push(`${relative(DIST, file)}: external url ${url}`);
    else if (url.startsWith('/') && !(await resolves(url))) problems.push(`${relative(DIST, file)}: missing ${url}`);
  }
}

if (problems.length) {
  console.error(`dist check failed (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`dist check passed: ${htmlFiles.length} pages, ${cssFiles.length} stylesheets`);
