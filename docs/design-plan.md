# Design plan: Volume Guard website (v2)

This plan replaces the first scroll-story design. Nothing from that design is kept except the three Three.js skills (`threejs-fundamentals`, `threejs-animation`, `threejs-geometry`, in `.claude/skills`) and the pure waveform model `src/signal.ts` with its tests, because it is our own leveller maths and drives the demos.

Sources: story and voice from [../../idea.md](../../idea.md) and [../../identity.md](../../identity.md); layout, type, spacing and motion from the offline reference in [../ui_reference/](../ui_reference/) (the Tinkeroll site by Layer Native).

---

## 0. Ground rules

### 0.1 How the reference is used (important)

The reference is another company's published product site. We match its **design system and motion** (layout, type scale, spacing, grid, section rhythm, easing curves and timings, interaction patterns) closely enough to be pixel-close, but we **write all code, copy, art, audio and icons ourselves**.

| From the reference | We do |
| --- | --- |
| Layout, type scale, spacing, colours of neutrals, radii | Reproduce by measurement (section 9). |
| Motion values (durations, easings, lerp, thresholds) | Reuse the numbers as a spec, write our own implementation. |
| HTML, CSS, JS files | Read for understanding only. Do not copy or ship them. |
| Images, icons, `og.jpg`, audio (`.m4a`), app-store links | Never shipped. We generate our own (section 7). |
| Names and copy (Tinkeroll, Layer Native, game text) | Replaced by our story (section 3). |
| Awwwards badge, Cloudflare challenge script, JSON-LD, Google Fonts links | Dropped. No third-party requests. |

Reason: shipping their files or branding would copy another company's work and break our own "no third-party requests, no tracking" promise. The reference mirror is also incomplete (`vendor/three` is missing, so its 3D scene cannot run offline), so the 3D must be rebuilt anyway.

### 0.2 Non-negotiables carried over from the product

- No analytics, cookies, trackers or third-party requests. Fonts, Three.js and Lenis are bundled locally.
- Honest status everywhere: **not in the Chrome Web Store yet**; protected streams are experimental. No fake testimonials, ratings, user counts or store badges.
- Strict CSP stays (`script-src 'self'`, no inline script or style attributes).
- Every animation has a still fallback (reduced motion, no WebGL, slow phones). All text is real HTML.
- `npm run dev` starts everything; `npm run build` produces the deployable site.

---

## 1. Decisions I made (change any of them before build)

| # | Decision | Default | Alternative |
| --- | --- | --- | --- |
| D1 | Accent colour | Brand violet `#5B3FE0` on paper (text), `#7C5CFF` fills. Amber = too loud, teal = on target, as in the extension. | Reference terracotta `#D9663F` for exact pixel match. |
| D2 | Neutrals and fonts | Reference-style warm paper `#F3EFE7`, ink `#15130F`, grain overlay, **Geist** and **Geist Mono** (open-source, bundled via npm). | Keep our dark-first extension look. |
| D3 | Sound | A **Sound** toggle, off by default, plays a **synthesised** demo (Web Audio, no files) that really levels a made-up soundtrack. Never autoplays. | No audio at all. |
| D4 | Contact | GitHub issues page only. The author email is **not** published. | Add a public contact email. |
| D5 | Terms page | Plain "as is" terms, licence line marked "to be decided". Needs your decision and ideally a legal read. | Wait until a licence is chosen. |
| D6 | Build output | Source in `src/`, generated site in `dist/`, `firebase.json` serves `dist/` (the old `public/` is removed after migration). | Keep `public/`. |

---

## 2. Site map and page renaming

The reference has five pages. Each is renamed and re-purposed for Volume Guard; we add the pages you asked for.

| Route | From reference | Purpose |
| --- | --- | --- |
| `/` | Home (3D road, scroll story) | Our story as one scroll: the soundtrack road. |
| `/scenes` | Worlds (turntable of three dioramas) | "Pick a scene": The Song, The Blast, The Whisper, each with before/after. |
| `/toolbox` | Parts box (playable board) | Every control as a part you can play with: target dial, leveller, limiter, boost cap, bypass, pause, per-site, compatibility mode. |
| `/docs` + `/docs/*` | New | Project documentation (section 6). |
| `/faq` | FAQ block on home, promoted | Full FAQ page (accordion), plus a short teaser on home. |
| `/support` | Support | Troubleshooting and how to report a problem. |
| `/privacy` | Privacy | Extended policy (extension plus site). |
| `/terms` | New | Terms of use (D5). |
| `/404` | New | Not-found page in the same system. |

