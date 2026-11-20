/** Small DOM and environment helpers shared by every page. */

export const root = document.documentElement;

export function $<T extends Element = HTMLElement>(selector: string, scope: ParentNode = document): T | null {
  return scope.querySelector<T>(selector);
}

export function $$<T extends Element = HTMLElement>(selector: string, scope: ParentNode = document): T[] {
  return Array.from(scope.querySelectorAll<T>(selector));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(pointer: fine)').matches;
export const canHover = matchMedia('(hover: hover)').matches;

/** True on wide screens with a mouse, where parallax and pinned effects are worth their cost. */
export function isWide(): boolean {
  return innerWidth > 1180 && canHover;
}

/** Ease-in-out cubic, used by tweens. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Runs `step(progress)` every frame for `ms` milliseconds, then `done`. */
export function tween(ms: number, step: (k: number) => void, done?: () => void): void {
  const start = performance.now();
  const frame = (now: number): void => {
    const k = Math.min((now - start) / ms, 1);
    step(k);
    if (k < 1) requestAnimationFrame(frame);
    else done?.();
  };
  requestAnimationFrame(frame);
}
