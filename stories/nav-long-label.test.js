import test from 'node:test';
import assert from 'node:assert/strict';
import { markup } from './lib/react-markup.js';
import { kitStylesheet, playwright } from './lib/tap-zone.js';
import { decodePNG } from './lib/table-edge-shade.js';

const LONG = 'International transaction reconciliation';
const RING = 3;
// The fixed 320px fixture measures a 3px longest gap at rounded, antialiased corners.
const MAX_CLOSED_OUTLINE_GAP = 4;
const TEXT_HIDDEN = '.ui-nav__tab[aria-current="page"] .ui-nav__tab-label { '
  + 'color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }';
const OUTLINE_HIDDEN = '.ui-nav__tab:focus-visible { outline: none !important; }';
const CLIPPED_RIGHT_EDGE = `.ui-nav__tab[aria-current="page"] {
  clip-path: polygon(
    -5px -5px,
    calc(100% + 5px) -5px,
    calc(100% + 5px) 35%,
    calc(100% - 1px) 35%,
    calc(100% - 1px) 65%,
    calc(100% + 5px) 65%,
    calc(100% + 5px) calc(100% + 5px),
    -5px calc(100% + 5px)
  );
}`;

const items = [
  { id: 'summary', label: LONG },
  { id: 'payouts', label: 'Payouts', badge: 3 },
  { id: 'transactions', label: 'Transactions' },
  { id: 'disputes', label: 'Disputes', badge: { text: 2, tone: 'danger' } },
  { id: 'exports', label: 'Exports', disabled: true },
];

const disabledItems = [
  { id: 'summary', label: LONG, disabled: true },
  { id: 'payouts', label: 'Payouts', badge: 3, disabled: true },
  { id: 'transactions', label: 'Transactions', disabled: true },
  { id: 'disputes', label: 'Disputes', badge: { text: 2, tone: 'danger' }, disabled: true },
];

async function html(css, navItems = items) {
  const tabs = await markup(({ h, kit }) => h(kit.NavTabs, { 'aria-label': 'Finance views', items: navItems, active: 'summary' }));
  return `<!doctype html><html data-theme="dark"><head><style>${css}</style></head>`
    + `<body style="margin:0;padding:40px">${tabs}</body></html>`;
}

function uncapTabs(css) {
  return css
    .replace(/\n\.ui-nav__tab-label \{[^}]+\}/, '')
    .replace(/(\.ui-nav__tab \{\n\s*flex: none;\n\s*position: relative;)\n\s*max-width: 100%;/, '$1');
}

function withoutTabOutline(css) {
  return `${css}\n${OUTLINE_HIDDEN}`;
}

function withTransparentText(css) {
  return `${css}\n${TEXT_HIDDEN}`;
}

function withAdjacentBadgeChange(css) {
  return `${css}\n.ui-nav__tab .ui-nav__badge { background: var(--pink) !important; }`;
}

function withClippedRightEdge(css) {
  return `${css}\n${CLIPPED_RIGHT_EDGE}`;
}

function changedPixels(before, after, rect) {
  let changed = 0;
  const left = Math.max(0, Math.floor(rect.x));
  const top = Math.max(0, Math.floor(rect.y));
  const right = Math.min(before.width, Math.ceil(rect.x + rect.width));
  const bottom = Math.min(before.height, Math.ceil(rect.y + rect.height));
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = (y * before.width + x) * 4;
      const delta = Math.abs(before.data[i] - after.data[i])
        + Math.abs(before.data[i + 1] - after.data[i + 1])
        + Math.abs(before.data[i + 2] - after.data[i + 2]);
      if (delta > 30) changed++;
    }
  }
  return changed;
}

function painted(before, after, x, y) {
  const i = (y * before.width + x) * 4;
  const delta = Math.abs(before.data[i] - after.data[i])
    + Math.abs(before.data[i + 1] - after.data[i + 1])
    + Math.abs(before.data[i + 2] - after.data[i + 2]);
  return delta > 30;
}

