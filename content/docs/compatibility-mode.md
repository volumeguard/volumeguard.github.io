---
title: Compatibility mode
description: An experimental way to level copy-protected and cross-origin video by processing the whole tab's audio.
order: 5
group: Guide
---

# Compatibility mode

Some videos cannot be adjusted the normal way. Streaming services protect their video, and some sites serve it from another domain without permission to read its sound. In those cases Volume Guard leaves the video exactly as it is and offers **Compatibility mode** instead.

> **Experimental.** Compatibility mode's levelling is covered by automated tests, but Chrome's real tab-capture handoff and its behaviour on real protected sites (such as Netflix, Prime Video, Disney+ and Hotstar) have **not yet been verified**. Please report what you find on the [issues page](https://github.com/masumhasan/volcon/issues).

## When you will see it

The Compatibility mode card appears in the popup only when the page's video is blocked. The status line explains why:

| Status | Meaning |
| --- | --- |
| This video is copy-protected… | The video uses DRM. |
| This site blocks access to the video's audio… | The video comes from another domain without CORS permission. |
| The page already controls this video's audio… | The site is already routing the sound itself. |

In all three cases playback is untouched until you choose otherwise.

## Turning it on

1. Press play on the video.
2. Open the popup and choose **Turn on** in the Compatibility mode card.
3. The first time, your browser asks for two extra permissions. Volume Guard requests them only now, not at install.

While it is on, the popup says "On: this tab's audio is being levelled." Turning it off, closing the tab or reloading the page stops it and restores normal sound.

## How it differs from the normal mode

| | Normal mode | Compatibility mode |
| --- | --- | --- |
| What it processes | Each video element on its own | The whole tab's audio |
| Extra permissions | None | `tabCapture` and `offscreen`, asked when you turn it on |
| Delay | None | May add a small delay to the sound |
| Works with protected video | No (leaves it untouched) | Intended to, not yet verified |

## Trade-offs to know about

- **A small delay.** While a tab is captured, Chrome mutes it and Volume Guard plays back the levelled copy. This can put the sound slightly behind the picture. If lips and voices drift apart, turn it off.
- **Everything in the tab is levelled,** including other sounds the page plays.
- **Do not combine** it with the normal mode on a page that is already being levelled.

## Privacy

The captured audio stays in memory on your device, is played back to you, and is never recorded, stored or sent anywhere. See [Privacy and permissions](/docs/privacy-and-permissions).

## Technical detail

The service worker obtains a tab-capture stream id, an offscreen document redeems it with `getUserMedia` and feeds the `MediaStream` into the same audio engine the normal mode uses. The offscreen document has no access to `chrome.storage`, so the service worker pushes your settings to it. Status reaches the popup over a port per tab, in the same shape the content script uses, so the popup shows the same meters and status line.
