/* The #463 landing directions, captured. Disposable review rig, not kit source.
 *
 * One static server over this checkout — so the prototypes can import the kit's
 * own factories and stylesheet as modules — one Chrome, two viewports, both
 * themes. Direction A is composed here rather than committed as a copy of the
 * page: it IS site/index.html with one string changed, and a duplicate of 431
 * lines would start drifting the day it was written.
 *
 * Playwright is not a dependency of this package. Point UI_PLAYWRIGHT at an
 * install and UI_CHROME at a Chrome binary, the way the evidence rig does.
 *
 *   node docs/reviews/463-landing-directions/shots.mjs <outDir> [nameFilter]
 */
import http from 'node:http';
import path from 'node:path';
import { createReadStream, statSync, readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cssText } from '../../../src/inline.js';
import { iconNames } from '../../../src/assets/icons.js';
import { catalogueCopy } from '../../../site/catalogue.mjs';
import { topbar, footer, CHROME_CSS, CHROME_JS } from '../../../site/chrome.mjs';

const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
const CHROME = process.env.UI_CHROME;

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const [outDir, only] = process.argv.slice(2);
if (!outDir) throw new Error('usage: shots.mjs <outDir> [nameFilter]');
mkdirSync(outDir, { recursive: true });

const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;

/* ---------------------------------------------------------------------------
 * Direction A — the page as it ships, with one slogan swapped in.
 *
 * The three candidates are rendered at hero scale on their own page so the
 * typography can be compared; the winner is the one shown in place.
 * ------------------------------------------------------------------------- */
const CANDIDATES = [
  {
    title: 'The kit behind <span class="grad">Apliteni&rsquo;s products</span>',
    plain: 'The kit behind Apliteni’s products',
    sub: 'A design system for HTML pages and complex React apps.',
    why: 'Trades a compliment to the category for the one fact that earns trust: this is in production, not a demo.',
    winner: true,
  },
  {
    title: 'A design system <span class="grad">your agent can apply</span>',
    plain: 'A design system your agent can apply',
    sub: 'Paste one prompt, or install the package yourself.',
    why: 'Names the thing this kit does that a general UI kit does not, and the prompt that proves it is already on the page.',
  },
  {
    title: 'Components that come <span class="grad">with their rules</span>',
    plain: 'Components that come with their rules',
    sub: 'A design system for HTML pages and complex React apps.',
    why: 'The written guidelines ship inside the package; that is what separates this from a list of class names.',
  },
];

const HERO_TITLE = '<h1 class="ui-hero__title">The art of <span class="grad">UI&#8209;Kits</span></h1>';
const HERO_SUB = '<p class="ui-hero__sub">A design system for HTML pages and complex React apps.</p>';

/** site/index.html composed exactly the way site/build.mjs composes it. */
function composeLanding() {
  const raw = readFileSync(path.join(root, 'site/index.html'), 'utf8');
  const landing = catalogueCopy(raw, {
    icons: iconNames,
    buttonSource: readFileSync(path.join(root, 'react/src/primitives/Button.tsx'), 'utf8'),
  });
  return landing
    .replace('{{TOPBAR}}', () => topbar(''))
    .replace('{{FOOTER}}', () => footer())
    .replace('{{CHROME_CSS}}', () => CHROME_CSS)
    .replace('{{CHROME_JS}}', () => CHROME_JS)
    .replaceAll('{{VERSION}}', `v${version}`)
    .replaceAll('{{CSSHASH}}', 'proto');
}

/** The composed page with the winning slogan in place of the shipped one. */
function pageA() {
  const win = CANDIDATES.find((c) => c.winner);
  const html = composeLanding();
  for (const marker of [HERO_TITLE, HERO_SUB]) {
    if (html.split(marker).length !== 2) {
      throw new Error(`site/index.html no longer carries the hero line this rig swaps:\n  ${marker}`);
    }
  }
  return html
    .replace(HERO_TITLE, `<h1 class="ui-hero__title">${win.title}</h1>`)
    .replace(HERO_SUB, `<p class="ui-hero__sub">${win.sub}</p>`);
}