function longestUnpaintedRun(before, after, rect, side) {
  let longest = 0;
  let current = 0;
  const left = Math.max(0, Math.floor(rect.x));
  const top = Math.max(0, Math.floor(rect.y));
  const right = Math.min(before.width, Math.ceil(rect.x + rect.width));
  const bottom = Math.min(before.height, Math.ceil(rect.y + rect.height));
  const vertical = side === 'left' || side === 'right';
  const steps = vertical ? bottom - top : right - left;

  for (let step = 0; step < steps; step++) {
    let slicePainted = false;
    if (vertical) {
      const y = top + step;
      for (let x = left; x < right; x++) {
        if (painted(before, after, x, y)) {
          slicePainted = true;
          break;
        }
      }
    } else {
      const x = left + step;
      for (let y = top; y < bottom; y++) {
        if (painted(before, after, x, y)) {
          slicePainted = true;
          break;
        }
      }
    }
    if (slicePainted) {
      longest = Math.max(longest, current);
      current = 0;
    } else {
      current++;
    }
  }
  return Math.max(longest, current);
}

function ringRects(box) {
  const x = box.left - RING;
  const y = box.top - RING;
  const width = box.width + RING * 2;
  const height = box.height + RING * 2;
  return {
    top: { x, y, width, height: RING },
    right: { x: box.right, y, width: RING, height },
    bottom: { x, y: box.bottom, width, height: RING },
    left: { x, y, width: RING, height },
  };
}

function innerRingRects(box) {
  return {
    top: { x: box.left, y: box.top, width: box.width, height: RING },
    right: { x: box.right - RING, y: box.top, width: RING, height: box.height },
    bottom: { x: box.left, y: box.bottom - RING, width: box.width, height: RING },
    left: { x: box.left, y: box.top, width: RING, height: box.height },
  };
}

async function measure(page, css) {
  await page.setViewportSize({ width: 320, height: 260 });
  await page.setContent(await html(css), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const layout = await page.evaluate((ring) => {
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
      box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height },
      label: { x: label.left, y: label.top, width: label.width, height: label.height },
    };
  }, RING);
  const painted = decodePNG(await page.screenshot());

  await page.addStyleTag({ content: OUTLINE_HIDDEN });
  const outlineHidden = decodePNG(await page.screenshot());
  const outlinePixels = Object.fromEntries(
    Object.entries(ringRects(layout.box)).map(([side, rect]) => [side, changedPixels(painted, outlineHidden, rect)]),
  );
  const outlineRuns = Object.fromEntries(
    Object.entries(ringRects(layout.box))
      .map(([side, rect]) => [side, longestUnpaintedRun(painted, outlineHidden, rect, side)]),
  );

  await page.addStyleTag({ content: TEXT_HIDDEN });
  const textHidden = decodePNG(await page.screenshot());
  const textPixels = changedPixels(outlineHidden, textHidden, layout.label);

  return { ...layout, outlinePixels, outlineRuns, textPixels };
}

async function measureDisabledRow(page, css) {
  await page.setViewportSize({ width: 320, height: 220 });
  await page.setContent(await html(css, disabledItems), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const layout = await page.evaluate(() => {
    const nav = document.querySelector('.ui-nav--tabs');
    nav.focus();
    const box = nav.getBoundingClientRect();
    return {
      active: document.activeElement === nav,
      scrolls: nav.scrollWidth > nav.clientWidth,
      outline: getComputedStyle(nav).outline,
      outlineOffset: getComputedStyle(nav).outlineOffset,
      box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height },
    };
  });
  const painted = decodePNG(await page.screenshot());
  await page.addStyleTag({ content: '.ui-nav--tabs:focus-visible { outline: none !important; }' });
  const outlineHidden = decodePNG(await page.screenshot());
  const outlinePixels = Object.fromEntries(
    Object.entries(innerRingRects(layout.box)).map(([side, rect]) => [side, changedPixels(painted, outlineHidden, rect)]),
  );
  const outlineRuns = Object.fromEntries(
    Object.entries(innerRingRects(layout.box))
      .map(([side, rect]) => [side, longestUnpaintedRun(painted, outlineHidden, rect, side)]),
  );
  return { ...layout, outlinePixels, outlineRuns };
}

function assertPainted(reading, name) {
  for (const [side, pixels] of Object.entries(reading.outlinePixels)) {
    assert.ok(pixels >= 12,
      `${name}: the ${side} side of the outline did not paint enough pixels (${pixels}): `
      + JSON.stringify(reading));
  }
  for (const [side, run] of Object.entries(reading.outlineRuns)) {
    assert.ok(run <= MAX_CLOSED_OUTLINE_GAP,
      `${name}: the ${side} side of the outline is open for ${run}px, above the `
      + `${MAX_CLOSED_OUTLINE_GAP}px tolerance: ${JSON.stringify(reading)}`);
  }
  assert.ok(reading.textPixels >= 40,
    `${name}: the current label painted only ${reading.textPixels} text pixels: ${JSON.stringify(reading)}`);
}

