import { $, $$, root } from './dom';
import { onScroll, setScrollLocked } from './smooth';

const HIDE_AFTER_PX = 200;
const PROBE_Y = 40; // the header's vertical middle, used to detect dark panels underneath

/** Header: hides on scroll down, returns on scroll up, turns light over dark panels; mobile menu. */
export function initHeader(): void {
  const nav = $('.nav');
  if (!nav) return;
  let lastY = scrollY;

  const update = (y: number): void => {
    const goingDown = y > lastY;
    if (Math.abs(y - lastY) > 4) {
      nav.classList.toggle('hide', goingDown && y > HIDE_AFTER_PX && !root.classList.contains('menu-open'));
      lastY = y;
    }
    nav.classList.toggle('scrolled', y > 10);
    const overDark =
      root.classList.contains('scene-dark') ||
      $$('[data-dark]').some((el) => {
        const r = el.getBoundingClientRect();
        return r.top < PROBE_Y && r.bottom > PROBE_Y;
      });
    nav.classList.toggle('dark', overDark);
  };
  onScroll(update);
  update(scrollY);
  initMenu();
}

function initMenu(): void {
  const toggle = $<HTMLButtonElement>('.menu-toggle');
  const menu = $('#menu');
  if (!toggle || !menu) return;
  const main = $('main');

  const setOpen = (open: boolean): void => {
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (main) main.inert = open;
    setScrollLocked(open);
    if (open) $('a', menu)?.focus();
    else toggle.focus();
  };

  // `hidden` keeps the closed menu out of the accessibility tree; CSS still animates it.
  toggle.addEventListener('click', () => setOpen(!root.classList.contains('menu-open')));
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('menu-open')) setOpen(false);
  });
  menu.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) {
      root.classList.remove('menu-open');
      setScrollLocked(false);
      if (main) main.inert = false;
    }
  });
}
