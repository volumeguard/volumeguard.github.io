/**
 * Pure waveform model for the scroll story. No Three.js here, so it can be unit tested with Node.
 * Amplitudes are fractions of a full-height bar; TARGET is where the chosen level sits.
 */

export const TARGET = 0.5;
/** The leveller never boosts more than this, like the extension's boost cap. */
export const MAX_BOOST = 2.4;
export const MIN_GAIN = 0.3;
/** Length of one repeating "movie" in waveform units. */
export const PERIOD = 14;

/** [position in PERIOD, loudness]: dialogue, action burst, whisper, loud song, dialogue. Ends match so it repeats. */
const SCENES: readonly (readonly [number, number])[] = [
  [0, 0.34],
  [2.6, 0.34],
  [3.2, 1.5],
  [5.4, 1.5],
  [6.0, 0.34],
  [8.4, 0.34],
  [9.0, 0.14],
  [10.2, 0.14],
  [10.8, 1.15],
  [12.4, 1.15],
  [13.0, 0.34],
  [PERIOD, 0.34],
];

/** Where the sudden "crack" transient sits in PERIOD. The slow leveller misses it; the limiter catches it. */
const TRANSIENT_AT = 4.1;
const TRANSIENT_WIDTH = 0.16;
const TRANSIENT_HEIGHT = 1.6;

export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Loudness of the soundtrack at position u. */
export function envelope(u: number): number {
  const p = ((u % PERIOD) + PERIOD) % PERIOD;
  for (let i = 1; i < SCENES.length; i++) {
    const next = SCENES[i];
    const prev = SCENES[i - 1];
    if (next && prev && p <= next[0]) {
      return lerp(prev[1], next[1], smoothstep((p - prev[0]) / (next[0] - prev[0])));
    }
  }
  return 0.34;
}

/** Fine texture so the bars look like audio, always between 0.62 and 1. */
export function texture(u: number): number {
  return 0.62 + 0.38 * Math.abs(Math.sin(u * 9.1) * Math.cos(u * 3.7 + 1));
}

/** Short loud crack, 0 to 1. */
export function transient(u: number): number {
  const p = ((u % PERIOD) + PERIOD) % PERIOD;
  const d = (p - TRANSIENT_AT) / TRANSIENT_WIDTH;
  return Math.exp(-d * d);
}

/** Gain the leveller applies to a scene of this loudness: pull loud down, lift quiet, capped both ways. */
export function gainFor(loudness: number): number {
  return Math.min(MAX_BOOST, Math.max(MIN_GAIN, TARGET / loudness));
}

/** Gain the leveller applies at u. */
export function levelGain(u: number): number {
  return gainFor(envelope(u));
}

/** Gain actually applied for a levelling amount from 0 (off) to 1 (full). */
export function appliedGain(u: number, level: number): number {
  return lerp(1, levelGain(u), level);
}

/** Bar amplitude before the limiter. */
export function amplitude(u: number, level: number): number {
  return envelope(u) * texture(u) * appliedGain(u, level) + TRANSIENT_HEIGHT * transient(u);
}

/** Smooth limiter: nearly linear below the ceiling, never above it. */
export function softLimit(amp: number, ceiling: number): number {
  return ceiling * Math.tanh(amp / ceiling);
}

/** How loud the sound is relative to the target (1 = on target). Used only for colour. */
export function loudnessRatio(u: number, level: number): number {
  return (envelope(u) * appliedGain(u, level) + TRANSIENT_HEIGHT * transient(u)) / TARGET;
}

export interface ColorWeights {
  amber: number;
  teal: number;
  violet: number;
}

/** Amber = too loud, violet = too quiet, teal = on target. Weights sum to 1. */
export function colorWeights(ratio: number): ColorWeights {
  const amber = smoothstep((ratio - 1.1) / 0.4);
  const violet = 1 - smoothstep((ratio - 0.55) / 0.3);
  const teal = Math.max(0, 1 - amber - violet);
  const sum = amber + violet + teal;
  return { amber: amber / sum, teal: teal / sum, violet: violet / sum };
}
