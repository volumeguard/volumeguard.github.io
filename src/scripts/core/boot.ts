import { initCursor, initMagnets } from './cursor';
import { initHeader } from './header';
import { expectGl, startLoader } from './loader';
import { playIntro, watchReveals } from './reveal';
import { initSmoothScroll } from './smooth';
import { initSound } from './sound';
import { splitHeadings } from './split';
import { arrive, initTransitions } from './transition';

export interface BootOptions {
  /** The page renders a 3D scene and the loader should wait for its first frame. */
  gl?: boolean;
}

/** Shared start-up for every page: chrome, motion system and the loader curtain. */
export function boot(options: BootOptions = {}): void {
  if (options.gl) expectGl();
  initTransitions();
  splitHeadings();
  watchReveals();
  initSmoothScroll();
  initHeader();
  initCursor();
  initMagnets();
  initSound();
  startLoader(() => {
    arrive();
    setTimeout(playIntro, document.documentElement.classList.contains('tx-in') ? 300 : 450);
  });
}