function assertRowRing(reading, name) {
  assert.equal(reading.active, true, `${name}: the disabled row did not take focus: ${JSON.stringify(reading)}`);
  assert.equal(reading.scrolls, true, `${name}: the fixture is not a scrolling row: ${JSON.stringify(reading)}`);
  for (const [side, pixels] of Object.entries(reading.outlinePixels)) {
    assert.ok(pixels >= 12,
      `${name}: the ${side} side of the row outline did not paint enough pixels (${pixels}): `
      + JSON.stringify(reading));
  }
  for (const [side, run] of Object.entries(reading.outlineRuns)) {
    assert.ok(run <= MAX_CLOSED_OUTLINE_GAP,
      `${name}: the ${side} side of the row outline is open for ${run}px, above the `
      + `${MAX_CLOSED_OUTLINE_GAP}px tolerance: ${JSON.stringify(reading)}`);
  }
}

function paintFailure(reading, name) {
  try {
    assertPainted(reading, name);
    return '';
  } catch (err) {
    return err.message;
  }
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
    assertPainted(fixed, 'fixed');

    const broken = await measure(page, uncapTabs(css));
    assert(broken.startHidden > 0,
      `uncapping the tab hid no label start, so the mutation proves nothing: ${JSON.stringify(broken)}`);
    assert(broken.clipped > 0,
      `uncapping the tab clipped no ring, so the mutation proves nothing: ${JSON.stringify(broken)}`);

    const noOutline = await measure(page, withoutTabOutline(css));
    assert.deepEqual(noOutline.outlinePixels, { top: 0, right: 0, bottom: 0, left: 0 },
      `removing the outline still painted a closed ring, so the mutation proves nothing: ${JSON.stringify(noOutline)}`);
    assert.match(paintFailure(noOutline, 'outline removed'), /outline did not paint enough pixels/,
      `removing the outline stayed green: ${JSON.stringify(noOutline)}`);

    const noText = await measure(page, withTransparentText(css));
    assert.equal(noText.textPixels, 0,
      `transparent text still painted pixels, so the mutation proves nothing: ${JSON.stringify(noText)}`);
    assert.match(paintFailure(noText, 'transparent text'), /current label painted only 0 text pixels/,
      `transparent text stayed green: ${JSON.stringify(noText)}`);

    const clipped = await measure(page, withClippedRightEdge(css));
    assert.equal(clipped.startHidden, 0,
      `the right-edge clip mutation also hid the label start: ${JSON.stringify(clipped)}`);
    assert.equal(clipped.clipped, 0,
      `the right-edge clip mutation also clipped geometry: ${JSON.stringify(clipped)}`);
    assert.ok(clipped.outlineRuns.right > MAX_CLOSED_OUTLINE_GAP,
      `the right-edge clip mutation did not open the right outline: ${JSON.stringify(clipped)}`);
    assert.match(paintFailure(clipped, 'right edge clip'), /right side of the outline is open/,
      `the right-edge clip mutation stayed green: ${JSON.stringify(clipped)}`);

    const adjacent = await measure(page, withAdjacentBadgeChange(css));
    assert.equal(adjacent.startHidden, 0,
      `an adjacent badge paint change hid the label start: ${JSON.stringify(adjacent)}`);
    assert.equal(adjacent.clipped, 0,
      `an adjacent badge paint change clipped the focus ring: ${JSON.stringify(adjacent)}`);
    assertPainted(adjacent, 'adjacent badge change');

    const disabledRow = await measureDisabledRow(page, css);
    assertRowRing(disabledRow, 'all-disabled row');

    t.diagnostic(`fixed ${JSON.stringify(fixed)}`);
    t.diagnostic(`uncapped ${JSON.stringify(broken)}`);
    t.diagnostic(`no outline ${JSON.stringify(noOutline)}`);
    t.diagnostic(`transparent text ${JSON.stringify(noText)}`);
    t.diagnostic(`right edge clip ${JSON.stringify(clipped)}`);
    t.diagnostic(`adjacent badge ${JSON.stringify(adjacent)}`);
    t.diagnostic(`all-disabled row ${JSON.stringify(disabledRow)}`);
    t.diagnostic(`outline closure tolerance ${MAX_CLOSED_OUTLINE_GAP}px, from the fixed case's largest measured gap `
      + `${Math.max(...Object.values(fixed.outlineRuns))}px plus one antialiasing pixel`);
  } finally {
    await page.close();
    await browser.close();
  }
});
