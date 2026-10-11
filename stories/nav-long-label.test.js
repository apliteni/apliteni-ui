import test from 'node:test';
import assert from 'node:assert/strict';
import { navTabs } from '../src/index.js';
import { kitStylesheet, playwright } from './lib/tap-zone.js';

const LONG = 'International transaction reconciliation';
const RING = 3;

const items = [
  { id: 'summary', label: LONG },
  { id: 'payouts', label: 'Payouts', badge: 3 },
  { id: 'transactions', label: 'Transactions' },
  { id: 'disputes', label: 'Disputes', badge: { text: 2, tone: 'danger' } },
  { id: 'exports', label: 'Exports', disabled: true },
];

function html(css) {
  return `<!doctype html><html data-theme="dark"><head><style>${css}</style></head>`
    + `<body style="margin:0;padding:40px">${navTabs({
      ariaLabel: 'Finance views',
      items,
      active: 'summary',
    })}</body></html>`;
}

function uncapTabs(css) {
  return css
    .replace(/\n\.ui-nav__tab-label \{[^}]+\}/, '')
    .replace(/(\.ui-nav__tab \{\n\s*flex: none;\n\s*position: relative;)\n\s*max-width: 100%;/, '$1');
}

async function measure(page, css) {
  await page.setViewportSize({ width: 320, height: 260 });
  await page.setContent(html(css), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate((ring) => {
    const nav = document.querySelector('.ui-nav--tabs');
    const item = nav.querySelector('[aria-current="page"]');
    const style = getComputedStyle(nav);
    const left = nav.getBoundingClientRect().left + (parseFloat(style.paddingLeft) || 0);
    const right = nav.getBoundingClientRect().right - (parseFloat(style.paddingRight) || 0);
    const before = item.getBoundingClientRect();
    if (before.left < left) nav.scrollLeft += before.left - left;
    else if (before.right > right) nav.scrollLeft += before.right - right;
    item.focus();
    const box = item.getBoundingClientRect();
    const row = nav.getBoundingClientRect();
    const label = item.querySelector('.ui-nav__tab-label').getBoundingClientRect();
    return {
      scrollLeft: Math.round(nav.scrollLeft * 1000) / 1000,
      rowWidth: Math.round(nav.clientWidth * 1000) / 1000,
      linkWidth: Math.round(box.width * 1000) / 1000,
      clipped: Math.round(Math.max(0, row.left - (box.left - ring), box.right + ring - row.right) * 1000) / 1000,
      startHidden: Math.round(Math.max(0, row.left - label.left) * 1000) / 1000,
      outline: getComputedStyle(item).outline,
    };
  }, RING);
}

test('a long current tab keeps its label start and whole focus ring at 320px', async (t) => {
  if (process.env.NAV_LONG_LABEL !== '1') {
    t.skip('set NAV_LONG_LABEL=1 and UI_PLAYWRIGHT to run the browser measurement');
    return;
  }
  const pw = await playwright();
  const api = pw?.chromium ? pw : pw?.default;
  assert.ok(api?.chromium, 'NAV_LONG_LABEL=1 was set and no Playwright could be resolved');
  const browser = await api.chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const css = kitStylesheet();
    const fixed = await measure(page, css);
    assert.equal(fixed.startHidden, 0,
      `the label start is ${fixed.startHidden}px outside the row: ${JSON.stringify(fixed)}`);
    assert.equal(fixed.clipped, 0,
      `${fixed.linkWidth}px of link in a ${fixed.rowWidth}px row clips ${fixed.clipped}px of its ring: `
      + JSON.stringify(fixed));

    const broken = await measure(page, uncapTabs(css));
    assert(broken.startHidden > 0,
      `uncapping the tab hid no label start, so the mutation proves nothing: ${JSON.stringify(broken)}`);
    assert(broken.clipped > 0,
      `uncapping the tab clipped no ring, so the mutation proves nothing: ${JSON.stringify(broken)}`);
    t.diagnostic(`fixed ${JSON.stringify(fixed)}`);
    t.diagnostic(`uncapped ${JSON.stringify(broken)}`);
  } finally {
    await page.close();
    await browser.close();
  }
});
