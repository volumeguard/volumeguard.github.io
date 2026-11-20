---
title: Development
description: How the extension's code is organised, how to build and test it, and how to contribute.
order: 7
group: Project
---

# Development

Volume Guard is open source and written in TypeScript with no runtime dependencies. This page is for people who want to read the code, change it or help test it.

## Commands

Run these in the `volcon` repository. Node.js 22 or newer is required.

```bash
npm install
npm run build        # production bundle in dist/
npm run dev          # rebuild on change, then reload the extension
npm run check        # typecheck, lint, format check, unit tests and build
npm test             # unit tests (Vitest)
npm run e2e          # end-to-end tests (Playwright and Chromium), needs a build first
npm run package      # zip dist/ for a store upload
```

The first time you run the end-to-end tests, install the browser with `npx playwright install chromium`.

> **Windows:** use PowerShell or a standard terminal. Vitest fails under Git Bash because of path conversion.

## Project layout

| Path | What lives there |
| --- | --- |
| `src/dsp/` | Pure loudness maths and the gain controller (no DOM, no Web Audio) |
| `src/audio/` | The Web Audio graph shared by both processing paths |
| `src/content/` | Page script: media discovery, safety pre-check, per-element state machine |
| `src/background/` | Service worker: injection, per-site registration, shortcut, compatibility mode control |
| `src/offscreen/` | Compatibility mode: tab-capture sessions |
| `src/ui/` | Popup and settings pages |
| `src/shared/` | Settings, message validation, storage access, translations |
| `public/` | Manifest, HTML, CSS, icons and `_locales`, copied into `dist/` |
| `tests/unit`, `tests/e2e` | Vitest unit tests and Playwright end-to-end tests |

## Architecture decisions

| # | Decision | Reason |
| --- | --- | --- |
| D1 | Chrome and Edge, Manifest V3 first | One codebase, largest audience. Firefox later. |
| D2 | A content script routes each media element through Web Audio | No capture permission, per-element control, works offline. |
| D3 | TypeScript strict, esbuild, Vitest, Playwright | Typed messaging, fast builds, real-browser tests. |
| D4 | Plain TypeScript popup and settings with static HTML and CSS | No framework, small bundles. |
| D5 | Target slider maps linearly to a loudness target | Keeps the player's own controls working. |
| D6 | Zero runtime dependencies | Smaller supply-chain risk. |
| D7 | 50 ms timer plus `AnalyserNode` instead of an `AudioWorklet` | A page's CSP can block worklet modules. |
| D8 | Compatibility mode via `tabCapture` and an offscreen document, behind optional permissions | The only way to level protected audio; optional so installs show no capture warning. |

## Tests

- **Unit tests** cover the loudness maths, the controller, message and settings validation, the media safety check and the popup's view logic.
- **End-to-end tests** run the real built content script in Chromium with a synthetic quiet, loud, quiet sound file and measure the level after the limiter. They also check that protected and cross-origin media is never attached, that the popup and settings pages load without errors, and that compatibility mode's audio session levels a real media stream.
- Chrome's real tab-capture handoff cannot be automated.

## Manual listening test

Automated tests prove the maths and the safety behaviour. They cannot tell whether it **sounds right** on real films. Before each release, load the build, use headphones at a fixed volume, start on **Normal**, and listen to clips you own or can stream legally:

| Clip | What it stresses |
| --- | --- |
| Whispered dialogue, then a sudden gunshot or explosion | Attack speed, the first moment, the limiter |
| A song with a loud chorus after quiet dialogue | Pulling a long loud section down without squashing it |
| Quiet dialogue with room noise | Whether boosting lifts hiss |
| Alternating loud and quiet every few seconds | Pumping, natural release |
| Long calm dialogue (10 minutes or more) | Stability |
| Sudden silence, then dialogue | Silence is not boosted, clean resume |

Listen for pumping, squashed music, the first-moment slam, lifted hiss, lip-sync drift (especially in compatibility mode) and clicks when the gain changes.

## Conventions

- Strict TypeScript: no `any`, no non-null assertions, no default exports, no `innerHTML` assignments.
- Every user-visible string goes through the browser's translation files.
- Files in kebab-case, units in names (`attackMs`, `gainDb`, `targetLufs`).
- Commit messages follow Conventional Commits.

## Contributing

Bug reports and ideas are welcome on the [issues page](https://github.com/masumhasan/volcon/issues). The licence has not been chosen yet; until it is, please open an issue before sending a large change.
