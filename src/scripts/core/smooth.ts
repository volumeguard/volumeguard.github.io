import Lenis from 'lenis';
import { finePointer, reducedMotion, root } from './dom';

type ScrollListener = (y: number) => void;
const listeners = new Set<ScrollListener>();
let lenis: Lenis | null = null;
let ticking = false;

function emit(): void {
  const y = scrollY;
  for (const listener of listeners) listener(y);
}

/** Smooth wheel scrolling on desktop; touch devices keep native scrolling. */
export function initSmoothScroll(): void {
  if (!reducedMotion && finePointer) {
    root.style.scrollBehavior = 'auto';
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, anchors: true });
    lenis.on('scroll', emit);
    const raf = (time: number): void => {
      lenis?.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
  addEventListener(
    'scroll',
    () => {
      if (lenis || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        emit();
      });
    },
    { passive: true },
  );
}

export function onScroll(listener: ScrollListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function scrollToTarget(target: HTMLElement | number): void {
  if (lenis) lenis.scrollTo(target);
  else if (typeof target === 'number') scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' });
  else target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
}

/** Pauses smooth scrolling (used while the full-screen menu is open). */
export function setScrollLocked(locked: boolean): void {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  root.style.overflow = locked ? 'hidden' : '';
}
