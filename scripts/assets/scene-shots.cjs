// Renders postcard frames of the home road at each chapter, with the page UI hidden.
// Usage: node scripts/assets/scene-shots.cjs <outdir> [baseUrl]  (serve a built dist/ first)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.VOLCON_DIR || require('path').join(__dirname, '../../../volcon')] }));
const out = process.argv[2];
const base = process.argv[3] || 'http://localhost:8000';
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.classList.contains('loaded'), null, { timeout: 30000 });
  await page.addStyleTag({ content: 'main,.nav,.rail,.peaks-hud,.vignette,.cursor,.foot{visibility:hidden!important} body::before{display:none!important}' });
  for (const [name, selector] of [['road-poster', '[data-t="0"]'], ['song', '#song'], ['blast', '#blast'], ['whisper', '#whisper'], ['night', '#night'], ['line', '[data-t="1"]']]) {
    const y = await page.$eval(selector, (e) => { const r = e.getBoundingClientRect(); return Math.max(0, r.top + scrollY + r.height / 2 - innerHeight / 2); });
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${out}/${name}.png`, timeout: 90000 });
    console.log('shot', name);
  }
  await browser.close();
})();
