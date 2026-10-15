/* Browser paint regression for both tab appearances and themes at 390px.
 * Run with NAV_EDGE_SHADE=1 and UI_PLAYWRIGHT (and optionally UI_CHROME).
 * Discovers tab rows from Navigation stories. Checks start, middle, end and fit.
 * Limits: Chromium, page ground, default accent. React shares this stylesheet;
 * its mounted stories still need visual inspection. CI does not measure paint.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as stories from './components/Navigation.stories.js';

const subjects = Object.entries(stories)
  .filter(([, story]) => typeof story?.render === 'function')
  .map(([name, story]) => ({ name, html: story.render() }))
  .filter(({ html }) => html.includes('ui-nav--tabs'));

test('tab row shades mark only edges with hidden tabs', {
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
      await page.setContent(`<html data-theme="${theme}"><style>${kitStylesheet()}</style><body>${html}</body></html>`);
      for (const state of ['start', 'middle', 'end', 'fit']) {
        if (state === 'fit') await page.setViewportSize({ width: 1280, height: 200 });
        const geo = await page.locator('.ui-nav--tabs').evaluate((row, state) => {
          row.scrollLeft = state === 'middle' ? 90 : state === 'end' ? row.scrollWidth : 0;
          const { x, y, width, height } = row.getBoundingClientRect();
          return { x, y, width, height, max: row.scrollWidth - row.clientWidth };
        }, state);
        assert.equal(geo.max > 0, state !== 'fit', `${name}: ${state} fixture`);
        const shaded = decodePNG(await page.screenshot());
        const strip = await page.addStyleTag({ content: '.ui-nav--tabs { --ui-tabs-edge: transparent !important; }' });
        const plain = decodePNG(await page.screenshot());
        await strip.evaluate(el => el.remove());
        for (const side of ['left', 'right']) {
          const x = side === 'left' ? Math.ceil(geo.x + 1) : Math.floor(geo.x + geo.width - 2);
          const y = Math.round(geo.y + geo.height / 2);
          const before = pixelAt(plain, x, y);
          const after = pixelAt(shaded, x, y);
          const delta = before.reduce((sum, channel, i) => sum + channel - after[i], 0) / 3;
          const expected = state === 'middle' || (state === 'start' && side === 'right') || (state === 'end' && side === 'left');
          const label = `${theme} ${name} ${state} ${side}`;
          if (expected) {
            assert.ok(theme === 'light' ? delta >= 15 : delta <= -15, `${label}: shade delta ${delta}`);
          } else {
            assert.equal(delta, 0, `${label}: reached edge has no shade`);
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
});
