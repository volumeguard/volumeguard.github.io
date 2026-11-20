// Home: scroll drives the story progress shared with the 3D road; the rest is page choreography.
import '../../styles/home.css';
import { boot } from '../core/boot';
import { $, $$, clamp, isWide, reducedMotion, root } from '../core/dom';
import { onScroll } from '../core/smooth';
import { setLevelSource } from '../core/sound';
import { TARGET, appliedGain, envelope } from '../model/signal';
import { CHAPTERS, RAIL, progressAt, type Anchor } from '../model/story';
import { story } from '../three/road-state';

const NIGHT_FROM = 0.7;
const NIGHT_TO = 0.97;
const CYCLE_MS = 2600;
const LUFS_AT_TARGET = -14; // the extension's Normal target, used to label the demo meter

boot({ gl: true });

// ---------- Scroll → story progress ----------
let anchors: Anchor[] = [];
function measureAnchors(): void {
  anchors = $$('[data-t]')
    .map((section): Anchor => {
      const t = Number(section.dataset.t);
      const top = section.getBoundingClientRect().top + scrollY;
      const y = t === 0 ? 0 : top + section.offsetHeight * 0.5 - innerHeight * 0.5;
      return [y, t];
    })
    .sort((a, b) => a[0] - b[0]);
}

// ---------- Parallax ----------
interface SpeedItem {
  el: HTMLElement;
  mid: number;
  speed: number;
}
let speedItems: SpeedItem[] = [];
function measureSpeed(): void {
  speedItems = $$('[data-speed]').map((el) => {
    el.style.translate = '';
    const rect = (el.parentElement ?? el).getBoundingClientRect();
    return { el, mid: rect.top + scrollY + rect.height / 2, speed: Number(el.dataset.speed) };
  });
}
for (const card of $$('[data-rot]')) card.style.setProperty('--rot', `${card.dataset.rot}deg`);

// ---------- Elements ----------
const rail = $('.rail');
const railFill = $('.rail-fill');
const railOrb = $('.rail-orb');
const railLabel = $('.rail-label');
const hud = $('.peaks-hud');
const hudCount = $('[data-peaks]');
const firstPanel = $('.panel');
const control = $('.control');
const run = $('[data-run]');
const knobs = $$('.knob', run ?? document);
let lastPeaks = -1;

function frame(y: number): void {
  const vh = innerHeight;
  story.p = clamp(progressAt(anchors, y), 0, 1);
  const panelTop = firstPanel?.getBoundingClientRect().top ?? Infinity;

  const pct = `${(story.p * 100).toFixed(2)}%`;
  if (railFill) railFill.style.height = pct;
  if (railOrb) railOrb.style.top = pct;
  const chapter = [...RAIL].reverse().find((item) => story.p >= item.at - 0.03) ?? RAIL[0];
  if (railLabel && railLabel.textContent !== chapter.label) railLabel.textContent = chapter.label;

  const night = story.p > NIGHT_FROM && story.p < NIGHT_TO && panelTop > 40;
  root.classList.toggle('scene-dark', night);
  rail?.classList.toggle('dark', night);
  hud?.classList.toggle('dark', night);
  const past = panelTop < vh * 0.5;
  rail?.classList.toggle('gone', past);
  hud?.classList.toggle('gone', past);
  story.covered = panelTop < -vh * 0.2;

  if (!reducedMotion && isWide()) {
    for (const item of speedItems) {
      const top = item.mid - y;
      if (top < -vh * 1.5 || top > vh * 2.5) continue;
      item.el.style.translate = `0 ${((top - vh / 2) * item.speed).toFixed(1)}px`;
    }
  }

  if (control) {
    const rect = control.getBoundingClientRect();
    const open = clamp((vh - rect.top) / (vh * 0.85), 0, 1);
    const inset = reducedMotion ? 0 : (1 - open) * 12;
    control.style.setProperty('--inset', `${inset.toFixed(2)}% round ${(40 * (1 - open)).toFixed(0)}px`);
  }

  if (run && isWide()) {
    const rect = run.getBoundingClientRect();
    const k = clamp(1 - (rect.top - vh * 0.25) / (vh * 0.75), 0, 1);
    const offset = (1 - k) * -innerWidth * 0.9;
    run.style.transform = `translate3d(${offset.toFixed(1)}px, 0, 0)`;
    knobs.forEach((knob, i) => {
      const spin = ((offset * (1 + i * 0.06)) / 100) * 57.3;
      knob.style.setProperty('--spin', `${spin.toFixed(1)}deg`);
    });
  }
}

