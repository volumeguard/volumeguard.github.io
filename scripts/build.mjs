// Builds the static site into dist/: bundles scripts and styles (hashed), renders HTML pages
// from src/pages with shared partials, renders docs from content/docs, copies static/,
// and writes sitemap, robots and the docs search index.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
export const SITE_URL = 'https://volumeguard.web.app';
const PAGE_ENTRIES = ['home', 'scenes', 'toolbox', 'page', 'docs'];
/** Output folder of the build in progress (the dev server uses its own, so `npm run check` never races it). */
let DIST = join(ROOT, 'dist');

/** Builds everything. `dev` keeps source maps and skips minification. */
export async function buildSite({ dev = false, outDir = join(ROOT, 'dist') } = {}) {
  const started = performance.now();
  DIST = outDir;
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const assets = await bundle(dev);
  const partials = await loadPartials();
  const docs = await loadDocs();
  const pages = await loadPages();

  const render = (meta, content) => renderLayout({ meta, content, partials, assets, dev, docs });
  for (const page of pages) {
    await writeHtml(page.meta.path, render(page.meta, page.body));
  }
  for (const doc of docs) {
    await writeHtml(doc.path, render(doc.meta, renderDocPage(doc, docs, partials)));
  }

  await cp(join(ROOT, 'static'), DIST, { recursive: true });
  await writeSearchIndex(docs);
  await writeSitemap([...pages.map((p) => p.meta), ...docs.map((d) => d.meta)]);
  console.log(`built ${pages.length} pages and ${docs.length} docs in ${Math.round(performance.now() - started)} ms`);
}

// ---------- Scripts and styles ----------

async function bundle(dev) {
  const result = await build({
    entryPoints: PAGE_ENTRIES.map((name) => join(SRC, 'scripts', 'pages', `${name}.ts`)),
    outdir: join(DIST, 'assets'),
    bundle: true,
    format: 'esm',
    splitting: true,
    target: 'es2022',
    minify: !dev,
    sourcemap: dev ? 'linked' : false,
    legalComments: 'none',
    entryNames: '[name]-[hash]',
    chunkNames: 'chunks/[name]-[hash]',
    assetNames: 'media/[name]-[hash]',
    loader: { '.woff2': 'file', '.woff': 'file' },
    external: ['/img/*', '/icons/*'],
    metafile: true,
    logLevel: 'warning',
  });

  const assets = {};
  for (const [file, output] of Object.entries(result.metafile.outputs)) {
    if (!output.entryPoint) continue;
    const name = basename(output.entryPoint, '.ts');
    assets[name] = {
      js: '/' + relative(DIST, join(ROOT, file)).replaceAll('\\', '/'),
      css: output.cssBundle ? '/' + relative(DIST, join(ROOT, output.cssBundle)).replaceAll('\\', '/') : null,
    };
  }
  for (const name of PAGE_ENTRIES) if (!assets[name]) throw new Error(`missing bundle for ${name}`);
  return assets;
}

// ---------- Templates ----------

async function loadPartials() {
  const dir = join(SRC, 'partials');
  const partials = {};
  for (const file of await readdir(dir)) {
    if (file.endsWith('.html')) partials[basename(file, '.html')] = await readFile(join(dir, file), 'utf8');
  }
  return partials;
}

const META_RE = /^<!--meta\s*([\s\S]*?)-->\s*/;

async function loadPages() {
  const dir = join(SRC, 'pages');
  const pages = [];
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.html')) continue;
    const raw = await readFile(join(dir, file), 'utf8');
    const match = raw.match(META_RE);
    if (!match) throw new Error(`${file}: missing <!--meta {...} --> header`);
    const meta = JSON.parse(match[1]);
    for (const key of ['title', 'description', 'path', 'entry']) {
      if (!meta[key]) throw new Error(`${file}: meta.${key} is required`);
    }
    pages.push({ meta, body: raw.slice(match[0].length) });
  }
  return pages;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** `{{> name}}` includes a partial, `{{key}}` inserts an escaped value, `{{{key}}}` a raw one. */
function fill(template, values, partials, depth = 0) {
  if (depth > 8) throw new Error('partials nested too deep');
  return template
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
      if (!(name in partials)) throw new Error(`unknown partial "${name}"`);
      return fill(partials[name], values, partials, depth + 1);
    })
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => {
      if (!(key in values)) throw new Error(`unknown raw value "${key}"`);
      return values[key];
    })
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      if (!(key in values)) throw new Error(`unknown value "${key}"`);
      return escapeHtml(values[key]);
    });
}

function renderLayout({ meta, content, partials, assets, dev }) {
  const bundleFor = assets[meta.entry];
  if (!bundleFor) throw new Error(`${meta.path}: unknown entry "${meta.entry}"`);
  const navOn = (key) => (meta.nav === key ? ' class="on" aria-current="page"' : '');
  const values = {
    title: meta.title,
    description: meta.description,
    canonical: SITE_URL + (meta.path === '/' ? '/' : meta.path),
    bodyClass: meta.body ?? 'page',
    themeColor: meta.themeColor ?? '#f3efe7',
    styles: bundleFor.css ? `<link rel="stylesheet" href="${bundleFor.css}" />` : '',
    script: `<script type="module" src="${bundleFor.js}"></script>`,
    devScript: dev ? '<script src="/__dev/reload.js" defer></script>' : '',
    robots: meta.noindex ? '<meta name="robots" content="noindex" />' : '',
    navScenes: navOn('scenes'),
    navToolbox: navOn('toolbox'),
    navDocs: navOn('docs'),
    navFaq: navOn('faq'),
    year: String(new Date().getFullYear()),
  };
  // Docs are already rendered; filling them again would treat `{{` in code samples as placeholders.
  values.content = meta.entry === 'docs' ? content : fill(content, values, partials);
  return fill(partials.layout, values, partials);
}

