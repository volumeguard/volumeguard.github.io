import type { DemoSound } from '../core/sound';
import { PERIOD, appliedGain, envelope, transient } from '../model/signal';

/**
 * A made-up soundtrack, synthesised on the device (nothing is downloaded): murmured "dialogue",
 * a loud song and an action burst follow the same envelope the 3D scenes draw. Volume Guard's
 * gain curve is applied on top, so turning levelling up audibly evens it out.
 */
const MASTER = 0.16; // kept low on purpose: the visitor did not choose a volume yet
const SPEED = 0.9; // envelope units per second, matches the visuals
const TICK_MS = 50;
const SMOOTH = 0.08; // seconds, gain glide time

export function startDemo(): DemoSound {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = MASTER;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;
  const leveller = ctx.createGain();
  leveller.connect(master).connect(limiter).connect(ctx.destination);

  // Dialogue: a soft, vowel-like tone whose loudness pulses like syllables.
  const voice = ctx.createOscillator();
  voice.type = 'triangle';
  voice.frequency.value = 196;
  const voiceFilter = ctx.createBiquadFilter();
  voiceFilter.type = 'bandpass';
  voiceFilter.frequency.value = 700;
  voiceFilter.Q.value = 1.2;
  const voiceGain = ctx.createGain();
  voice.connect(voiceFilter).connect(voiceGain).connect(leveller);

  // Song: a warm chord.
  const chordGain = ctx.createGain();
  const chordFilter = ctx.createBiquadFilter();
  chordFilter.type = 'lowpass';
  chordFilter.frequency.value = 1400;
  chordFilter.connect(chordGain).connect(leveller);
  const chord = [220, 277.18, 329.63, 440].map((frequency) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = frequency;
    osc.connect(chordFilter);
    return osc;
  });

  // Action: filtered noise for blasts and the sharp crack.
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 900;
  const noiseGain = ctx.createGain();
  noise.connect(noiseFilter).connect(noiseGain).connect(leveller);

  for (const node of [voice, noise, ...chord]) node.start();
  for (const gain of [voiceGain, chordGain, noiseGain]) gain.gain.value = 0;

  let levelling = 1;
  const started = ctx.currentTime;
  const tick = (): void => {
    const now = ctx.currentTime;
    const u = (now - started) * SPEED;
    const phase = ((u % PERIOD) + PERIOD) % PERIOD;
    const loudness = envelope(u);
    const loud = Math.min(1, Math.max(0, (loudness - 0.4) / 0.8));
    const syllable = 0.55 + 0.45 * Math.abs(Math.sin(now * 7.3) * Math.sin(now * 2.1 + 1));
    const songPart = phase > 10 && phase < 13 ? 1 : 0; // the loud song; the other loud part is action
    voiceGain.gain.setTargetAtTime((1 - loud) * loudness * 1.6 * syllable, now, SMOOTH);
    chordGain.gain.setTargetAtTime(loud * songPart * loudness * 0.22, now, SMOOTH);
    noiseGain.gain.setTargetAtTime(loud * (1 - songPart) * loudness * 0.9 + transient(u) * 1.4, now, 0.02);
    leveller.gain.setTargetAtTime(appliedGain(u, levelling), now, SMOOTH);
  };
  const timer = window.setInterval(tick, TICK_MS);
  tick();

  return {
    setLevelling(amount: number) {
      levelling = Math.min(1, Math.max(0, amount));
    },
    stop() {
      clearInterval(timer);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      window.setTimeout(() => void ctx.close(), 250);
    },
  };
}
