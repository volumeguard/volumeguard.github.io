import { $$ } from './dom';

let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add('in');
        // Scrolling back above an element resets it, so the entrance replays on the way down.
        else if (entry.boundingClientRect.top > 0) entry.target.classList.remove('in');
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  return observer;
}

/** Watches `[data-split]` and `.reveal` elements. Elements inside `[data-intro]` wait for `playIntro`. */
export function watchReveals(scope: ParentNode = document): void {
  for (const el of $$('[data-split], .reveal', scope)) {
    if (!el.closest('[data-intro]')) getObserver().observe(el);
  }
}

/** Plays the first-screen entrance once the loader has lifted. */
export function playIntro(): void {
  for (const el of $$('[data-intro] [data-split], [data-intro] .reveal')) {
    el.classList.add('in');
    getObserver().observe(el);
  }
}
