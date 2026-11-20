/**
 * The home page story as data: where each chapter sits on the road (0 to 1), how loud the
 * soundtrack is along the road, and pure helpers that map scroll position to progress.
 * No DOM or Three.js here, so it is unit tested with Node.
 */
import { smoothstep } from './signal.ts';

/** Story progress at each chapter. HTML sections carry the same values in `data-t`. */
export const CHAPTERS = {
  start: 0,
  how: 0.08,
  song: 0.24,
  blast: 0.42,
  whisper: 0.6,
  night: 0.8,
  line: 1,
} as const;

/** Rail labels shown while scrolling, in order. */
export const RAIL = [
  { at: CHAPTERS.start, label: 'Start' },
  { at: CHAPTERS.song, label: 'The Song' },
  { at: CHAPTERS.blast, label: 'The Blast' },
  { at: CHAPTERS.whisper, label: 'The Whisper' },
  { at: CHAPTERS.night, label: 'Night' },
  { at: CHAPTERS.line, label: 'The line' },
] as const;

/** [road position, loudness]: calm talk, the song, a short breath, the blast, the whisper, night, flat. */
const PROFILE: readonly (readonly [number, number])[] = [
  [0, 0.34],
  [0.16, 0.34],
  [0.2, 1.3],
  [0.31, 1.3],
  [0.34, 0.34],
  [0.37, 1.5],
  [0.5, 1.5],
  [0.53, 0.34],
  [0.56, 0.12],
  [0.68, 0.12],
  [0.71, 0.34],
  [0.78, 0.7],
  [0.9, 0.7],
  [0.94, 0.34],
  [1, 0.34],
];

/** Soundtrack loudness at road position s (1 = loud, TARGET 0.5 = the chosen level). */
export function roadLoudness(s: number): number {
  const x = Math.min(1, Math.max(0, s));
  for (let i = 1; i < PROFILE.length; i++) {
    const prev = PROFILE[i - 1];
    const next = PROFILE[i];
    if (prev && next && x <= next[0]) return prev[1] + (next[1] - prev[1]) * smoothstep((x - prev[0]) / (next[0] - prev[0]));
  }
  return PROFILE[PROFILE.length - 1]?.[1] ?? 0.34;
}

/** An anchor ties a page scroll position (px) to a story progress value. */
export type Anchor = readonly [scrollY: number, progress: number];

/** Story progress for a scroll position, linear between anchors, clamped at the ends. */
export function progressAt(anchors: readonly Anchor[], y: number): number {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (!first || !last) return 0;
  if (y <= first[0]) return first[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (a && b && y <= b[0]) return a[1] + ((b[1] - a[1]) * (y - a[0])) / Math.max(b[0] - a[0], 1);
  }
  return last[1];
}

/** Interpolates numeric tuples keyed by progress, with smoothstep easing between keys. */
export function sampleKeys(keys: readonly (readonly [number, readonly number[]])[], p: number, out: number[]): number[] {
  const first = keys[0];
  if (!first) return out;
  let a = first;
  let b = first;
  for (const key of keys) {
    if (key[0] <= p) a = key;
    if (key[0] >= p) {
      b = key;
      break;
    }
    b = key;
  }
  const span = b[0] - a[0];
  const t = span > 0 ? smoothstep((p - a[0]) / span) : 0;
  for (let i = 0; i < a[1].length; i++) out[i] = (a[1][i] ?? 0) + ((b[1][i] ?? 0) - (a[1][i] ?? 0)) * t;
  return out;
}
