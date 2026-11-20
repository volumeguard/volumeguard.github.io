// Toolbox: the active part drives the board; the dock's slider and switch drive the leveller demo.
import '../../styles/toolbox.css';
import { boot } from '../core/boot';
import { $, $$, root } from '../core/dom';
import { onScroll } from '../core/smooth';
import { TARGET_DEFAULT, percentToLufs } from '../model/levels';
import type { BoardState } from '../three/board';

boot({ gl: true });

const STORAGE_KEY = 'vg-parts-tried';
const GHOST_SWAP_MS = 450;
const PART_NAMES: Record<string, string> = {
  intro: 'Parts',
  dial: 'Dial',
  leveller: 'Level',
  boost: 'Boost',
  limiter: 'Limit',
  bypass: 'Bypass',
  pause: 'Pause',
  site: 'Sites',
  compat: 'Compat',
  shortcut: 'Keys',
  end: 'Parts',
};

const state: BoardState = { part: 'intro', target: TARGET_DEFAULT, bypass: false, changed: () => undefined };

const sections = $$('[data-part]');
const body = document.body;
const ghost = $('.ghost');
const ghostText = $('[data-ghost]');
const hud = $('.hud');
const footer = $('.foot');
const triedOut = $('[data-tried]');

function loadTried(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
const tried = loadTried();
const countable = new Set(Object.keys(PART_NAMES).filter((key) => key !== 'intro' && key !== 'end'));
const renderTried = (): void => {
  if (triedOut) triedOut.textContent = String([...tried].filter((part) => countable.has(part)).length);
};
renderTried();

function setPart(part: string, bg: string): void {
  if (body.dataset.bg !== bg) body.dataset.bg = bg;
  if (state.part === part) return;
  state.part = part;
  state.changed();
  if (countable.has(part) && !tried.has(part)) {
    tried.add(part);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...tried]));
    } catch {
      // Storage blocked: the counter still works for this visit.
    }
    renderTried();
  }
  if (ghost && ghostText) {
    ghost.classList.add('swap');
    setTimeout(() => {
      ghostText.textContent = PART_NAMES[part] ?? 'Parts';
      ghost.classList.remove('swap');
    }, GHOST_SWAP_MS);
  }
}

const update = (): void => {
  const middle = innerHeight / 2;
  const active = sections.find((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= middle && rect.bottom > middle;
  });
  if (active) setPart(active.dataset.part ?? 'intro', active.dataset.bg ?? 'calm');
  hud?.classList.toggle('gone', (footer?.getBoundingClientRect().top ?? Infinity) < innerHeight);
};
onScroll(update);
update();
body.dataset.bg ??= 'calm';

// ---------- Dock controls ----------
const targetInput = $<HTMLInputElement>('#hud-target');
const targetOut = $('#hud-target-value');
const bypassInput = $<HTMLInputElement>('#hud-bypass');
const formatLufs = (lufs: number): string => `${lufs < 0 ? '−' : ''}${Math.abs(lufs).toFixed(lufs % 1 === 0 ? 0 : 2)} LUFS`;

targetInput?.addEventListener('input', () => {
  state.target = Number(targetInput.value);
  if (targetOut) targetOut.textContent = `${state.target}% · ${formatLufs(percentToLufs(state.target))}`;
  state.changed();
});
const setBypass = (on: boolean): void => {
  state.bypass = on;
  if (bypassInput) bypassInput.checked = on;
  state.changed();
};
bypassInput?.addEventListener('change', () => setBypass(bypassInput.checked));
$('.hud')?.addEventListener('submit', (event) => event.preventDefault());
addEventListener('keydown', (event) => {
  if (event.altKey && event.shiftKey && event.code === 'KeyV') {
    event.preventDefault();
    setBypass(!state.bypass);
  }
});

const canvas = $<HTMLCanvasElement>('#board');
if (canvas) {
  import('../three/board')
    .then(({ startBoard }) => startBoard(canvas, state))
    .catch(() => root.classList.add('no-gl'));
} else {
  root.classList.add('no-gl');
}
