import { $, $$, finePointer, reducedMotion, root } from './dom';

const FOLLOW = 0.18; // ring easing towards the pointer per frame
const BIG_TARGETS = 'a, button, summary, label, input[type="range"], [data-cursor="big"]';

/** Dot plus trailing ring on mouse devices. Grows over interactive elements, turns light on dark panels. */
export function initCursor(): void {
  const cursor = $('.cursor');
  const ring = cursor?.querySelector('i');
  if (!cursor || !ring || !finePointer || reducedMotion) {
    cursor?.remove();
    return;
  }
  root.classList.add('has-cursor');
  let x = -100;
  let y = -100;
  let rx = x;
  let ry = y;
  let running = false;

  const frame = (): void => {
    rx += (x - rx) * FOLLOW;
    ry += (y - ry) * FOLLOW;
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    ring.style.transform = `translate(${rx - x}px, ${ry - y}px)`;
    if (Math.abs(x - rx) + Math.abs(y - ry) > 0.1) requestAnimationFrame(frame);
    else running = false;
  };

  const darkPanels = (): HTMLElement[] => $$('[data-dark]');
  addEventListener(
    'pointermove',
    (event) => {
      x = event.clientX;
      y = event.clientY;
      cursor.classList.add('on');
      const target = event.target as Element | null;
      cursor.classList.toggle('big', Boolean(target?.closest(BIG_TARGETS)));
      cursor.classList.toggle(
        'dark',
        root.classList.contains('scene-dark') ||
          darkPanels().some((panel) => {
            const r = panel.getBoundingClientRect();
            return y >= r.top && y <= r.bottom && x >= r.left && x <= r.right;
          }),
      );
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => cursor.classList.remove('on'));
}

/** Buttons marked `.magnet` lean a little towards the pointer. */
export function initMagnets(): void {
  if (!finePointer || reducedMotion) return;
  for (const button of $$('.btn.magnet')) {
    button.addEventListener('pointermove', (event) => {
      const r = button.getBoundingClientRect();
      const dx = (event.clientX - (r.left + r.width / 2)) * 0.25;
      const dy = (event.clientY - (r.top + r.height / 2)) * 0.35;
      button.classList.add('pull');
      button.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    button.addEventListener('pointerleave', () => {
      button.classList.remove('pull');
      button.style.transform = '';
    });
  }
}
