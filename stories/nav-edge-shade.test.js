/* Browser paint regression for both tab appearances and themes at 390px.
 * Run with NAV_EDGE_SHADE=1 and UI_PLAYWRIGHT (and optionally UI_CHROME).
 * The rows are wired with observeNavFit() from the source, as React's NavTabs wires them.
 * Checks start, middle, end and fit. The fade is measured on a probe fill, so the
 * result does not depend on where a label's ink falls.
 * Limits: Chromium, left-to-right rows, the page ground, a card and a white stage,
 * default accent. CI does not measure paint.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { markup } from './lib/react-markup.js';

const TABS = {
  'aria-label': 'Finance views', active: 'payouts',
  items: [
    { id: 'summary', label: 'Summary' },
    { id: 'payouts', label: 'Payouts', badge: 3 },
    { id: 'transactions', label: 'Transactions' },
    { id: 'disputes', label: 'Disputes', badge: { text: 2, tone: 'danger' } },
    { id: 'exports', label: 'Exports', disabled: true },
  ],
};
const subjects = [
  { name: 'Underline', html: await markup(({ h, kit }) => h(kit.NavTabs, TABS)) },
  { name: 'Pill', html: await markup(({ h, kit }) => h(kit.NavTabs, { ...TABS, variant: 'pill' })) },
].filter(({ html }) => html.includes('ui-nav--tabs'));

const NAV = readFileSync(new URL('../src/logic/nav.js', import.meta.url), 'utf8');
const wire = `${NAV}\nfor (const row of document.querySelectorAll('.ui-nav--tabs')) observeNavFit(row);`;
/** Set the row's scroll and wait until its scroll listener and a paint have run. */
const scrollTo = (row, state) => new Promise((done) => {
  row.scrollLeft = state === 'middle' ? 90 : state === 'end' ? row.scrollWidth : 0;
  requestAnimationFrame(() => requestAnimationFrame(done));
});
const PROBE = '.ui-nav--tabs { background: rgb(255, 0, 0) !important; } .ui-nav--tabs > * { visibility: hidden; }';

test('a tab row fades only the edges with hidden tabs', {
  skip: process.env.NAV_EDGE_SHADE !== '1' && 'set NAV_EDGE_SHADE=1',
}, async () => {
  const { kitStylesheet, playwright } = await import('./lib/tap-zone.js');
  const { decodePNG, pixelAt } = await import('./lib/table-edge-shade.js');
  assert.equal(subjects.length, 2, 'measure both navigation tab stories');
  const pw = await playwright();
  assert.ok(pw, 'NAV_EDGE_SHADE requires UI_PLAYWRIGHT');
  const browser = await pw.chromium.launch({
    executablePath: process.env.UI_CHROME || undefined, args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 200 } });
    for (const theme of ['light', 'dark']) for (const { name, html } of subjects) {
      await page.setViewportSize({ width: 390, height: 200 });
      await page.setContent(`<html data-theme="${theme}"><style>${kitStylesheet()}${PROBE}</style><body style="padding: 24px">${html}</body></html>`);
      await page.addScriptTag({ type: 'module', content: wire });
      await page.waitForSelector('.ui-nav--tabs[data-nav-after]');
      for (const state of ['start', 'middle', 'end', 'fit']) {
        if (state === 'fit') {
          await page.setViewportSize({ width: 1280, height: 200 });
          await page.waitForSelector('.ui-nav--tabs[data-nav-fit]');
        }
        const row = page.locator('.ui-nav--tabs');
        await row.evaluate(scrollTo, state);
        const geo = await row.evaluate((el) => {
          const { x, y, width, height } = el.getBoundingClientRect();
          return { x, y, width, height, max: el.scrollWidth - el.clientWidth };
        });
        assert.equal(geo.max > 0, state !== 'fit', `${name}: ${state} fixture`);
        const faded = decodePNG(await page.screenshot());
        const strip = await page.addStyleTag({ content: '.ui-nav--tabs { mask-image: none !important; }' });
        const plain = decodePNG(await page.screenshot());
        await strip.evaluate(el => el.remove());
        for (const side of ['left', 'right']) {
          const x = side === 'left' ? Math.ceil(geo.x + 1) : Math.floor(geo.x + geo.width - 2);
          const y = Math.round(geo.y + geo.height / 2);
          const was = pixelAt(plain, x, y);
          const lost = pixelAt(faded, x, y).reduce((sum, c, i) => sum + Math.abs(c - was[i]), 0);
          const expected = state === 'middle' || (state === 'start' && side === 'right') || (state === 'end' && side === 'left');
          const label = `${theme} ${name} ${state} ${side}`;
          if (expected) assert.ok(lost >= 100, `${label}: the probe fill changed by only ${lost} at the edge`);
          else assert.equal(lost, 0, `${label}: a reached edge is not faded`);
        }
      }
    }
  } finally {
    await browser.close();
  }
});

// The owner's case in #768: a short row on a white stage showed grey bands at both ends.
// A tinted ground is mixed in the card's own paint, so one 8-bit step may differ.
test('a row that fits shows its ground at both edges, on a card or any stage', {
  skip: process.env.NAV_EDGE_SHADE !== '1' && 'set NAV_EDGE_SHADE=1',
}, async () => {
  const { kitStylesheet, playwright } = await import('./lib/tap-zone.js');
  const { decodePNG, pixelAt } = await import('./lib/table-edge-shade.js');
  const pw = await playwright();
  assert.ok(pw, 'NAV_EDGE_SHADE requires UI_PLAYWRIGHT');
  const browser = await pw.chromium.launch({
    executablePath: process.env.UI_CHROME || undefined, args: ['--no-sandbox'],
  });
  const grounds = [
    ['card', '<div class="ui-card">', '</div>'],
    ['accent card', '<div class="ui-card ui-card--accent">', '</div>'],
    ['live card', '<div class="ui-card ui-card--live">', '</div>'],
    ['white stage', '<div style="background:#fff;padding:24px">', '</div>'],
  ];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 240 } });
    for (const theme of ['light', 'dark']) for (const [ground, open, close] of grounds) for (const { name, html } of subjects) {
      await page.setContent(`<html data-theme="${theme}"><style>${kitStylesheet()}</style><body>${open}${html}${close}</body></html>`);
      await page.addScriptTag({ type: 'module', content: wire });
      await page.waitForSelector('.ui-nav--tabs[data-nav-fit]');
      const geo = await page.locator('.ui-nav--tabs').evaluate((row) => {
        const { x, y, width, height } = row.getBoundingClientRect();
        return { x, y, width, height };
      });
      const shot = decodePNG(await page.screenshot());
      const y = Math.round(geo.y + geo.height / 2);
      const above = pixelAt(shot, Math.ceil(geo.x + 1), Math.round(geo.y) - 6);
      for (const x of [Math.ceil(geo.x + 1), Math.floor(geo.x + geo.width - 2)]) {
        const edge = pixelAt(shot, x, y);
        assert.ok(edge.every((c, i) => Math.abs(c - above[i]) <= 1),
          `${theme} ${ground} ${name}: the edge at x=${x} is ${edge}, the ground is ${above}`);
      }
    }
  } finally {
    await browser.close();
  }
});
