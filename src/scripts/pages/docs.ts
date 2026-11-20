// Entry for documentation pages: offline search, scroll-spy, copy buttons, mobile sidebar.
import '../../styles/docs.css';
import { boot } from '../core/boot';
import { $, $$ } from '../core/dom';

interface DocEntry {
  title: string;
  url: string;
  headings: string[];
  text: string;
}

interface Hit {
  entry: DocEntry;
  score: number;
  snippet: string;
}

const MAX_RESULTS = 8;
const SNIPPET_RADIUS = 60;

boot();
initSidebarToggle();
initCopyButtons();
initScrollSpy();
initSearch();

function initSidebarToggle(): void {
  const toggle = $<HTMLButtonElement>('.docs-side-toggle');
  const nav = $('#docs-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  });
}

function initCopyButtons(): void {
  for (const pre of $$('.docs-article pre')) {
    const code = pre.querySelector('code');
    if (!code) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.addEventListener('click', () => {
      void copyText(code.textContent ?? '').then((ok) => {
        button.textContent = ok ? 'Copied' : 'Press Ctrl+C';
        button.classList.add('done');
        setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('done');
        }, 1600);
      });
    });
    pre.append(button);
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers or a denied permission: fall back to selecting the text.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.className = 'sr';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/** Highlights the "On this page" link for the heading nearest the top of the viewport. */
function initScrollSpy(): void {
  const links = $$<HTMLAnchorElement>('.docs-toc a');
  if (!links.length) return;
  const byId = new Map(links.map((link) => [decodeURIComponent(link.hash.slice(1)), link]));
  const headings = $$('.docs-article h2[id], .docs-article h3[id]').filter((h) => byId.has(h.id));
  const visible = new Set<string>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }
      const current = headings.find((h) => visible.has(h.id))?.id;
      if (!current) return;
      for (const [id, link] of byId) link.classList.toggle('on', id === current);
    },
    { rootMargin: '-90px 0px -65% 0px' },
  );
  for (const heading of headings) observer.observe(heading);
}

// ---------- Search ----------

/** Scores an entry: title matches weigh most, then headings, then body text. */
function scoreEntry(entry: DocEntry, terms: string[]): Hit | null {
  const title = entry.title.toLowerCase();
  const headings = entry.headings.join(' ').toLowerCase();
  const text = entry.text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const inTitle = title.includes(term);
    const inHeadings = headings.includes(term);
    const inText = text.includes(term);
    if (!inTitle && !inHeadings && !inText) return null; // every term must appear somewhere
    score += (inTitle ? 10 : 0) + (inHeadings ? 4 : 0) + (inText ? 1 : 0);
  }
  const first = terms[0] ?? '';
  const at = text.indexOf(first);
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const snippet = at < 0 ? entry.text.slice(0, SNIPPET_RADIUS * 2) : entry.text.slice(start, at + first.length + SNIPPET_RADIUS);
  return { entry, score, snippet: (start > 0 ? '…' : '') + snippet.trim() + '…' };
}

/** Appends `text` to `parent`, wrapping matches of `terms` in <mark> (text nodes only, no HTML parsing). */
function appendHighlighted(parent: HTMLElement, text: string, terms: string[]): void {
  const pattern = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (!pattern) {
    parent.append(text);
    return;
  }
  const regex = new RegExp(`(${pattern})`, 'gi');
  for (const part of text.split(regex)) {
    if (!part) continue;
    if (terms.includes(part.toLowerCase())) {
      const mark = document.createElement('mark');
      mark.textContent = part;
      parent.append(mark);
    } else {
      parent.append(part);
    }
  }
}

function initSearch(): void {
  const input = $<HTMLInputElement>('#docs-q');
  const list = $<HTMLOListElement>('.docs-results');
  if (!input || !list) return;
  list.id = 'docs-results';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', list.id);
  input.setAttribute('aria-autocomplete', 'list');
  list.setAttribute('role', 'listbox');

  let index: DocEntry[] | null = null;
  let selected = -1;
  const load = async (): Promise<DocEntry[]> => {
    if (index) return index;
    try {
      const response = await fetch('/assets/search-index.json');
      index = response.ok ? ((await response.json()) as DocEntry[]) : [];
    } catch {
      index = [];
    }
    return index;
  };

  const items = (): HTMLLIElement[] => $$<HTMLLIElement>('li[role="option"]', list);
  const select = (next: number): void => {
    const options = items();
    if (!options.length) return;
    selected = (next + options.length) % options.length;
    options.forEach((option, i) => option.setAttribute('aria-selected', String(i === selected)));
    const active = options[selected];
    if (active) {
      input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    }
  };
  const close = (): void => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    selected = -1;
  };

  const render = async (): Promise<void> => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      close();
      return;
    }
    const terms = query.split(/\s+/).filter(Boolean);
    const hits = (await load())
      .map((entry) => scoreEntry(entry, terms))
      .filter((hit): hit is Hit => hit !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
    list.replaceChildren();
    selected = -1;
    if (!hits.length) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'No matches. Try another word.';
      list.append(empty);
    }
    hits.forEach((hit, i) => {
      const item = document.createElement('li');
      item.id = `docs-hit-${i}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      const link = document.createElement('a');
      link.href = hit.entry.url;
      const title = document.createElement('strong');
      appendHighlighted(title, hit.entry.title, terms);
      const snippet = document.createElement('span');
      appendHighlighted(snippet, hit.snippet, terms);
      link.append(title, snippet);
      item.append(link);
      list.append(item);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', () => void render());
  input.addEventListener('focus', () => void load());
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.hidden) return;
      select(selected + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Enter') {
      const link = items()[selected]?.querySelector('a') ?? items()[0]?.querySelector('a');
      if (link && !list.hidden) {
        event.preventDefault();
        link.click();
      }
    } else if (event.key === 'Escape') {
      close();
    }
  });
  document.addEventListener('click', (event) => {
    if (!(event.target as Element).closest('.docs-search')) close();
  });
  // "/" focuses search, like most docs sites.
  addEventListener('keydown', (event) => {
    const target = event.target as Element;
    if (event.key === '/' && !target.closest('input, textarea, [contenteditable]')) {
      event.preventDefault();
      input.focus();
    }
  });
}
