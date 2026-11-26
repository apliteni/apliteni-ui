/* Rule: a small search field, filter chip, Filter add button, dropdown trigger and wordless
 * button stand one height on one toolbar line: 32px with a mouse, 40px on a touch screen.
 * Their size prop gives the height, so a field in a wrapper or a filter bar outside the
 * toolbar keeps it.
 * Below the phone step on a touch screen, each of those controls but the field reaches the
 * 44px tap floor.
 *
 * The browser half of react/src/SearchField.test.tsx, which reads the cascade in CI. This
 * half measures the pixels, off unless CONTROL_HEIGHTS=1, because Playwright is
 * deliberately not a dependency:
 *
 *   npm run build -w react
 *   UI_PLAYWRIGHT=…/playwright/index.mjs CONTROL_HEIGHTS=1 node --test stories/control-height.test.js
 *
 * Limits: it measures Chromium only, in the dark theme, with the default accent. The field
 * is held to its 40px paint, not to the tap floor: no #903 criterion asks for its label to
 * grow. The floor is read with the probe of stories/tap-zone.test.js, which samples each
 * edge on the centre lines, not each corner.
 *
 * why: docs/components.md#toolbar
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from 'node:process';
import { markup } from './lib/react-markup.js';
import { kitStylesheet, playwright, pass, flatten, name } from './lib/tap-zone.js';
import { TAP_MIN, TAP_EXEMPT } from './guidelines/_accessibility-floor.js';

const CONTROLS = {
  field: '.ui-input--sm',
  chip: '.ui-filter-bar__chip',
  add: '[data-filter-add] .ui-dropdown__trigger',
  trigger: '.ui-toolbar > .ui-dropdown > .ui-dropdown__trigger',
  button: '.ui-btn--icon',
  clear: '[data-filter-clear] .ui-btn',
};
// The two structures #903 measured: all in one toolbar, then the field in a wrapper and
// the bar outside the toolbar.
const STRUCTURES = ['one toolbar', 'wrapped'];

const html = (structure) => markup(({ h, kit }) => {
  const noop = () => {};
  const field = h(kit.SearchField, { ariaLabel: 'Search invoices', size: 'sm' });
  const bar = h(kit.FilterBar, {
    size: 'sm', label: 'Invoice filters', onChange: noop, onRemove: noop, onClear: noop, onAdd: noop,
    filters: [{ id: 'status', label: 'Status', value: 'Pending', items: [{ label: 'Any', value: '' }, { label: 'Pending', value: 'Pending' }] }],
    add: [{ id: 'currency', label: 'Currency', items: [{ label: 'EUR', value: 'EUR' }] }],
  });
  const wrapped = structure === 'wrapped';
  // The kit's page column, which spaces a toolbar from the block under it, as a page does.
  return h('div', { className: 'ui-app__body', style: { padding: '16px' } },
    h('div', { className: 'ui-toolbar' },
      wrapped ? h('div', null, field) : field,
      h(kit.Dropdown, { variant: 'select', size: 'sm', ariaLabel: 'Currency', items: [{ label: 'EUR', value: 'EUR' }] }),
      wrapped ? null : h('div', null, bar),
      h(kit.Button, { size: 'sm', iconOnly: true, icon: 'x' }, 'Close search')),
    wrapped ? bar : null);
});

const on = env.CONTROL_HEIGHTS === '1';

test('the small controls stand one height in a browser, with a mouse and on a touch screen', { skip: !on && 'set CONTROL_HEIGHTS=1' }, async () => {
  const pw = await playwright();
  assert.ok(pw, 'no Playwright could be resolved: point UI_PLAYWRIGHT at its index.mjs');
  const css = kitStylesheet();
  const browser = await pw.chromium.launch();
  try {
    // A mouse on a laptop, and touch on a tablet and a phone.
    for (const [width, coarse, height] of [[1280, false, 32], [820, true, 40], [390, true, 40]]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: coarse, reducedMotion: 'reduce' });
      try {
        const page = await ctx.newPage();
        await page.setContent(`<!doctype html><html lang="en" data-theme="dark"><head><style>${css}</style></head><body></body></html>`);
        assert.equal(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), coarse,
          `the ${width}px context did not take the pointer it was given`);
        for (const structure of STRUCTURES) {
          const markupHtml = await html(structure);
          const got = await page.evaluate(({ body, controls }) => {
            document.body.innerHTML = body;
            const box = (selector) => document.querySelector(selector)?.getBoundingClientRect();
            return Object.fromEntries(Object.entries(controls).map(([key, selector]) => {
              const b = box(selector);
              return [key, b ? Math.round(b.height * 100) / 100 : null];
            }).concat([['buttonWidth', Math.round(box(controls.button).width * 100) / 100]]));
          }, { body: markupHtml, controls: CONTROLS });
          const want = Object.fromEntries(Object.keys(got).map((key) => [key, height]));
          assert.deepEqual(got, want, `${structure} at ${width}px ${coarse ? 'with touch' : 'with a mouse'}`);
        }
      } finally {
        await ctx.close();
      }
    }
    // The tap floor below the phone step, with the kit's tap-zone sheet in the cascade.
    const subjects = await Promise.all(STRUCTURES.map(async (id) => ({ id, html: await html(id) })));
    const { media, rows } = await pass(browser, { subjects, css, width: 390, coarse: true, size: TAP_MIN });
    assert.ok(media.coarse, 'the phone pass ran as a mouse');
    // The field, and a target the kit exempts on the Accessibility minimums page, such as
    // the chip's remove mark, are left out.
    const exempt = TAP_EXEMPT.map((e) => e.selector.replace(/^\./, ''));
    const targets = flatten(rows).filter((t) => !t.cls.split(/\s+/).some((c) => c === 'ui-input' || exempt.includes(c)));
    // Per structure: the chip's trigger, Filter, the dropdown trigger, the button and Clear all.
    assert.equal(targets.length, 2 * 5, `measured ${targets.map(name).join(', ')}`);
    for (const t of targets) {
      assert.ok(t.reach[0] >= TAP_MIN - 0.5 && t.reach[1] >= TAP_MIN - 0.5,
        `${t.story}: ${name(t)} reaches ${t.reach.join('x')}, not ${TAP_MIN}x${TAP_MIN}`);
    }
  } finally {
    await browser.close();
  }
});
