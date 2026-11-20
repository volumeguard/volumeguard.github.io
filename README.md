# Volume Guard website

The website for **Volume Guard**, a browser extension that keeps movie and TV volume at the level you choose: it lowers loud songs and action scenes and lifts quiet dialogue.

**Live:** https://volumeguard.web.app (also https://teamvolumeguard.web.app) · **Extension source:** https://github.com/masumhasan/volcon

## Quick start

```bash
npm install
npm run dev      # http://localhost:8000, rebuilds and reloads on change
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Builds the site, watches `src/`, `content/` and `static/`, serves `dist/` with clean URLs and live reload. |
| `npm run build` | Production build into `dist/` (minified, hashed assets, sitemap, robots, docs search index). |
| `npm run check` | Type-check, unit tests, build, then `check:dist`. Run before every deploy. |
| `npm run check:dist` | Fails on third-party resources, inline scripts or styles (blocked by the CSP), images without alt or size, and broken internal links. |
| `npm run preview` | Builds and serves `dist/` with the Firebase Hosting emulator (production headers). |

## Pages

| Route | Source | What it is |
| --- | --- | --- |
| `/` | `src/pages/index.html`, `src/scripts/pages/home.ts`, `src/scripts/three/road.ts` | The story: a 3D soundtrack road; the guard orb levels it as you scroll. |
| `/scenes` | `src/pages/scenes.html`, `src/scripts/three/turntable.ts` | The Song, the Blast and the Whisper on a turntable, with before/after. |
| `/toolbox` | `src/pages/toolbox.html`, `src/scripts/three/board.ts` | Every control as a part you can try. |
| `/docs/*` | `content/docs/*.md` | Documentation, rendered at build time, with offline search. |
| `/faq`, `/support`, `/privacy`, `/terms`, `/404` | `src/pages/*.html` | Prose pages. |

## How it is built

- **No framework.** Static HTML pages with shared partials (`src/partials/`), one TypeScript entry per page type (`src/scripts/pages/`), bundled by esbuild with code splitting and content hashes. `scripts/build.mjs` is the whole pipeline; `scripts/dev.mjs` is the dev server.
- **Templates.** Each page starts with a `<!--meta {json} -->` header (`title`, `description`, `path`, `entry`, optional `body`, `nav`, `noindex`, `themeColor`). `{{> name}}` includes a partial, `{{key}}` inserts an escaped value. Unknown keys fail the build.
- **Docs.** Markdown with front matter (`title`, `description`, `order`, `group`). Headings get anchors and feed the "On this page" list and the search index. Images must be local PNG or WebP; their size is read from the file.
- **Motion system** (`src/scripts/core/`): loader curtain, split-text headings, scroll reveals, Lenis smooth scrolling (mouse only), custom cursor, magnetic buttons, header behaviour and menu, and the target-ring page transition. Reduced motion turns all of it off and shows still frames.
- **3D** (`src/scripts/three/`): `stage.ts` owns the renderer, loop (`setAnimationLoop` + `Timer`), adaptive pixel ratio, pause when hidden or covered, and disposal. Scenes are instanced and allocation-free per frame. Without WebGL the page shows a poster image.
- **Model** (`src/scripts/model/`): the leveller maths (`signal.ts`) and the story mapping (`story.ts`) are pure and unit tested (`tests/`).
- **Sound demo** (`src/scripts/audio/demo.ts`): optional, never autoplays, synthesised with Web Audio on the device and levelled by the same maths.

## Privacy and security

The site makes no third-party requests: fonts (Geist, via `@fontsource-variable`), Three.js and Lenis are bundled. No analytics, cookies or trackers. `firebase.json` sets a strict Content-Security-Policy (`script-src 'self'`, no inline scripts or styles), HSTS, `nosniff`, a referrer policy and a permissions policy; `npm run check:dist` keeps the markup compatible with it. Contact is via GitHub issues; no email address is published.

## Images

Everything under `static/img` is generated from our own work:

```bash
# Popup screenshots: real extension popup with live meters (needs ../volcon built and its Playwright)
node scripts/assets/popup-shots.cjs <tmp>/popup
python scripts/assets/pad-popups.py <tmp>/popup static/img/popup

# Scene postcards, poster, social card and app icons, rendered from the home road (dev server running)
node scripts/assets/scene-shots.cjs <tmp>/scenes
python scripts/assets/compose.py <tmp> static/img ../volumeguard_logo.png
```

## Deploy (Firebase Hosting)

Project `teamvolumeguard`, two sites with the same settings: `volumeguard` and `teamvolumeguard`.

```bash
npm run check
npx -y firebase-tools@latest deploy --only hosting --project teamvolumeguard
curl -sI https://volumeguard.web.app/ | grep -i content-security-policy
```

`firebase.json` runs `npm run build` before every deploy and serves `dist/`.

## Design

The layout, type scale and motion follow the design plan in [docs/design-plan.md](docs/design-plan.md), measured from an offline reference in `ui_reference/` that is used for study only; none of its code, text or assets are shipped.

## Author

Nur Hasan Masum, https://masumhasan.github.io
