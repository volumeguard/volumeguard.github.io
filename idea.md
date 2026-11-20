# Prompt: Volume Guard scroll-reveal website (Three.js)

## Skills to use first (not installed yet)

Install and read these before designing. Prefer the first three; the rest are optional references.

```
npx skills add https://github.com/cloudai-x/threejs-skills --skill threejs-fundamentals
npx skills add https://github.com/cloudai-x/threejs-skills --skill threejs-animation
npx skills add https://github.com/cloudai-x/threejs-skills --skill threejs-geometry
```

Optional: scottstts/Threejs-Awesome-Graphics-Agent-Skills, dgreenheck/webgpu-claude-skill, azakhary/nixie-fx, AftabIbrahimKazi/ai-dev-kit, majidmanzarpour/threejs-game-skills.

Also use the Firebase skills (firebase-hosting-basics) for deployment.

## Goal

Build the Volume Guard website as a **scroll-driven Three.js story**. As the visitor scrolls, one continuous 3D scene changes to explain, in order, why the extension exists and how it works. It must make a non-technical visitor understand the product in under a minute, and end with a clear way to get it.

Plan the design first (scenes, scroll timeline, performance budget) and show it to me. Then build.

## Context (read these, do not duplicate them)

- Product brief: `C:\20300\github\volconex\idea.md`
- Name, copy, links, brand, privacy summary: `C:\20300\github\volconex\identity.md`
- Visual language and tokens: `C:\20300\github\volconex\stitchdesign.md`
- Logo: `C:\20300\github\volconex\volumeguard_logo.png`
- Current static site to replace or extend: `webpage/public/` (index, privacy, 404, style.css)

Tone: calm, confident, plain language. Tagline: **Set it once. Watch in peace.**

## Story, one scene per scroll section

1. **The problem.** A flat, glowing target line. A calm waveform (dialogue) drifts in, then a huge spike (explosion/song) blows past the line and the scene visibly "shouts". Copy: you keep reaching for the volume control.
2. **You pick a level.** The target line becomes a dial or ring the visitor can see being set once. Mention the Night, Normal and Cinema presets.
3. **It listens.** The waveform flows through a measuring ring. Show that measuring happens many times a second, on the device.
4. **It evens things out.** Loud peaks are pulled down to the line (amber to teal), quiet parts are lifted. The waveform settles into a steady band. This is the hero moment.
5. **Safe and in your control.** Boost cap, limiter, one-click bypass, per-site on/off, Alt+Shift+V.
6. **Private by design.** Everything stays inside a closed shape: no accounts, no analytics, no network requests. Link to `/privacy`.
7. **Get Volume Guard.** Honest status: not in the Chrome Web Store yet; link to the source on GitHub. Short FAQ below, including the protected-streams (compatibility mode) caveat.

Colour carries meaning, so keep it consistent: violet `#7C5CFF` brand, teal `#2DD4BF` on target, amber `#FFB020` too loud, background `#111317`. Reference for mood and layout: https://dark-moon.org/ (dark, cinematic, scroll-led). Take the feel, not the content or assets.

## Requirements

- **Scroll reveal is required.** Drive the scene from scroll progress (one pinned canvas plus scroll sections, with eased camera, object and colour changes). Text sections reveal as they enter.
- **Mobile first.** Works at 360 px wide and up, with touch scrolling, no horizontal scroll and 44 px minimum tap targets. Lower the particle count and pixel ratio on small or slow devices.
- **Accessibility.** Under `prefers-reduced-motion`, or if WebGL is unavailable, show a static version that tells the same story (illustrations or a few still frames). All text must be real HTML, readable without JavaScript. Keep contrast and focus states, plus a skip link.
- **Performance.** Cap devicePixelRatio at 2, pause rendering when the tab is hidden or the canvas is off screen, avoid per-frame allocations, dispose geometry and materials. Target 60 fps on a mid-range phone, a Lighthouse performance score of 90 or more, and a JS budget stated in the plan.
- **Dependencies.** Bundle Three.js locally (no CDN) with an exact pinned version. Plain HTML, CSS and a small build step are fine; no framework unless the plan justifies it.
- **Privacy must stay true.** No analytics, cookies, trackers or third-party requests. This site promises "no tracking", so do not break it.
- **Security headers.** `webpage/firebase.json` currently sets `script-src 'none'`. Relax it only as far as needed (`script-src 'self'`, plus `worker-src` or `blob:` only if truly required), keep the other headers, and verify the live headers after deploy.
- **Keep what already works:** `/privacy`, the 404 page, favicons, clean URLs, and the honest "not in the store yet" status.
- **Code conventions:** TypeScript or well-typed modules, small single-purpose files, no unexplained magic numbers (name the scene constants), and comments only for the why.

## Deliverables

1. A short design plan: scene list, scroll timeline (progress ranges), camera path, colour mapping, asset and performance budget, and the fallback design.
2. The implemented site in `webpage/`, with the build step documented in `webpage/README.md`.
3. Verification: desktop and 390 px screenshots at several scroll positions, a reduced-motion check, a Lighthouse run, and no console errors.
4. Deploy to both Firebase Hosting sites in project `teamvolumeguard` (`volumeguard` and `teamvolumeguard`) with `npx -y firebase-tools@latest deploy --only hosting --project teamvolumeguard`, then confirm the live headers with curl.

Do not commit anything unless asked.
