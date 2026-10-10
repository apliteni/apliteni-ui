/* Rule: every floating panel the kit draws caps its height at the room between
 * its trigger and the viewport edge it opens towards, scrolls inside that cap,
 * and keeps the wheel over it from reaching the page underneath. That is #489.
 *
 * The source half below runs in CI. The browser half at the foot of the file is
 * opt-in and states its own limits there, the way stories/dropdown-contain.test.js's
 * does for the horizontal axis.
 * why: docs/components.md#the-dropdown-panel
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { dropdown, wireDropdown, dropdownAvail, dropdownHeightFit } from '../src/components/dropdown.js';
import { serve, playwright, openStory } from './lib/dropdown-contain.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const decomment = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const SHEET = 'src/styles/dropdown.css';
const css = decomment(read(SHEET));

/* -- The arithmetic ---------------------------------------------------------- */

test('a menu opened 300px above the bottom of a phone is capped short of its content', () => {
  // The issue's own acceptance case: a 390x844 phone, a trigger ending 300px
  // above the bottom. 12 rows run well past this; the cap has to be short of
  // their full height and still end inside the viewport.
  const avail = dropdownAvail({
    anchorTop: 513, anchorBottom: 544, viewport: 844, gap: 9, inset: 8, min: 120,
  });
  assert.equal(avail, 300 - 9 - 8, 'the 300px below, less the trigger gap and the edge inset');
  const bottom = 544 + 9 + avail;
  assert.equal(bottom, 844 - 8, 'the panel ends one edge-inset above the viewport\'s bottom edge');
});

test('the floor spends the edge inset, never the room past the edge', () => {
  // A trigger with its bottom 15px of raw room past the gap — short of the
  // 120px floor, but only 27px short of the viewport edge, not past it.
  const avail = dropdownAvail({
    anchorTop: 777, anchorBottom: 808, viewport: 844, gap: 9, inset: 8, min: 120,
  });
  assert.equal(avail, 844 - 808 - 9, 'the floor reaches for 120 but stops at the room before the edge');
  assert.equal(808 + 9 + avail, 844, 'the panel ends exactly at the edge, never past it');
});

test('a trigger with no room left keeps a nought-pixel cap rather than overhang', () => {
  // The gap alone already reaches the edge: there is no room the floor could
  // spend without passing it.
  const avail = dropdownAvail({
    anchorTop: 808, anchorBottom: 839, viewport: 844, gap: 9, inset: 8, min: 120,
  });
  assert.equal(avail, 0);
});

test('the floor cannot be asked to spend room upward instead of the inset', () => {
  // `up` measures from the trigger's own top, the same shape in both directions.
  const avail = dropdownAvail({
    anchorTop: 36, anchorBottom: 67, viewport: 844, gap: 9, inset: 8, min: 120, up: true,
  });
  assert.equal(avail, 36 - 9, 'the floor reaches for 120 but stops at the room before the top edge');
});

/* -- The stylesheet ----------------------------------------------------------- */

