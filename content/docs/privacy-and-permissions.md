---
title: Privacy and permissions
description: Every permission Volume Guard asks for, why it needs it, and what it stores.
order: 6
group: Guide
---

# Privacy and permissions

Volume Guard analyses the sound of the videos you watch, on your device only. It has no account, no analytics, no advertising and makes no network requests at all. Audio is measured in memory and thrown away; it is never recorded, stored or sent anywhere.

## Permissions

| Permission | When | Why |
| --- | --- | --- |
| `storage` | At install | Saves your settings and your list of sites. |
| `activeTab` | At install | Lets the popup work on the tab you are looking at, only after you open it. |
| `scripting` | At install | Starts the levelling script on that tab. |
| Access to one site (`http://` or `https://`) | Only when you turn on **Always on for this site** | Lets Volume Guard start by itself on that site. Requested per site. |
| `tabCapture` and `offscreen` | Only when you turn on [Compatibility mode](/docs/compatibility-mode) | Captures and levels a blocked tab's audio. |

Optional permissions are requested from a click in the popup, never in the background, and can be removed at any time from the settings page or your browser's extension settings.

## What is stored

- Your settings: target volume, preset, boost and reduction limits, reaction speed, limiter strength and theme.
- The hostnames of sites where you turned on "Always on" (for example `www.youtube.com`), with an on or off flag.

Everything is kept in your browser's extension storage. If you use your browser's sync, the browser may copy these settings to your other devices.

## What is never collected

- The audio itself.
- Page content, video titles or your browsing history.
- Any identifier, usage statistics or crash reports.

A site's hostname is used only to apply your per-site choice.

## How it is kept safe

- The extension's own pages use a strict Content Security Policy (`script-src 'self'`): no remote code, no `eval`.
- The levelling script runs in the browser's isolated world and exposes nothing to the page.
- Every message between the extension's parts, and every stored setting, is validated; unknown fields are dropped and numbers are clamped.
- Video that cannot be processed safely (DRM, cross-origin without CORS, or already claimed by the page) is detected **before** anything is attached, so playback is never muted or altered by mistake.
- Boost is capped (+6 dB by default, +12 dB at most), the output limiter is always on, and bypass restores the original sound.
- The extension has no runtime dependencies.

## This website

This site does not use cookies, analytics or tracking scripts and loads nothing from other servers. The optional Sound demo is generated in your browser. See the [privacy policy](/privacy).

## Reporting a security problem

Please do not post security issues publicly. A private contact address will be added before the first public release; until then, open an issue on [GitHub](https://github.com/masumhasan/volcon/issues) asking for a private contact, without details of the problem.