function updatePeaks(): void {
  if (story.peaks === lastPeaks || !hudCount || !hud) return;
  if (story.peaks > lastPeaks && lastPeaks >= 0) {
    hud.classList.add('pop');
    setTimeout(() => hud.classList.remove('pop'), 260);
  }
  lastPeaks = story.peaks;
  hudCount.textContent = String(story.peaks).padStart(2, '0');
}

function remeasure(): void {
  measureAnchors();
  measureSpeed();
  frame(scrollY);
}

onScroll(frame);
addEventListener('resize', remeasure);
addEventListener('load', remeasure);
remeasure();
setInterval(updatePeaks, 150);

// Sound demo follows the story: raw until the orb has levelled the road.
setLevelSource(() => clamp((story.p - CHAPTERS.how) / (CHAPTERS.song - CHAPTERS.how), 0, 1));

// ---------- Popup state cycle (control room) ----------
const cycle = $('[data-cycle]');
if (cycle && !reducedMotion) {
  const shots = $$('img', cycle);
  const caption = $('[data-cycle-caption]', cycle);
  let index = 0;
  let visible = false;
  new IntersectionObserver(([entry]) => (visible = Boolean(entry?.isIntersecting))).observe(cycle);
  setInterval(() => {
    if (!visible || document.hidden || shots.length < 2) return;
    shots[index]?.classList.remove('on');
    index = (index + 1) % shots.length;
    const next = shots[index];
    next?.classList.add('on');
    if (caption && next) caption.textContent = next.dataset.caption ?? '';
  }, CYCLE_MS);
}

// ---------- Presets ----------
const presetCopy: Record<string, string> = {
  night: 'Night holds everything low and lifts dialogue more (up to 9 dB), so you can watch while the house sleeps.',
  normal: 'Normal keeps everyday viewing even: loud scenes down, quiet scenes up by at most 6 dB.',
  cinema: 'Cinema lets the movie breathe: it only steps in for the biggest swings.',
  custom: 'Your own: pick any level from 20 to 100 percent and set how much it may boost or cut.',
};
const presetText = $('[data-preset-text]');
for (const knob of knobs) {
  knob.addEventListener('click', () => {
    for (const other of knobs) other.setAttribute('aria-pressed', String(other === knob));
    const key = knob.dataset.preset ?? 'normal';
    if (presetText) presetText.textContent = presetCopy[key] ?? '';
  });
}

// ---------- Night demo meter ----------
const meterIn = $('[data-meter="in"]');
const meterOut = $('[data-meter="out"]');
const meterGain = $('[data-meter="gain"]');
const meterTarget = $('[data-meter="target"]');
const nightPanel = $('.night-panel');
if (meterIn && meterOut && meterGain && meterTarget && nightPanel) {
  const toLufs = (amplitude: number): number => LUFS_AT_TARGET + 20 * Math.log10(amplitude / TARGET);
  const fmt = (value: number, signed = false): string =>
    `${signed && value >= 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(0)}`;
  meterTarget.textContent = fmt(LUFS_AT_TARGET);
  let visible = false;
  new IntersectionObserver(([entry]) => (visible = Boolean(entry?.isIntersecting))).observe(nightPanel);
  const started = performance.now();
  const tick = (): void => {
    if (visible && !document.hidden) {
      const u = ((performance.now() - started) / 1000) * 0.9;
      const loudness = envelope(u);
      const gain = appliedGain(u, 1);
      meterIn.textContent = fmt(toLufs(loudness));
      meterOut.textContent = fmt(toLufs(loudness * gain));
      meterGain.textContent = fmt(20 * Math.log10(gain), true);
    }
  };
  tick();
  if (!reducedMotion) setInterval(tick, 250);
}

// ---------- 3D road (loaded after the page so text paints first) ----------
const canvas = $<HTMLCanvasElement>('#world');
if (canvas) {
  import('../three/road')
    .then(({ startRoad }) => startRoad(canvas))
    .catch(() => root.classList.add('no-gl'));
} else {
  root.classList.add('no-gl');
}