/** The three candidates at hero scale, one under another, each with its reason. */
function pageCandidates() {
  const rows = CANDIDATES.map((c, i) => `
    <section class="wrap cand${c.winner ? ' cand--win' : ''}">
      <p class="ui-eyebrow">Candidate ${i + 1}${c.winner ? ' — shown in place' : ''}</p>
      <h2 class="ui-hero__title">${c.title}</h2>
      <p class="ui-hero__sub">${c.sub}</p>
      <p class="cand__why">${c.why}</p>
    </section>`).join('');
  return `<!doctype html>
<html lang="en" data-theme="THEME">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Direction A — slogan candidates (#463)</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="/assets/kit.css">
<link rel="stylesheet" href="/docs/reviews/463-landing-directions/shared.css">
<style>
  .cand { padding-block: clamp(30px, 5vh, 52px); border-top: 1px solid var(--border); text-align: center; }
  .cand:first-of-type { border-top: 0; }
  /* No size override: the point of this sheet is how each line breaks at the
     hero's real scale, so .ui-hero__title is left exactly as the kit sets it. */
  .cand .ui-hero__title { margin-bottom: 16px; }
  .cand .ui-hero__sub { margin-bottom: 14px; }
  .cand__why { color: var(--text); font-size: var(--text-sm); line-height: 1.6; max-width: 72ch; margin: 0 auto; }
  .cand--win { background: var(--surface); border-radius: var(--radius-xl); border: 1px solid var(--accent); }
</style>
</head>
<body style="padding-block:40px">${rows}</body>
</html>`;
}

/* ---------------------------------------------------------------------------
 * The server. The checkout, plus the two pages composed above.
 * ------------------------------------------------------------------------- */
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2',
};
const SYNTH = {
  '/__a': () => [pageA(), 'text/html'],
  '/__a-candidates': (q) => [pageCandidates().replace('THEME', q.get('theme') === 'light' ? 'light' : 'dark'), 'text/html'],
  '/assets/kit.css': () => [cssText, 'text/css'],
  '/favicon.svg': () => ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"></svg>', 'image/svg+xml'],
  // Chrome asks for this unprompted; a 404 here would read as a page defect.
  '/favicon.ico': () => ['', 'image/x-icon'],
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const synth = SYNTH[url.pathname];
  if (synth) {
    const [body, type] = synth(url.searchParams);
    res.writeHead(200, { 'content-type': type }).end(body);
    return;
  }
  const file = path.join(root, url.pathname);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
  } catch {
    res.writeHead(404).end(`not found: ${url.pathname}`);
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
const port = await new Promise((done) => server.listen(0, '127.0.0.1', () => done(server.address().port)));

/* ---------------------------------------------------------------------------
 * The captures.
 * ------------------------------------------------------------------------- */
const PROTO = '/docs/reviews/463-landing-directions';
const PAGES = [
  { key: 'a', path: '/__a' },
  { key: 'a-candidates', path: '/__a-candidates' },
  { key: 'b', path: `${PROTO}/b.html` },
  { key: 'c', path: `${PROTO}/c.html` },
];
const SIZES = [{ tag: '1440', width: 1440, height: 900 }, { tag: '390', width: 390, height: 844 }];
const THEMES = ['dark', 'light'];

const browser = await chromium.launch({ executablePath: CHROME });
const want = (name) => !only || name.includes(only);

/** Wait for the document rather than a clock: fonts resolved, then no CSS
 *  transition still travelling. Mirrors what scripts/evidence/settle.mjs does. */
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(d))));
  await page.waitForFunction(() => document.getAnimations()
    .filter((a) => a.constructor.name === 'CSSTransition')
    .every((a) => a.playState === 'finished' || a.playState === 'idle'), null, { timeout: 8000 });
  await page.evaluate(() => new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(d))));
}

/* `theme` is set two ways on purpose. The prototypes read ?theme= and seed the
 * store the shared script restores from; the composed landing page has no such
 * hook and falls back to prefers-color-scheme, so the context carries it too.
 * Without the second one every "dark" capture of direction A came back light. */
