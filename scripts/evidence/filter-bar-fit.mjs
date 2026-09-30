/* The browser side of #467: a filter row adds nothing to the page's scrollable
 * width on a phone, and its panels open inside the row.
 *
 * A gate rather than a shoot. stories/filter-bar-fit.test.js reads the
 * declarations; this measures the boxes, which is what the issue is about — a
 * page 398px wide on a 390px view, and 23px over at 375px.
 *
 * Subjects are discovered, never listed. It then puts the 240px floor back and
 * requires every case carrying a panel to overflow, so a green run cannot be a
 * run that measured nothing.
 *
 * why: scripts/evidence/README.md
 *
 * argv: <checkout> [outDir]   outDir also takes a JSON ledger.
 */import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { settle } from './settle.mjs';

// Playwright is not a dependency of this package. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkoutArg, outDir] = process.argv.slice(2);
const checkout = path.resolve(checkoutArg || '.');
const built = path.join(checkout, 'react/storybook-static');
if (!existsSync(path.join(built, 'index.json'))) {
  throw new Error(`no React Storybook build at ${built} — run: npm run build-storybook -w react`);
}

// The widths #467 names. 320 rides along as the narrowest phone still sold: the
// bound holds at any width, so the pair the issue asked about is not the only
// place it is allowed to hold.
const WIDTHS = [320, 375, 390];
const THEMES = ['dark', 'light'];
// Putting the floor back is the mutation. It is the rule as it stood before the
// fix, written at a specificity that beats the bound so it cannot be a no-op.
const MUTATION = '.ui-filter-bar .ui-filter-bar__chip .ui-dropdown__panel'
  + ' { min-width: 240px !important; max-width: none !important; }';

/** A static server over one root, with one page of our own at /__shot. */
const serve = (root, page) => new Promise((resolve, reject) => {
  const proc = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), root, page]);
  proc.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc }));
  proc.stderr.on('data', (d) => process.stderr.write(d));
  proc.once('error', reject);
});

const stories = Object.values(JSON.parse(readFileSync(path.join(built, 'index.json'), 'utf8')).entries)
  .filter((entry) => entry.type === 'story' && entry.title === 'React/FilterBar')
  .map((entry) => entry.id);
if (!stories.length) throw new Error('no React/FilterBar stories in the Storybook index');

const react = await serve(built, path.join(HERE, 'filter-bar-fit.html'));
const vanilla = await serve(checkout, path.join(HERE, 'filter-bar-fit.html'));
const browser = await chromium.launch({
  executablePath: process.env.UI_CHROME,
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--disable-gpu',
    '--deterministic-mode', '--disable-partial-raster', '--disable-skia-runtime-opts'],
});

/** What the page and its bars measure, in one round trip. */
const probe = () => {
  const doc = document.documentElement;
  const bars = [...document.querySelectorAll('.ui-filter-bar')].map((bar) => {
    const box = bar.getBoundingClientRect();
    const panels = [...bar.querySelectorAll('.ui-dropdown__panel')].map((panel) => {
      const p = panel.getBoundingClientRect();
      return { left: +p.left.toFixed(1), right: +p.right.toFixed(1), width: +p.width.toFixed(1) };
    });
    return { left: +box.left.toFixed(1), right: +box.right.toFixed(1), panels };
  });
  return {
    page: doc.scrollWidth,
    view: doc.clientWidth,
    over: Math.max(0, doc.scrollWidth - doc.clientWidth),
    bars,
  };
};

