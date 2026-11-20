---
title: Getting started
description: Build Volume Guard from source, load it in Chrome or Edge, and set your level.
order: 2
group: Start here
---

# Getting started

Volume Guard is not in the Chrome Web Store yet, so for now you build it from the source code and load it into your browser yourself. It takes about five minutes and you only do it once.

## What you need

- Chrome or Microsoft Edge, version 114 or newer.
- [Node.js](https://nodejs.org/) 22 or newer.
- [Git](https://git-scm.com/), or the ability to download a ZIP from GitHub.

## 1. Get the code and build it

```bash
git clone https://github.com/masumhasan/volcon.git
cd volcon
npm install
npm run build
```

The build writes the finished extension into a folder called `dist/`.

> On Windows, run these commands from PowerShell or a standard terminal.

## 2. Load it into your browser

1. Open `chrome://extensions` (in Edge: `edge://extensions`).
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `dist/` folder.
4. Pin the Volume Guard icon to the toolbar so it is easy to reach.

## 3. Set your level

1. Open a page with a video and press play.
2. Click the Volume Guard icon. The popup opens.
3. Turn the dial (or use the slider) to the level you want, or pick **Night**, **Normal** or **Cinema**.

![The Volume Guard popup with the Normal preset: a target dial at 68 percent, live meters for incoming and balanced sound, and preset buttons](/img/popup/popup-normal.webp)

The status line tells you what is happening right now: **On target**, **Taming a loud scene**, **Lifting a quiet scene** or **Waiting for sound**. The two meters show the sound coming in and the balanced sound going out.

## 4. Keep it on for a site

By default Volume Guard runs on the tab where you opened the popup. To have it start by itself every time you visit a site, turn on **Always on for this site** in the popup. Your browser asks for permission for that one site only. You can remove it again in the settings page.

## Everyday controls

| Control | What it does |
| --- | --- |
| Master switch (top of the popup) | Turns Volume Guard on or off everywhere |
| **Pause for 15 min** | Leaves the sound untouched for 15 minutes, then resumes |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> | Turns it on or off from any page (you can change the shortcut) |
| Settings (slider icon) | Reaction speed, boost and reduction limits, limiter, theme and your site list |

![The popup while paused for 15 minutes](/img/popup/popup-paused.webp)

## If a video is copy-protected

Some streaming sites protect their video so that no extension can adjust it directly. Volume Guard notices this before it touches anything and leaves the sound exactly as it was. The popup then offers [Compatibility mode](/docs/compatibility-mode), which is experimental.

## Updating

Pull the latest code, build again and press the reload button on the Volume Guard card in `chrome://extensions`:

```bash
git pull
npm install
npm run build
```
