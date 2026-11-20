import { easeInOut, reducedMotion, root, tween } from './dom';

/**
 * Page transition: on an internal link click the guard orb rolls from the click point to the
 * centre, the screen closes onto a teal target ring and the orb drops in. The next page opens
 * from the same ring. A sessionStorage flag tells the next page to play the opening.
 */
const KEY = 'vg-tx';
const LEAVE_MS = 820;
const ARRIVE_MS = 950;
const ORB_ARC_PX = 90;

let ink: HTMLElement;
let ring: HTMLElement;
let orb: HTMLElement;
let box: HTMLElement;
let arriving = false;

function radiusToCover(): number {
  return Math.hypot(innerWidth, innerHeight) * 0.6 + 40;
}

function setRadius(r: number): void {
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  const mask = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${r}px, #000 ${r + 1}px)`;
  ink.style.maskImage = mask;
  ink.style.webkitMaskImage = mask;
  ring.style.width = ring.style.height = `${r * 2 + 16}px`;
  ring.style.opacity = r < 4 ? '0' : '1';
}

function isInternalNavigation(event: MouseEvent, anchor: HTMLAnchorElement): URL | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  if (anchor.target || anchor.hasAttribute('download') || anchor.dataset.noTransition !== undefined) return null;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return null;
  if (url.pathname === location.pathname) return null; // in-page anchors scroll normally
  if (/\.(pdf|zip|png|jpe?g|webp|svg|json|xml|txt)$/i.test(url.pathname)) return null;
  return url;
}

function leave(href: string, x: number, y: number): void {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    // Storage blocked: the next page simply opens without the iris.
  }
  box.classList.add('on');
  root.classList.add('tx-out');
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  const cover = radiusToCover();
  orb.style.opacity = '1';
  tween(
    LEAVE_MS,
    (k) => {
      const e = easeInOut(k);
      setRadius(cover * (1 - e) + 26 * e);
      const travel = easeInOut(Math.min(k / 0.75, 1));
      const ox = x + (cx - x) * travel;
      const oy = y + (cy - y) * travel - Math.sin(travel * Math.PI) * ORB_ARC_PX;
      const scale = k < 0.75 ? 1 : 1 - ((k - 0.75) / 0.25) * 0.85;
      orb.style.transform = `translate(${ox}px, ${oy}px) scale(${scale}) rotate(${travel * 540}deg)`;
    },
    () => {
      setRadius(0);
      location.href = href;
    },
  );
}

export function initTransitions(): void {
  box = document.createElement('div');
  box.className = 'tx';
  box.setAttribute('aria-hidden', 'true');
  ink = document.createElement('div');
  ink.className = 'tx-ink';
  ring = document.createElement('div');
  ring.className = 'tx-ring';
  orb = document.createElement('i');
  orb.className = 'tx-orb';
  box.append(ink, ring, orb);
  document.body.append(box);

  try {
    arriving = sessionStorage.getItem(KEY) === '1';
    sessionStorage.removeItem(KEY);
  } catch {
    arriving = false;
  }
  if (arriving && !reducedMotion) {
    root.classList.add('tx-in');
    setRadius(0);
    box.classList.add('on');
  }

  if (reducedMotion) return;
  document.addEventListener(
    'click',
    (event) => {
      const anchor = (event.target as Element | null)?.closest('a');
      if (!anchor) return;
      const url = isInternalNavigation(event, anchor);
      if (!url) return;
      event.preventDefault();
      leave(url.href, event.clientX || innerWidth / 2, event.clientY || innerHeight / 2);
    },
    true,
  );
  // Back/forward cache restores the page mid-transition; reset it.
  addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    box.classList.remove('on');
    root.classList.remove('tx-out', 'tx-in');
    orb.style.opacity = '0';
  });
}

/** Opens the iris on a page reached through a transition. Safe to call on every page. */
export function arrive(): void {
  if (!root.classList.contains('tx-in')) return;
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  const cover = radiusToCover();
  orb.style.opacity = '1';
  tween(
    ARRIVE_MS,
    (k) => {
      setRadius(cover * easeInOut(k));
      const up = Math.sin(Math.min(k / 0.6, 1) * Math.PI) * 160;
      const fall = k > 0.6 ? (k - 0.6) / 0.4 : 0;
      const scale = Math.min(0.2 + k * 2.2, 1);
      orb.style.transform = `translate(${cx + k * 140}px, ${cy - up + fall * fall * innerHeight * 0.7}px) scale(${scale}) rotate(${k * 400}deg)`;
      orb.style.opacity = String(1 - Math.max(0, (k - 0.85) / 0.15));
    },
    () => {
      box.classList.remove('on');
      root.classList.remove('tx-in');
    },
  );
}