async function writeHtml(path, html) {
  const file = path === '/' ? 'index.html' : `${path.replace(/^\//, '')}.html`;
  const target = join(DIST, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
}

// ---------- Docs ----------

/** Undoes marked's entity escaping so the text can be escaped exactly once when it is written out. */
function decodeEntities(text) {
  return text
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

/** Reads the pixel size of a PNG or WebP from its header, so images never shift the layout. */
function imageSize(file) {
  let data;
  try {
    data = readFileSync(file);
  } catch {
    return null;
  }
  if (data.toString('ascii', 1, 4) === 'PNG') return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = data.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = data.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') return { width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1 };
  }
  return null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseFrontMatter(raw, file) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error(`${file}: missing front matter`);
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(':');
    if (at > 0) data[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  for (const key of ['title', 'description', 'order']) {
    if (!data[key]) throw new Error(`${file}: front matter "${key}" is required`);
  }
  return { data, body: raw.slice(match[0].length) };
}

async function loadDocs() {
  const dir = join(ROOT, 'content', 'docs');
  const docs = [];
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.md')) continue;
    const { data, body } = parseFrontMatter(await readFile(join(dir, file), 'utf8'), file);
    const slug = basename(file, '.md');
    const path = slug === 'index' ? '/docs' : `/docs/${slug}`;
    const toc = [];
    const marked = new Marked({
      gfm: true,
      renderer: {
        heading({ tokens, depth }) {
          const html = this.parser.parseInline(tokens);
          const id = slugify(html);
          if (depth === 2 || depth === 3) toc.push({ id, text: decodeEntities(html.replace(/<[^>]+>/g, '')), depth });
          return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${html}</h${depth}>\n`;
        },
        image({ href, title, text }) {
          const size = href.startsWith('/') ? imageSize(join(ROOT, 'static', href)) : null;
          if (!size) throw new Error(`${file}: image ${href} must be a local PNG or WebP in static/`);
          const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
          return `<img src="${href}" alt="${escapeHtml(text)}" width="${size.width}" height="${size.height}" loading="lazy" decoding="async"${titleAttr} />`;
        },
        link({ href, title, tokens }) {
          const text = this.parser.parseInline(tokens);
          const external = /^https?:\/\//.test(href);
          const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
          return external
            ? `<a href="${href}"${titleAttr} rel="noopener">${text}</a>`
            : `<a href="${href}"${titleAttr}>${text}</a>`;
        },
      },
    });
    const html = marked.parse(body);
    docs.push({
      slug,
      path,
      order: Number(data.order),
      group: data.group ?? 'Guide',
      title: data.title,
      html,
      toc,
      text: body.replace(/[#*`>|_[\]()-]/g, ' ').replace(/\s+/g, ' ').trim(),
      meta: {
        title: `${data.title} — Volume Guard docs`,
        description: data.description,
        path,
        entry: 'docs',
        body: 'docs',
        nav: 'docs',
      },
    });
  }
  return docs.sort((a, b) => a.order - b.order);
}

function renderDocPage(doc, docs, partials) {
  const groups = [];
  for (const d of docs) {
    let group = groups.find((g) => g.name === d.group);
    if (!group) groups.push((group = { name: d.group, items: [] }));
    group.items.push(d);
  }
  const sidebar = groups
    .map(
      (g) =>
        `<p class="docs-group">${escapeHtml(g.name)}</p><ul>${g.items
          .map(
            (d) =>
              `<li><a href="${d.path}"${d.slug === doc.slug ? ' aria-current="page"' : ''}>${escapeHtml(d.title)}</a></li>`,
          )
          .join('')}</ul>`,
    )
    .join('');
  const toc = doc.toc.length
    ? `<p class="label">On this page</p><ul>${doc.toc
        .map((t) => `<li class="toc-${t.depth}"><a href="#${t.id}">${escapeHtml(t.text)}</a></li>`)
        .join('')}</ul>`
    : '';
  const index = docs.indexOf(doc);
  const prev = docs[index - 1];
  const next = docs[index + 1];
  const pager = [
    prev ? `<a class="pager-prev" href="${prev.path}"><span class="label">Previous</span>${escapeHtml(prev.title)}</a>` : '<span></span>',
    next ? `<a class="pager-next" href="${next.path}"><span class="label">Next</span>${escapeHtml(next.title)}</a>` : '<span></span>',
  ].join('');
  return fill(
    partials['docs-shell'],
    { docSidebar: sidebar, docToc: toc, docBody: doc.html, docPager: pager, docTitle: doc.title, docGroup: doc.group },
    partials,
  );
}

async function writeSearchIndex(docs) {
  const index = docs.map((d) => ({
    title: d.title,
    url: d.path,
    headings: d.toc.map((t) => t.text),
    text: d.text.slice(0, 4000),
  }));
  await writeFile(join(DIST, 'assets', 'search-index.json'), JSON.stringify(index));
}

async function writeSitemap(metas) {
  const urls = metas
    .filter((m) => !m.noindex)
    .map((m) => `  <url><loc>${SITE_URL}${m.path === '/' ? '/' : m.path}</loc></url>`)
    .join('\n');
  await writeFile(
    join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildSite().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