Shared on every page: loader curtain, page-transition iris, custom cursor, smooth scroll, header with menu, footer, Sound toggle. Pages are static HTML (multi-page site), not a single-page app, so Firebase clean URLs and deep links work.

---

## 3. Our story

Told from the founder's side (from idea.md): a lifelong movie fan, Bollywood and Hollywood, hand on the volume button during songs and fights, then squinting to hear the dialogue. The 3D scene is **the soundtrack as a road**; a glass **guard orb** (the logo's dial) rolls along it.

### 3.1 Metaphor map (reference mechanic to ours)

| Reference mechanic | Ours |
| --- | --- |
| Marble rolls along a tile road as you scroll | The guard orb rolls along a road built from soundtrack bars. Scroll = progress through the movie. |
| Missing tiles drop into place | Loud bars poke up and leveller plates press them to the target line; quiet bars are lifted by small risers. |
| Coins collected, HUD "00 / 12" | "Peaks tamed 00 / 12" counter. Each tamed spike pops and counts. |
| Worlds (Isles, Air Mail, Record Shop) | Scenes: The Song, The Blast, The Whisper. |
| Night section, tournament | **Night mode**: dark panel, stars, a live meter. |
| The hole at the end | The **line**: the road goes perfectly flat at the target. |
| Workshop editor | **Control room**: the real extension popup, animated. |
| Marble shop | **Pick your preset**: Night, Normal, Cinema, Your own. |

### 3.2 Home sections and copy

Copy is a first draft in plain language, no jargon in the main flow (dB and LUFS only in docs and FAQ).

| # | Section (reference class) | Headline | Content and 3D beat |
| --- | --- | --- | --- |
| 1 | Hero (`s-hero`, `mega`) | line 1 **Set it once.** line 2, right-aligned, **Watch in *peace.*** | Lede: "A browser extension that holds your movie volume at the level you chose. It lowers the blasts and lifts the whispers." Top labels: "A browser extension by Nur Hasan Masum" and "Chrome · Edge · Open source". Button: "Get Volume Guard". Scroll cue "Scroll to listen". 3D: orb sits at the start of the flat road. |
| 2 | How it works (`s-missing`, `how`) | Every movie is *too loud and too quiet.* | Card with three steps and line icons: **Pick your level** (dial icon), **Press play** (waveform icon), **Touch nothing** (hand icon). Leveller plates start dropping onto the road. The small extension popup peeks beside the card. |
| 3 | Scene one (`s-world w-left`) | The *Song* | "A dance number arrives and the volume jumps. You reach for the button." Tags: Songs, Dance numbers, Montages. Postcard of the Song scene. Link "Step inside the Song". |
| 4 | Scene two (`w-right`) | The *Blast* | "Hollywood action: a car chase, then an explosion, then you are deaf." Tags: Explosions, Gunfire, Score swells. |
| 5 | Scene three (`w-left`) | The *Whisper* | "Then two people talk quietly, and you lean towards the speaker." Tags: Dialogue, Whispers, Late night. Boost riser lifts quiet bars (capped). |
| 6 | Night (`s-tour`, dark) | One scene. *All night.* Nobody wakes. | Stars, deep-blue panel. A **live demo meter** (4 cells: Target, Incoming, Output, Gain) driven by `signal.ts`, clearly labelled "Demo". Rules ticker: "Lower fast · Lift slowly · Boost capped at 6 dB · Limiter catches peaks · Nothing leaves your device · No account · No analytics". |
| 7 | The line (`s-hole`) | That was *one* scene. | "Your movie has hundreds. Volume Guard handles every one." The road runs out flat and the orb rolls into the target ring. |
| 8 | Control room (`workshop`) | Two taps. *That is the whole app.* | The real popup UI (section 5) in a browser frame; target dial, presets and meters animate on scroll. Check list: "Per-site on and off", "Pause for 15 minutes", "Bypass in one click". Key caps: Alt, Shift, V. |
| 9 | Presets (`marbles`) | Pick your *level.* | A horizontal run of four rolling knobs, spin tied to scroll: **Night**, **Normal**, **Cinema**, **Your own**. Each has its real numbers (target, boost, reduction). |
| 10 | FAQ teaser (`faq`) | Questions, *answered.* | Five questions, link "All questions". |
| 11 | Outro (`outro`) | Set it *once.* | Button "Get Volume Guard". Label "Chrome & Edge · Open source · Not in the Chrome Web Store yet". Link to source. |

