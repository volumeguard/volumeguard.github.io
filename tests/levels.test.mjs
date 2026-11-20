import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEAD_BAND_DB, PRESETS, gainDb, percentToLufs, ratioToLufs } from '../src/scripts/model/levels.ts';

test('slider maps 68 % to −14 LUFS at 0.25 LU per percent, clamped to 20–100 %', () => {
  assert.equal(percentToLufs(68), -14);
  assert.equal(percentToLufs(72), -13);
  assert.equal(percentToLufs(0), percentToLufs(20));
  assert.equal(percentToLufs(150), percentToLufs(100));
});

test('gain respects the dead band and the preset caps', () => {
  assert.equal(gainDb(-14 + DEAD_BAND_DB / 2, -14), 0);
  assert.equal(gainDb(-5, -14), -9);
  assert.equal(gainDb(-40, -14), PRESETS.normal.boostDb);
  assert.equal(gainDb(-40, -14, PRESETS.night), PRESETS.night.boostDb);
  assert.equal(gainDb(30, -14, PRESETS.cinema), -PRESETS.cinema.reductionDb);
});

test('ratio 1 sits on the target', () => {
  assert.equal(ratioToLufs(1, -14), -14);
  assert.ok(Math.abs(ratioToLufs(2, -14) - (-14 + 6.0206)) < 1e-3);
});
