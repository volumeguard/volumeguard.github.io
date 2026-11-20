// Scenes: scroll turns the turntable; each chapter's range input blends its diorama before/after.
import '../../styles/scenes.css';
import { boot } from '../core/boot';
import { $, $$, root } from '../core/dom';
import { onScroll } from '../core/smooth';
import { progressAt, type Anchor } from '../model/story';
import type { TableState } from '../three/turntable';

boot({ gl: true });

const state: TableState = { w: 0, compare: [1, 1, 1], changed: () => undefined };

let anchors: Anchor[] = [];
function measure(): void {
  anchors = $$('[data-w]')
    .map((section): Anchor => {
      const w = Number(section.dataset.w);
      const top = section.getBoundingClientRect().top + scrollY;
      return [w === 0 ? 0 : top + section.offsetHeight * 0.5 - innerHeight * 0.5, w];
    })
    .sort((a, b) => a[0] - b[0]);
}
const update = (y: number): void => {
  state.w = progressAt(anchors, y);
  state.changed();
};
onScroll(update);
addEventListener('resize', () => {
  measure();
  update(scrollY);
});
addEventListener('load', () => {
  measure();
  update(scrollY);
});
measure();
update(scrollY);

for (const input of $$<HTMLInputElement>('[data-compare]')) {
  const index = Number(input.dataset.compare);
  input.addEventListener('input', () => {
    const value = Number(input.value) / 100;
    state.compare[index] = value;
    input.setAttribute('aria-valuetext', value > 0.5 ? 'After: levelled' : 'Before: raw');
    state.changed();
  });
}

const canvas = $<HTMLCanvasElement>('#stage');
if (canvas) {
  import('../three/turntable')
    .then(({ startTurntable }) => startTurntable(canvas, state))
    .catch(() => root.classList.add('no-gl'));
} else {
  root.classList.add('no-gl');
}