async function open(url, size, theme) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: theme,
  });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  /* 30s is Playwright's default and it is not enough on a host running other
     work: the font stylesheet is a real network round trip and the capture died
     mid-run at load average 287 on 16 cores. A ceiling, not a wait. */
  await page.goto(`http://127.0.0.1:${port}${url}`, { waitUntil: 'load', timeout: 180000 });
  await settle(page);
  return { ctx, page, problems };
}

const failures = [];
try {
  for (const p of PAGES) {
    for (const theme of THEMES) {
      for (const size of SIZES) {
        const name = `${p.key}-${theme}-${size.tag}`;
        if (!want(name)) continue;
        const { ctx, page, problems } = await open(`${p.path}?theme=${theme}`, size, theme);
        await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
        console.log(`  ${name}.png${problems.length ? `  [${problems.length} console error(s)]` : ''}`);
        problems.forEach((t) => failures.push(`${name}: ${t}`));
        await ctx.close();
      }
    }
  }

  /* The focus audit. Tab through each page's first controls and record what the
   * browser actually paints, so "it uses the kit ring" is a measurement rather
   * than a reading of the stylesheet. outlineColor with no box-shadow is the
   * native fallback; the kit's shape is a transparent outline plus a shadow. */
  if (want('focus')) {
    for (const p of [{ key: 'a', path: '/__a' }, { key: 'b', path: `${PROTO}/b.html` }, { key: 'c', path: `${PROTO}/c.html` }]) {
      const { ctx, page } = await open(`${p.path}?theme=dark`, SIZES[0], 'dark');

      /* Every focusable element's shadow AT REST, recorded before anything is
       * focused. A control can carry a permanent box-shadow — the accent dots
       * wear a 2px page-coloured collar — so "has a shadow while focused" is
       * not the question. Whether the shadow CHANGED is. */
      await page.evaluate(() => {
        const sel = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';
        document.querySelectorAll(sel).forEach((el, i) => {
          el.dataset.probeIdx = String(i);
          el.dataset.probeRest = getComputedStyle(el).boxShadow;
          [el.nextElementSibling, ...el.children].filter(Boolean).forEach((x, j) => {
            x.dataset.probeRest = getComputedStyle(x).boxShadow;
            x.dataset.probeIdx = `${i}.${j}`;
          });
        });
      });

      const seen = [];
      for (let i = 0; i < 44; i++) {
        await page.keyboard.press('Tab');
        /* One painted frame between the key and the question. Without it the
           read raced the style recalc: the same tab stop came back as the rule
           it matches in one run and as the initial outline in the next. */
        await page.evaluate(() => new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(d))));
        const row = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const s = getComputedStyle(el);
          const name = (x) => x.tagName.toLowerCase()
            + (x.className ? `.${String(x.className).trim().split(/\s+/).join('.')}` : '')
            + (x.id ? `#${x.id}` : '');
          /* A control may paint its ring somewhere other than on itself: the
             kit's switch hides its checkbox and rings the track beside it. So
             the question is asked of the focused element, its next sibling and
             its children, and the answer says which one carries it. */
          const carriers = [el, el.nextElementSibling, ...el.children].filter(Boolean);
          const ringed = carriers.find((x) => x.dataset.probeRest !== undefined
            && getComputedStyle(x).boxShadow !== x.dataset.probeRest);
          return {
            what: name(el),
            label: (el.getAttribute('aria-label') || el.textContent.trim()).slice(0, 30),
            outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} offset ${s.outlineOffset}`,
            native: s.outlineStyle === 'auto',
            ringOn: ringed ? name(ringed) : null,
          };
        });
        if (!row) break;
        row.ring = Boolean(row.ringOn);
        seen.push(row);
      }
      await page.screenshot({ path: path.join(outDir, `focus-${p.key}.png`) });
      const bare = seen.filter((r) => !r.ring);
      console.log(`  focus-${p.key}.png — ${seen.length} stops, ${bare.length} without the kit ring`);
      bare.forEach((r) => console.log(
        `      ${r.native ? 'BROWSER RING' : 'other outline'}: ${r.what} "${r.label}"  (${r.outline})`));
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error('\nconsole errors while capturing:');
  failures.forEach((f) => console.error(`  ${f}`));
  process.exitCode = 1;
}
