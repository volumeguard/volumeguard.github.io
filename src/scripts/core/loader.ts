import { $, reducedMotion, root } from './dom';

const MAX_WAIT_MS = 9000;
const MIN_SHOW_MS = 700;

let needsGl = false;

/** Pages with a 3D scene call this before `startLoader`, then add `gl-ready` or `no-gl` to <html>. */
export function expectGl(): void {
  needsGl = true;
}

/**
 * Counts 00 to 100 while fonts, the page and (if any) the first 3D frame get ready, then lifts the
 * curtain. Pages reached through the iris transition skip the curtain.
 */
export function startLoader(onDone: () => void): void {
  const num = $('[data-load]');
  const orb = $('.loader-orb');
  const dots = $('[data-load-dots]');
  const start = performance.now();
  let shown = 0;
  let target = 0;
  let done = false;
  let fontsReady = !document.fonts;
  let pageReady = document.readyState === 'complete';
  void document.fonts?.ready.then(() => (fontsReady = true));
  addEventListener('load', () => (pageReady = true), { once: true });

  const glReady = (): boolean => !needsGl || root.classList.contains('gl-ready') || root.classList.contains('no-gl');

  const finish = (): void => {
    if (done) return;
    done = true;
    root.classList.add('loaded');
    onDone();
  };

  if (root.classList.contains('tx-in') || reducedMotion) {
    // No counting animation: lift as soon as the essentials are there.
    const wait = (): void => {
      if ((fontsReady && pageReady && glReady()) || performance.now() - start > MAX_WAIT_MS) finish();
      else requestAnimationFrame(wait);
    };
    wait();
    return;
  }

  const tick = (): void => {
    const elapsed = performance.now() - start;
    const steps = Number(fontsReady) + Number(pageReady) + Number(glReady());
    target = Math.max(target, Math.min(94, elapsed / 30), steps * 31);
    if (steps === 3 && elapsed > MIN_SHOW_MS) target = 100;
    shown += (target - shown) * 0.12;
    if (target === 100 && shown > 99.4) shown = 100;
    const value = Math.round(shown);
    if (num) num.textContent = String(value).padStart(2, '0');
    orb?.style.setProperty('--lp', `${value}%`);
    orb?.style.setProperty('--lr', String(value));
    if (dots) dots.textContent = '.'.repeat(1 + (Math.floor(elapsed / 400) % 3));
    if (value >= 100 || elapsed > MAX_WAIT_MS) finish();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
