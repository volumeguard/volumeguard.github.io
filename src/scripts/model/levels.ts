/**
 * The extension's level maths in dB, for the toolbox demo. Numbers match the extension:
 * target slider 20–100 %, 68 % = −14 LUFS, 0.25 LU per %, 1 dB dead band, per-preset caps.
 */

export const TARGET_MIN = 20;
export const TARGET_MAX = 100;
export const TARGET_DEFAULT = 68;
export const LUFS_AT_DEFAULT = -14;
export const LU_PER_PERCENT = 0.25;
export const DEAD_BAND_DB = 1;
export const PAUSE_MINUTES = 15;

export interface Preset {
  readonly target: number;
  readonly boostDb: number;
  readonly reductionDb: number;
}

export const PRESETS = {
  night: { target: 52, boostDb: 9, reductionDb: 30 },
  normal: { target: 68, boostDb: 6, reductionDb: 24 },
  cinema: { target: 82, boostDb: 4, reductionDb: 12 },
} as const satisfies Record<string, Preset>;

/** Target loudness for a slider position, clamped to the slider's range. */
export function percentToLufs(percent: number): number {
  const p = Math.min(TARGET_MAX, Math.max(TARGET_MIN, percent));
  return LUFS_AT_DEFAULT + (p - TARGET_DEFAULT) * LU_PER_PERCENT;
}

/** Gain in dB the leveller applies to bring `inputLufs` to `targetLufs`, inside the dead band and caps. */
export function gainDb(inputLufs: number, targetLufs: number, preset: Preset = PRESETS.normal): number {
  const diff = targetLufs - inputLufs;
  if (Math.abs(diff) <= DEAD_BAND_DB) return 0;
  return Math.min(preset.boostDb, Math.max(-preset.reductionDb, diff));
}

/** Converts an amplitude ratio (1 = target level) to LUFS around a target. */
export function ratioToLufs(ratio: number, targetLufs: number): number {
  return targetLufs + 20 * Math.log10(Math.max(ratio, 1e-4));
}