### 3.3 Header and footer

- Header links: Scenes, Toolbox, Docs, FAQ. Right side: a live pill "v0.1.0 · Open source", the Sound toggle, button "Get it", and a menu button on mobile.
- Footer: "© 2026 Volume Guard", links Docs, FAQ, Support, Privacy, Terms, Source (GitHub), Made by Nur Hasan Masum. No email address (D4).

### 3.4 Where the extension popup appears

The real popup design (dark card, dial, presets, meters, status line, Pause and Bypass buttons) is rebuilt as an HTML component and reused:

1. Home step card (small peek).
2. Home **Control room** (large, animated).
3. Home **Presets** (popup state changes with each knob).
4. `/toolbox` hero (interactive: drag the dial and the 3D board reacts).
5. `/docs/getting-started` and `/docs/presets-and-settings` (static screenshots of each state).
6. `/faq` ("What does it look like?").

The popup component is built from the extension's own tokens and markup (`volcon/public/popup.html` and `popup.css`), so it cannot drift from the real product.

---

## 4. Page designs

### 4.1 Home `/` (the soundtrack road)

One fixed WebGL canvas behind the page, as in the reference. Scroll progress `p` (0 to 1) comes from anchors on sections (`data-t`), interpolated, and drives the orb's position on a curve, the camera, the sky colour and the plates.

