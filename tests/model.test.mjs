import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_BOOST,
  PERIOD,
  TARGET,
  amplitude,
  colorWeights,
  envelope,
  gainFor,
  levelGain,
  loudnessRatio,
  softLimit,
} from '../src/scripts/model/signal.ts';
import { CHAPTERS, RAIL, progressAt, roadLoudness, sampleKeys } from '../src/scripts/model/story.ts';

test('the demo soundtrack repeats every period', () => {
  for (const u of [0.7, 3.4, 9.5, 12]) assert.ok(Math.abs(envelope(u) - envelope(u + PERIOD)) < 1e-9);
});

test('levelling pulls loud scenes to the target and lifts dialogue', () => {
  const loud = 5;
  const dialogue = 1;
  assert.ok(Math.abs(envelope(loud) * levelGain(loud) - TARGET) < 1e-9);
  assert.ok(Math.abs(envelope(dialogue) * levelGain(dialogue) - TARGET) < 1e-9);
  assert.ok(loudnessRatio(loud, 0) > 2.5);
  assert.ok(Math.abs(loudnessRatio(loud, 1) - 1) < 1e-6);
});

test('boost is capped so a whisper stays below the target', () => {
  assert.equal(gainFor(0.12), MAX_BOOST);
  assert.ok(0.12 * MAX_BOOST < TARGET);
});

test('the limiter catches the crack that levelling misses', () => {
  const crack = 4.1;
  assert.ok(amplitude(crack, 1) > 1.5);
  assert.ok(softLimit(amplitude(crack, 1), 1) < 1);
});

test('colour weights always sum to one and name the right zone', () => {
  for (const r of [0, 0.4, 0.8, 1, 1.3, 2, 4]) {
    const { amber, teal, violet } = colorWeights(r);
    assert.ok(Math.abs(amber + teal + violet - 1) < 1e-9);
  }
  assert.ok(colorWeights(3).amber > 0.99);
  assert.ok(colorWeights(0.2).violet > 0.99);
  assert.ok(colorWeights(1).teal > 0.99);
});

test('the road is loud in the song and blast chapters and quiet in the whisper', () => {
  assert.ok(roadLoudness(CHAPTERS.song) > 1);
  assert.ok(roadLoudness(CHAPTERS.blast + 0.02) > 1);
  assert.ok(roadLoudness(CHAPTERS.whisper + 0.02) < 0.2);
  assert.equal(roadLoudness(-1), roadLoudness(0));
  assert.equal(roadLoudness(2), roadLoudness(1));
});

test('rail chapters are in story order', () => {
  for (let i = 1; i < RAIL.length; i++) assert.ok(RAIL[i].at > RAIL[i - 1].at);
});

test('progress interpolates between anchors and clamps at the ends', () => {
  const anchors = [
    [0, 0],
    [1000, 0.5],
    [3000, 1],
  ];
  assert.equal(progressAt(anchors, -50), 0);
  assert.equal(progressAt(anchors, 500), 0.25);
  assert.equal(progressAt(anchors, 2000), 0.75);
  assert.equal(progressAt(anchors, 9999), 1);
  assert.equal(progressAt([], 10), 0);
});

test('sampleKeys hits keys exactly and stays between neighbours', () => {
  const keys = [
    [0, [0, 10]],
    [0.5, [1, 20]],
    [1, [2, 30]],
  ];
  const out = [];
  assert.deepEqual(sampleKeys(keys, 0.5, out), [1, 20]);
  sampleKeys(keys, 0.75, out);
  assert.ok(out[0] > 1 && out[0] < 2 && out[1] > 20 && out[1] < 30);
  assert.deepEqual(sampleKeys(keys, 5, out), [2, 30]);
});