/** One case: a rendered subject at a width in a theme, optionally mutated. */
async function measure({ url, ready, width, theme, mutate }) {
  const ctx = await browser.newContext({
    viewport: { width, height: 640 }, deviceScaleFactor: 1, reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector(ready);
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  if (mutate) await page.addStyleTag({ content: MUTATION });
  // Asked of the document rather than of a clock. why: scripts/evidence/README.md
  await settle(page);
  const seen = await page.evaluate(probe);
  // Open one chip's panel and measure again: a panel that only fits while it is
  // shut fits nothing. The second chip is the one #467 measured.
  const trigger = await page.$('.ui-filter-bar__chip:nth-of-type(2) [data-dropdown-trigger]');
  let open = null;
  if (trigger && await trigger.isEnabled()) {
    await trigger.click();
    await settle(page);
    open = await page.evaluate(probe);
  }
  await ctx.close();
  return { ...seen, open };
}

const cases = [];
for (const width of WIDTHS) {
  for (const theme of THEMES) {
    for (const id of stories) {
      cases.push({
        name: `react ${id}`,
        url: `http://127.0.0.1:${react.port}/iframe.html?id=${id}&viewMode=story`,
        ready: '#storybook-root > *', width, theme,
      });
    }
    cases.push({
      name: 'vanilla filterBar()',
      url: `http://127.0.0.1:${vanilla.port}/__shot`,
      ready: 'html[data-ready] .ui-filter-bar', width, theme,
    });
  }
}

/** How many panels a case renders. A bar with no filters has none, so there is
 *  nothing for the floor to push off the screen and nothing the mutation can
 *  break. Counted rather than assumed, so a case that loses its panels for some
 *  other reason cannot pass as one the mutation legitimately spared. */
const panelCount = (state) => state.bars.reduce((n, bar) => n + bar.panels.length, 0);

const ledger = [];
const fails = [];
const panelled = new Set();
for (const one of cases) {
  const held = await measure(one);
  ledger.push({ ...one, mutated: false, ...held });
  if (panelCount(held)) panelled.add(one);
  const worst = Math.max(held.over, held.open ? held.open.over : 0);
  if (worst > 0) {
    fails.push(`${one.name} at ${one.width}px ${one.theme}: the page is ${held.page}px wide on a `
      + `${held.view}px view, ${worst}px over`);
  }
  // Every panel inside the row that holds it, open or shut.
  for (const state of [held, held.open].filter(Boolean)) {
    for (const bar of state.bars) {
      for (const panel of bar.panels) {
        if (panel.right > bar.right + 0.5 || panel.left < bar.left - 0.5) {
          fails.push(`${one.name} at ${one.width}px ${one.theme}: a panel spans `
            + `${panel.left}..${panel.right} outside its row's ${bar.left}..${bar.right}`);
        }
      }
    }
  }
}

// The mutation. Every case carrying a panel has to fail with the floor back, or
// it was never measuring the bound. An empty bar is measured too, and is
// expected to survive: it has no panel to push anywhere.
const survived = [];
for (const one of cases) {
  const broken = await measure({ ...one, mutate: true });
  ledger.push({ ...one, mutated: true, ...broken });
  if (panelled.has(one) && broken.over === 0) {
    survived.push(`${one.name} at ${one.width}px ${one.theme}: still ${broken.page}px on a `
      + `${broken.view}px view with the 240px floor put back`);
  }
  if (!panelled.has(one) && broken.over > 0) {
    survived.push(`${one.name} at ${one.width}px ${one.theme}: renders no panel and went `
      + `${broken.over}px over anyway, so the overflow is not the one this gate measures`);
  }
}

await browser.close();
react.proc.kill();
vanilla.proc.kill();

if (outDir) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'filter-bar-fit.json'), `${JSON.stringify(ledger, null, 2)}\n`);
}

const expected = WIDTHS.length * THEMES.length * (stories.length + 1);
console.log(`subjects: ${stories.length} React stories + 1 vanilla page`);
console.log(`cases measured: ${cases.length} of ${expected} expected, at ${WIDTHS.join('px, ')}px`);
console.log(`cases carrying a panel: ${panelled.size} of ${cases.length}`);
console.log(`mutations rejected: ${panelled.size - survived.length} of ${panelled.size}`);

const problems = [];
if (cases.length !== expected) problems.push(`measured ${cases.length} cases, expected ${expected}`);
// A run where nothing rendered a panel would report every check green having
// looked at nothing at all.
if (!panelled.size) problems.push('no case rendered a filter panel, so nothing here was measured');
problems.push(...fails, ...survived);
if (problems.length) {
  for (const line of problems) console.error(`  ✗ ${line}`);
  process.exitCode = 1;
} else {
  console.log(`✓ ${cases.length} cases fit their view and their row; all ${panelled.size} `
    + 'panel-bearing mutations were rejected');
}
