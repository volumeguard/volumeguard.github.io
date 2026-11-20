---
title: How it works
description: How Volume Guard measures loudness and decides how much to turn the sound up or down.
order: 3
group: Guide
---

# How it works

Volume Guard listens to the video while it plays, many times a second, and compares how loud it is with the level you chose. If it is louder, it turns the sound down. If it is quieter, it turns it up a little. That is all it does: it never changes the movie itself, only how loud it plays.

## The idea in plain words

1. **You choose a target.** The dial goes from 20 to 100 percent. Normal sits at 68 percent.
2. **It measures.** About 20 times a second it checks how loud the last moment of sound was, weighted the way human hearing works.
3. **It corrects, gently.** Loud scenes are pulled down quickly so a blast never lingers. Quiet scenes are lifted slowly so you do not hear the volume "breathe".
4. **It stays safe.** Boost is capped, a limiter catches sudden peaks, and silence is never turned up.

## Why loud scenes come down fast and quiet ones come up slowly

A sudden loud scene is uncomfortable, so the correction reacts within a fraction of a second. Lifting quiet scenes too quickly would make background hiss pump up and down between words, so it rises more slowly. You can change this balance with the **Reaction speed** setting.

## What it cannot do

- **No look-ahead.** Volume Guard cannot hear the future without delaying the sound, which would put it out of sync with the picture. The very first moment of a sudden loud cut (roughly 100 to 200 milliseconds) passes through; the limiter keeps that peak in check.
- **Copy-protected video.** Browsers do not let extensions read the audio of protected (DRM) or cross-origin video. Volume Guard detects this and leaves playback untouched. See [Compatibility mode](/docs/compatibility-mode).

## Technical detail

### Signal path

A content script finds `<video>` and `<audio>` elements, including those in iframes and shadow DOM. When one is genuinely playing and passes a safety check, it is routed through a Web Audio graph:

| Stage | What it does |
| --- | --- |
| Source | `MediaElementAudioSourceNode` for the video element |
| Measurement | Two biquad filters approximate the K-weighting of ITU-R BS.1770, then an `AnalyserNode` |
| Gain | A `GainNode` driven by the controller |
| Limiter | A `DynamicsCompressorNode` set up as a peak limiter |
| Output | The page's normal audio output |

Bypass and pause restore the untouched signal path.

### Measurement

- Momentary loudness over a **400 ms** window, as in EBU R128.
- Measured every **50 ms** (about 20 Hz) with a timer, not an `AudioWorklet`, because a page's Content Security Policy can block worklet modules.
- Windows quieter than **−60 LUFS** count as silence and are never boosted.

### The controller

| Rule | Value |
| --- | --- |
| Dead band (changes smaller than this are ignored) | 1 dB |
| Fastest the gain may fall | 60 dB per second |
| Fastest the gain may rise | 8 dB per second |
| Attack time (reaction speed smooth → instant) | 250 ms → 50 ms |
| Release time (reaction speed smooth → instant) | 3000 ms → 600 ms |
| Maximum boost | set per preset, hard limit +12 dB |
| Maximum reduction | set per preset, hard limit −30 dB |

### Target mapping

The dial maps linearly to a loudness target: **68 % = −14 LUFS**, and each percent moves the target by 0.25 LU. So 20 % is −26 LUFS and 100 % is −6 LUFS. The correction is applied on top of the player's own volume, so the player's controls keep working.

### Known limits

- Stereo is measured after a mono down-mix, which can read uncorrelated stereo up to about 3 dB low. Because the loop is relative, this shifts where "target" sits, not how it behaves.
- The shared `AudioContext` is never suspended: once a video is attached, its sound only flows while the context runs.
