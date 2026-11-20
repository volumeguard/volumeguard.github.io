---
title: Changelog
description: What changed in each version of Volume Guard.
order: 8
group: Project
---

# Changelog

Notable changes to the extension. Versions follow Semantic Versioning.

## 0.1.0 (unreleased)

The first working version, for Chrome and Edge.

### Added

- Dynamic loudness levelling: K-weighted momentary measurement, a controller that pulls loud scenes down fast and lifts quiet ones slowly, a dead band, slew limits, boost and reduction caps, and an output limiter.
- A content script that finds media (including in iframes and shadow DOM), tracks each element, and leaves protected or cross-origin media untouched.
- The popup: target dial, presets, live meters, status line, "Always on for this site" and pause for 15 minutes.
- The settings page: reaction speed, boost and reduction limits, limiter, theme, site list and keyboard shortcut.
- A shortcut to turn it on or off (<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>), plus dark and light themes.
- Compatibility mode (experimental): levels a blocked tab's audio with tab capture and an offscreen document, behind optional permissions, offered only when a page is blocked.
- A manual QA and listening-test guide.
- Unit tests, and end-to-end tests that measure real audio levelling in Chromium.

### Not built yet

- Firefox and Safari.
- An in-page widget, an onboarding flow and an A/B compare.
- Dialogue-aware boosting.
- A store listing.