3D build, using the skills:
- **Fundamentals:** `WebGLRenderer` (ACES tone mapping, no shadows on small screens, antialias off on small), `Fog`, `PerspectiveCamera`, `PMREM` room environment for glass, resize and dispose handling, pause when covered or hidden.
- **Geometry:** road tiles and risers as `InstancedMesh` of rounded boxes (`RoundedBoxGeometry`); stars as `Points`; target ring as `TorusGeometry`; the orb as a glass `SphereGeometry` (`MeshPhysicalMaterial`, transmission) with a violet core and teal ring (the logo's dial).
- **Animation:** the road is a `CatmullRomCurve3`; orb position and rotation follow `p`; plates drop with eased procedural motion (spring, not keyframes) when the orb is near; camera keyframes per section; everything is a pure function of scroll so scrolling back rewinds.

Camera and sky per section (violet-blue dawn at the start, warm for the Song, hot for the Blast, soft blue for the Whisper, deep night for Night, near-white at the line).

### 4.2 `/scenes` (turntable)

Three dioramas on a rotating turntable; scrolling rotates the table. The first and last frames pull back to show all three, with the text on the left and the stage on the right.

| Chapter | Diorama | Before / after |
| --- | --- | --- |
| The Song | A circular dance floor of pulsing bar rings. | Raw vs levelled mini-meter plus one sentence. |
| The Blast | A city block of tall spikes; one shockwave ring. | Raw vs levelled. |
| The Whisper | A small lamp-lit room; bars barely above the floor. | Raw vs levelled, with the boost cap shown. |

Each chapter card has a **Before / After drag handle** (the "split view" idea from idea.md). Postcard cards tilt to the pointer and flip on click (same behaviour class as the reference). The stage can be grabbed and turned, and springs back to the scroll position.

### 4.3 `/toolbox` (playable board)

A single tilted board, one chapter per part; the board flips between chapters to show each part's face.

| Part | What it demonstrates |
| --- | --- |
| Target dial | Drag the dial; the target lines move; the leveller follows. |
| Leveller | Attack and release: loud pulled down fast, quiet lifted slowly. |
| Boost cap | A whisper that stays below the line because boost is capped. |
| Limiter | The sudden "crack" is rounded off. |
| Bypass | One click: the road returns to raw. |
| Pause | 15 minute pause timer. |
| Per-site | Site list on and off. |
| Compatibility mode | Honest card: experimental, for protected streams, adds a small delay. |
| Shortcut | Alt+Shift+V key caps. |

HUD like the reference: "Parts tried 0 / 9" (saved in `localStorage`, optional). Pointer tilts the board toward the cursor. No gyro (not needed).

### 4.4 `/faq`, `/support`, `/privacy`, `/terms`

Prose pages in the reference's quiet layout (wide margins, mono eyebrow, numbered headings). `/faq`: accordion, grouped (Using it, Sites and limits, Privacy, Project). `/support`: troubleshooting steps (no change in volume, protected site, remove site access, reset settings), how to file an issue with what to include. `/privacy`: the existing policy, extended to cover the new pages and the Sound demo (generated locally, nothing downloaded). `/terms`: "as is", no warranty, acceptable use, third-party sites and trademarks belong to their owners, licence line to be decided (D5).

### 4.5 `/404`

Orb falls off the end of the road, "That page rolled away", button home.

---

## 5. UI system (reference-matched)

Measured from the reference, then reproduced with our own CSS. Final numbers are confirmed by the fidelity protocol (section 9).

- **Colour:** paper `#F3EFE7`, paper-2 `#E9E3D8`, ink `#15130F`, ink-2 `#4A453D`, ink-3 `#8A8378`, line `rgba(21,19,15,.14)`, night `#0E1024` (our dark panels use `#111317` where they sit next to extension screenshots), accent per D1, gold `#C9A24A` for the "tamed" highlights.
- **Type:** Geist 200 to 700 for text and headings (headings 600, `em` 300 in accent colour), Geist Mono 400 and 500 for labels (12 px, 0.14em tracking, uppercase). Hero `clamp(48px, 9.4vw, 180px)`, section heads `clamp(40px, 5.4vw, 100px)`, outro `clamp(60px, 12.5vw, 240px)`, line-height about 0.9, tracking about -0.05em.
- **Layout:** wrap 1240 px, 20 px gutters, panels with `padding: 18vh max(28px, 7vw)`, world sections `min-height: 150vh`, tour section `190vh`, postcards 5:4 with caption.
- **Components:** pill button 52 px high with round arrow chip (arrow rotates -45 degrees on hover), mono tags, mono labels, rolling-text links (text slides on hover), details/summary accordion, ticker, clock-style meter cells, postcard with tape-like caption, film grain overlay at about 4.5% opacity, selection colour from the accent.
- **Header:** fixed, transparent over the hero; turns light-on-dark over dark panels; hides on scroll down, returns on scroll up; full-screen menu on mobile.
- **Motion:**
  - Smooth scroll: Lenis, `lerp 0.09`, `wheelMultiplier 0.95`, fine pointers only.
  - Reveal: `opacity` + `translateY(24px)`, 0.9 s and 1.1 s with `cubic-bezier(.2, .8, .2, 1)`; replays when scrolling back up.
  - Headlines: split into masked characters, staggered by index (`--i`).
  - Parallax: elements with `data-speed`, desktop and hover devices only.
  - Loader: counter 00 to 100 with the orb rolling along a line, caption "Tuning the room…"; curtain lifts with `clip-path` over 1.1 s at `cubic-bezier(.76, 0, .24, 1)`; waits for fonts, load and the first rendered frame.
  - Cursor: 6 px dot plus a ring that grows to 64 px over links; adapts on dark panels.
  - Progress rail (desktop) with the orb on a line, labels: Start, The Song, The Blast, The Whisper, Night, The line.
  - **Page transition (the iris):** click a link, the orb rolls from the click point to the centre in an arc, the screen closes to a teal target ring (820 ms), the next page opens from the same ring (950 ms) and the orb pops out. Skipped for reduced motion.
  - Panels: workshop panel opens with an inset `clip-path` as it enters; the presets run slides in with spin tied to scroll distance.
- **Responsive:** breakpoints at 1180 (parallax and run effects), 800 (columns stack, rail hidden, postcards in flow), 600 and 390. The popup mock scales as one unit.
- **Reduced motion:** no loader curtain, no iris, no Lenis, no parallax, no scroll-driven camera, one still 3D frame (or the generated poster image).

---

## 6. Documentation section (`/docs`)

Static pages generated at build time from Markdown in `content/docs/` (authored by us, adapted from the extension repo's README, ADR, QA, SECURITY, PRIVACY and CHANGELOG).

| Page | Content |
| --- | --- |
| `/docs` | Overview, what it is, who it is for, quick links. |
| `/docs/getting-started` | Install from source (build and load unpacked), first run, set a level, popup tour with screenshots. |
| `/docs/how-it-works` | The levelling idea in plain words, then the technical view: K-weighted loudness, 400 ms window, attack and release, dead band, boost cap, limiter. |
| `/docs/presets-and-settings` | Night, Normal, Cinema, your own; every setting and its default. |
| `/docs/compatibility-mode` | Protected streams, what it needs (extra permissions), the delay, what is verified and what is not. |
| `/docs/privacy-and-permissions` | Every permission and why, what is stored, what is never collected. |
| `/docs/development` | Repo layout, commands (`npm run build`, `check`, `e2e`), architecture decisions, security notes, how to test on real sites (QA checklist). |
| `/docs/changelog` | Version history. |

Layout: left sidebar (sticky, collapses to a menu on mobile), content column at 44 rem, right-hand "On this page" list, previous and next links, a client-side **search** over a prebuilt index (no network), copy buttons on code blocks. Same header, footer, loader and transitions as the rest of the site.

---

## 7. Generated assets (we make our own)

Produced by `npm run assets` (Playwright renders our own scenes; results are committed to `static/` so `npm run dev` needs no browser download).

| Asset | Details |
| --- | --- |
| Scene postcards | `scene-song`, `scene-blast`, `scene-whisper` (WebP, 5:4, rendered from our dioramas). |
| Hero poster | Still frame of the road for no-WebGL and reduced motion. |
| Social card | `og.jpg` 1200 x 630 with logo, tagline and waveform. |
| Icons | Favicon 32, 48, 64, Apple touch 180, 192 and 512, from `volumeguard_logo.png`. |
| SVG icon sprite | Hand-drawn line icons: dial, waveform, hand, shield, lock, moon, keyboard, plug, clock, globe, check, arrow, external. |
| Popup screenshots | Captured from the real extension popup (states: default, Night, loud scene, bypass, paused, compatibility). |
| Textures (runtime) | Canvas-generated at load: star sprite, grain, vinyl-like rings. No image downloads. |
| Demo audio (runtime) | Web Audio synth: dialogue-like tone bursts, an action noise burst, a song-like chord; a simple leveller applies our gain curve. User-started only. |

---

## 8. Architecture, tooling and `npm run dev`

```
webpage/
  src/
    pages/            *.html page sources (home, scenes, toolbox, faq, support, privacy, terms, 404, docs shell)
    partials/         head, header, menu, footer, loader, popup
    styles/           tokens, base, components, home, scenes, toolbox, docs, prose
    scripts/
      core/           smooth-scroll, split-text, reveal, cursor, loader, transition, sound, header, menu
      three/          renderer, materials, orb, road, plates, night, scenes-stage, toolbox-board, capture
      model/          signal.ts (kept), timeline.ts (kept), meter.ts
      pages/          home.ts, scenes.ts, toolbox.ts, docs.ts (entry per page)
  content/docs/       Markdown sources
  static/             images, icons, fonts-free assets, robots, sitemap
  scripts/            build.mjs, dev.mjs, assets.mjs, docs.mjs
  tests/              model unit tests, build checks
  dist/               generated output (git-ignored), served by Firebase
```

- **Build** (`npm run build`): esbuild bundles one script per page (pinned `three@0.186.0` plus addons `RoomEnvironment` and `RoundedBoxGeometry`, pinned `lenis`), processes CSS, expands HTML partials, converts docs Markdown (pinned `marked`), builds the search index, copies `static/`, writes `sitemap.xml`. Fonts come from pinned `@fontsource-variable/geist` and `geist-mono` (confirm the packages exist before build; fall back to the official Geist release files if not).
- **Dev** (`npm run dev`): one command that builds, watches `src/`, `content/` and `static/`, serves `dist/` on `http://localhost:8000` with clean URLs and live reload (a small Node server plus esbuild watch). No extra tools to install.
- **Other scripts:** `npm run check` (type-check, unit tests, link and CSP checks), `npm run assets` (regenerate images; needs Playwright), `npm run preview` (Firebase Hosting emulator on the built output).
- **Firebase:** `firebase.json` serves `dist/` for both sites (`volumeguard`, `teamvolumeguard`), keeps the strict headers, adds long caching for hashed assets, runs the build as `predeploy`. Redirects: `/index.html` to `/`, old routes to new ones if any.
- **Tests:** unit tests for the model (kept and extended with the meter); a build check that fails on any external URL in `dist/`, inline script, inline style attribute, missing alt text or broken internal link.

### 8.1 Performance budget

- Page JS under 250 KB gzipped on the heaviest page (Three.js is tree-shaken; the audio synth loads only after the Sound toggle).
- One canvas per page. DPR capped at 2 (1.5 on small). Shadows and antialias off on small screens. Rendering stops when the canvas is covered by an opaque panel or the tab is hidden. Quality drops automatically if the frame time stays high.
- Images WebP with width and height set; fonts preloaded and subsetted (Latin).
- Targets: Lighthouse performance 90 or more on mobile for `/`, LCP under 2.5 s, no layout shift from the loader.

---

## 9. Fidelity protocol (how "pixel perfect" is checked)

Reference limits: the offline mirror has no Three.js vendor files, so its 3D cannot run; the 3D is matched against the supplied full-page screenshot and the live site, and the DOM and motion are matched against the mirror.

1. **Layout diff:** Playwright opens the reference mirror and our page at 1920, 1440, 1024, 768 and 390 px wide and records the bounding boxes of every matching element (headings, cards, buttons, nav, footer). Tolerance is 2 px; each miss is fixed or documented.
2. **Type check:** computed font size, weight, line height and letter spacing compared per heading level at each width.
3. **Motion check:** durations, easings, thresholds and stagger compared against the spec table in section 5; recordings of the first load, a scroll pass and a page transition side by side.
4. **Screenshot diff:** full-page screenshots with the canvas masked, compared with a visual-diff threshold; the canvas is reviewed by eye.
5. **Our additions** (popup, docs, copy, colours from D1) are excluded from the diff and listed as intentional differences.

---

## 10. Build order and acceptance

| Phase | Deliverable | Done when |
| --- | --- | --- |
| 1 | Tooling: `npm run dev`, `build`, partials, CSS tokens, fonts, firebase config for `dist/` | Dev server shows a styled empty page with the header and footer, `check` passes. |
| 2 | UI system: loader, cursor, smooth scroll, split text, reveal, header and menu, iris transition, buttons and components | Matches the reference at 5 widths within tolerance (protocol steps 1 to 3). |
| 3 | Home page: copy, sections, popup component, static (no 3D) | All sections in place, readable without JavaScript. |
| 4 | Home 3D road: orb, road, plates, camera, sky, night, line | Scroll drives the whole story forward and backward at 60 fps on a mid-range laptop. |
| 5 | `/scenes` turntable and `/toolbox` board | Both interactive, with before/after handles and the dial demo. |
| 6 | `/docs` generator and content, search | All docs pages build, search works offline. |
| 7 | `/faq`, `/support`, `/privacy`, `/terms`, `/404` | Content reviewed; legal wording confirmed (D5). |
| 8 | Generated assets, Sound demo, reduced-motion and no-WebGL fallbacks | Every page has a still fallback; sound is opt-in only. |
| 9 | Verification and deploy | Fidelity protocol passed, Lighthouse and accessibility checked, headers checked live, deployed to both Hosting sites. |

---

## 11. Risks and open questions

- **Reference rights.** We only reproduce the design system and motion numbers, never the files or branding (section 0.1). If you want a different degree of similarity, say so before phase 2.
- **Pixel-perfect 3D** is judged from a screenshot and the live site, not from running code; small differences in the 3D are expected.
- **Accent colour (D1)** changes how close the look is to the reference. Terracotta is the closest; violet keeps our brand.
- **Terms and licence (D5)** are not decided. The page will not invent a licence or a company.
- **Sound (D3)** adds an optional module; it can be dropped without affecting any page.
- **Real-device performance** (phones, integrated GPUs) cannot be proven here; the plan includes automatic quality drops, but a real-device check is a manual step after phase 9.
- **Docs accuracy.** The compatibility-mode pages must keep saying "experimental, not verified on real protected sites" until the manual QA in the extension repo is done.