test('the floor a capped panel keeps is one named number', () => {
  const declared = [...css.matchAll(/--ui-dropdown-min:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.deepEqual(
    declared, ['120px'],
    `${SHEET} declares --ui-dropdown-min ${declared.length} times. The wiring reads this property `
    + 'off the panel, so a second declaration is two different floors for one panel.',
  );
});

test('every panel caps its height at the smaller of what was asked and what is left', () => {
  const panel = css.split(/\.ui-dropdown__panel\s*\{/)[1]?.split('}')[0] ?? '';
  assert.match(
    panel, /max-height:\s*min\(\s*var\(--ui-dropdown-cap/,
    `${SHEET}'s .ui-dropdown__panel no longer caps itself at min(cap, avail). Unset, a panel took `
    + 'its content\'s height until it ran off the screen — #489.',
  );
  assert.match(panel, /overflow-y:\s*auto/, 'the panel has to scroll once it is capped');
  assert.match(
    panel, /overscroll-behavior:\s*contain/,
    'without this, the wheel over a capped panel keeps going once it reaches the panel\'s own end, '
    + 'and scrolls the page underneath — the second half of #489.',
  );
});

test('`.is-scroll` asks for 300px through the cap property, not through max-height directly', () => {
  assert.doesNotMatch(
    css, /\.is-scroll\s*\{[^}]*max-height/,
    '.is-scroll sets max-height directly, which would outrank the panel\'s own min() and put it '
    + 'back past the viewport edge whenever the measured room is smaller than 300px.',
  );
  const rule = css.split(/\.ui-dropdown__panel\.is-scroll\s*\{/)[1]?.split('}')[0] ?? '';
  assert.match(rule, /--ui-dropdown-cap:\s*300px/);
});

test('the search list reads the same cap property, so a field above it does not widen the room', () => {
  const list = css.split(/\n\.ui-dropdown__list\s*\{/)[1]?.split('}')[0] ?? '';
  assert.match(list, /max-height:\s*var\(--ui-dropdown-cap,\s*300px\)/);
  assert.match(list, /overscroll-behavior:\s*contain/);
});

test('a search panel is a column, so the cap lands on the rows and not on the field', () => {
  const rule = css.split(/\.ui-dropdown__panel--search\s*\{/)[1]?.split('}')[0] ?? '';
  assert.match(rule, /display:\s*flex/);
  assert.match(rule, /flex-direction:\s*column/);
  assert.match(css, /\.ui-dropdown__panel--search\s*>\s*\.ui-dropdown__list\s*\{[^}]*flex:\s*1/);
});

/* -- The wiring, in JSDOM ----------------------------------------------------- */

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});
const MENU = [{ label: 'Settings' }, { label: 'Billing' }, { label: 'Sign out' }];
const TWELVE = Array.from({ length: 12 }, (_, i) => ({ label: `Row ${i + 1}` }));
const click = (window, el) =>
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

/** A wired dropdown on a `view.h`-tall phone, with its trigger `bottom` px down. */
function phone(html, { bottom, view = 844 }) {
  const dom = new JSDOM(`<!doctype html><html><body><main>${html}</main></body></html>`, {
    pretendToBeVisual: true, virtualConsole: quiet,
  });
  const { window } = dom;
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, { value: window[key] ?? window, configurable: true, writable: true });
  }
  Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: view, configurable: true });
  Object.defineProperty(window.document.documentElement, 'clientWidth', { value: 390, configurable: true });
  const doc = window.document;
  const trigger = doc.querySelector('[data-dropdown-trigger]');
  const panel = doc.querySelector('[data-dropdown-panel]');
  trigger.getBoundingClientRect = () => ({
    top: bottom - 31, bottom, left: 16, right: 176, width: 160, height: 31, x: 16, y: bottom - 31,
  });
  wireDropdown(doc);
  return { window, doc, trigger, panel };
}

test('opening writes the measured room onto the panel', () => {
  const { window, trigger, panel } = phone(
    dropdown({ value: 'Account', variant: 'menu', items: TWELVE }), { bottom: 544 },
  );
  click(window, trigger);
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-avail'), `${844 - 544 - 9 - 8}px`);
});

test('a portalled panel is measured the same way as an in-place one', () => {
  const { window, trigger, panel } = phone(
    dropdown({ value: 'Account', variant: 'menu', items: TWELVE, portal: true }), { bottom: 544 },
  );
  click(window, trigger);
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-avail'), `${844 - 544 - 9 - 8}px`);
});

test('the room is re-measured on scroll, because the trigger moves and the viewport edge does not', () => {
  const { window, trigger, panel } = phone(
    dropdown({ value: 'Account', variant: 'menu', items: TWELVE }), { bottom: 200 },
  );
  click(window, trigger);
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-avail'), `${844 - 200 - 9 - 8}px`);
  trigger.getBoundingClientRect = () => ({
    top: 569, bottom: 600, left: 16, right: 176, width: 160, height: 31, x: 16, y: 569,
  });
  window.dispatchEvent(new window.Event('scroll'));
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-avail'), `${844 - 600 - 9 - 8}px`);
});

test('dropdownHeightFit answers nothing when there is nothing to measure', () => {
  assert.equal(dropdownHeightFit(null, null), null);
  assert.equal(dropdownHeightFit(undefined, undefined), null);
});

test('a dropdown rendered already open is capped at wiring time, with no click to do it', () => {
  const { panel } = phone(
    dropdown({ value: 'Account', variant: 'menu', items: TWELVE, open: true }), { bottom: 544 },
  );
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-avail'), `${844 - 544 - 9 - 8}px`);
});

/* -- The browser half --------------------------------------------------------- */
/* The measurement. JSDOM lays nothing out, so where a panel's edge actually lands,
 * and whether a wheel event scrolls the panel or the page underneath it, are both
 * invisible to every gate above. Off unless DROPDOWN_REACH=1: Playwright is
 * deliberately not a dependency of this package, CI does not run it, and the
 * result is reported by hand in the pull request.
 *
 *   UI_PLAYWRIGHT=… UI_CHROME=… DROPDOWN_REACH=1 node --test stories/dropdown-reach.test.js
 *
 * Its limits: one engine, Chrome for Testing through whichever Playwright the
 * host supplies; the React half needs react/storybook-static built first; and
 * the wheel is dispatched over the panel's own centre, not over a row — a reader
 * who wheels while hovering a row is the same scroll container either way.
 */
const RUN = process.env.DROPDOWN_REACH === '1';
const VIEWPORT = { width: 390, height: 844 };

test('the last row is reachable near the bottom edge, and the wheel over the panel leaves the page scroll at 0', {
  skip: !RUN && 'set DROPDOWN_REACH=1',
}, async () => {
  const pw = await playwright();
  assert.ok(pw, 'DROPDOWN_REACH=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const reactBuild = path.join(root, 'react/storybook-static');
  assert.ok(
    existsSync(path.join(reactBuild, 'index.json')),
    `no Storybook build at ${reactBuild} — run: npm run build-storybook -w react.`,
  );

  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const vanilla = await serve(root, path.join(root, 'stories/lib/dropdown-reach.html'));
  const react = await serve(reactBuild, path.join(root, 'stories/lib/dropdown-reach.html'));

  const measure = async (page) => {
    const panel = page.locator('[data-dropdown-panel]');
    const lastRow = page.locator('[data-dropdown-panel] [data-dd-item]').last();
    await panel.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    const panelBox = await panel.boundingBox();
    const rowBox = await lastRow.boundingBox();
    // A panel near the edge can sit mostly or wholly off-screen before the wheel
    // moves anything — exactly the geometry under test — so the mouse is moved to
    // its box directly, clamped into the viewport, rather than through an
    // actionability check that requires the target already be visible.
    if (panelBox) {
      const x = Math.min(Math.max(panelBox.x + panelBox.width / 2, 1), VIEWPORT.width - 1);
      const y = Math.min(Math.max(panelBox.y + panelBox.height / 2, 1), VIEWPORT.height - 1);
      await page.mouse.move(x, y);
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(50);
    }
    const pageScroll = await page.evaluate(() => window.scrollY);
    return { panelBox, rowBox, pageScroll };
  };

  try {
    const cases = [];

    // Vanilla, both placements, both the acceptance case and the near-edge one.
    for (const portal of [false, true]) {
      for (const bottomGap of [300, 36]) {
        const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        await page.goto(
          `http://127.0.0.1:${vanilla.port}/__shot?portal=${portal ? 1 : 0}&bottomGap=${bottomGap}`,
          { waitUntil: 'load' },
        );
        await page.waitForFunction(() => window.__ready === true);
        await page.locator('[data-dropdown-trigger]').click();
        const got = await measure(page);
        cases.push({ label: `vanilla ${portal ? 'portalled' : 'ordinary'} bottomGap=${bottomGap}`, ...got });
        await ctx.close();
      }
    }

    // React, the two stories built for this case.
    const all = JSON.parse(readFileSync(path.join(reactBuild, 'index.json'), 'utf8')).entries;
    for (const id of ['react-dropdown--bottom-edge', 'react-dropdown--near-bottom-edge']) {
      const story = Object.values(all).find((e) => e.id === id);
      assert.ok(story, `no built React story with the id ${id} — react/src/Dropdown.stories.tsx may have moved it.`);
      const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const opened = await openStory(page, story, { port: react.port, theme: 'dark' });
      assert.equal(opened.phase, 'finished', `React story ${id} did not finish rendering: ${opened.phase}`);
      const got = await measure(page);
      cases.push({ label: `react ${id}`, ...got });
      await ctx.close();
    }

    console.log(cases.map((c) => `${c.label}: panel bottom ${c.panelBox?.y + c.panelBox?.height}, `
      + `last row ${c.rowBox?.y}…${c.rowBox?.y + c.rowBox?.height}, page scroll ${c.pageScroll}`).join('\n'));

    const outside = cases.filter((c) => !c.panelBox || c.panelBox.y + c.panelBox.height > VIEWPORT.height + 0.5);
    assert.deepEqual(outside.map((c) => c.label), [], 'a panel ran past the viewport edge');

    const unreachable = cases.filter((c) => !c.rowBox || c.rowBox.y >= VIEWPORT.height || c.rowBox.y + c.rowBox.height <= 0);
    assert.deepEqual(unreachable.map((c) => c.label), [], 'the last row never entered the viewport');

    const leaked = cases.filter((c) => c.pageScroll !== 0);
    assert.deepEqual(leaked.map((c) => c.label), [], 'the wheel over the panel scrolled the page instead of the panel');
  } finally {
    await browser.close();
    vanilla.proc.kill();
    react.proc.kill();
  }
});
