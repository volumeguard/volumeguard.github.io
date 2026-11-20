import { $$ } from './dom';

/** The parts of the demo soundtrack a page can steer (loaded only after the visitor turns sound on). */
export interface DemoSound {
  /** 0 = raw soundtrack, 1 = fully levelled by Volume Guard. */
  setLevelling(amount: number): void;
  stop(): void;
}

type LevelSource = () => number;

let levelSource: LevelSource = () => 1;
let demo: DemoSound | null = null;
let timer = 0;

/** Pages tell the demo how much levelling to apply (for example from scroll position). */
export function setLevelSource(source: LevelSource): void {
  levelSource = source;
}

/** Sound button in the header: off by default, never autoplays, synthesised locally. */
export function initSound(): void {
  const buttons = $$<HTMLButtonElement>('.sound');
  const setPressed = (on: boolean): void => {
    for (const button of buttons) button.setAttribute('aria-pressed', String(on));
  };

  for (const button of buttons) {
    button.addEventListener('click', async () => {
      if (demo) {
        demo.stop();
        demo = null;
        clearInterval(timer);
        setPressed(false);
        return;
      }
      setPressed(true);
      const { startDemo } = await import('../audio/demo');
      demo = startDemo();
      timer = window.setInterval(() => demo?.setLevelling(levelSource()), 100);
    });
  }
  addEventListener('pagehide', () => demo?.stop());
}
