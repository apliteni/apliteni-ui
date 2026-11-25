/* Rule: a picker trigger holding a mark is as high as a trigger without one. In a field
 * that is 42px: the 16px line, 12px of padding on each side and the 1px edges. #812
 * why: docs/components.md#avatar
 *
 * The mark is 24px and gives back room with a negative block margin on each side, so the
 * row stays as tall as the 16px value line. A pull of 3px left the row 18px and the
 * trigger 44px; 4px leaves 16px.
 *
 * The mark stands as far inside the trigger's left edge as inside its top and bottom
 * edges, within half a pixel. The browser half measures this with the ring and with a
 * person, and rejects the sheet with the field's inset rule removed.
 *
 * Limits: the fixture pins the trigger's line to 16px, because the kit's own face sets a
 * `normal` line that depends on the font file and this host has none; the built Storybook
 * measure in the PR carries the real face. The source half reads the pull and does the arithmetic against the 16px value
 * line a browser measured; it does not lay anything out. The browser half
 * (AVATAR_TRIGGER=1 with UI_PLAYWRIGHT, optionally UI_CHROME) measures the trigger in
 * Chromium, with the dashed ring and with a chosen person, in both themes, on the React
 * Dropdown's markup (stories/lib/react-markup.js).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { markup } from '../../stories/lib/react-markup.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
// The whole kit sheet, in the order index.css imports it.
const SHEETS = [...read('src/index.css').matchAll(/@import "\.\/([^"]+)"/g)].map((m) => `src/${m[1]}`);
const VALUE_LINE = 16;
const PULL = /--ui-avatar-pull:\s*(\d+)px/;
// The field trigger's rule that sets the mark's left inset, deleted.
const INSET = /\.ui-field > \.ui-dropdown > \.ui-dropdown__trigger \.ui-avatar \{[^}]*\}\n/;
const offCentre = (cells) => cells.filter((c) => c.inset).flatMap(({ inset: { left, top, bottom } }) =>
  (Math.abs(left - top) > 0.5 || Math.abs(bottom - top) > 0.5 ? [`left ${left}px, top ${top}px, bottom ${bottom}px`] : []));

test('the pull gives back exactly the room the 24px mark takes over the value line', () => {
  const m = PULL.exec(read('src/styles/dropdown.css'));
  assert.ok(m, 'dropdown.css no longer declares --ui-avatar-pull');
  assert.equal(24 - 2 * Number(m[1]), VALUE_LINE, `a pull of ${m[1]}px leaves the mark ${24 - 2 * Number(m[1])}px against a ${VALUE_LINE}px value line`);
});

test('a pull of 3px is rejected by the sweep', () => {
  const css = read('src/styles/dropdown.css').replace(PULL, '--ui-avatar-pull: 3px');
  assert.notEqual(css, read('src/styles/dropdown.css'));
  assert.notEqual(24 - 2 * Number(PULL.exec(css)[1]), VALUE_LINE);
});

const PEOPLE = [{ label: 'No one', value: '', avatar: { empty: true } },
  { label: 'Jordan Okafor', value: 'u1', avatar: { key: 'u1', name: 'Jordan Okafor' } }];
const picker = (chosen) => markup(({ h, kit }) => h(kit.Field, { label: 'Owner' }, (control) => h(kit.Dropdown, {
  ...control, variant: 'select', placeholder: 'Choose a person', value: chosen ? 'u1' : undefined, items: PEOPLE,
})));
const plain = () => markup(({ h, kit }) => h(kit.Field, { label: 'Owner' },
  (control) => h(kit.Dropdown, { ...control, variant: 'select', placeholder: 'Choose', items: [{ label: 'Jordan Okafor', value: 'u1' }] })));

async function measure(css, theme) {
  const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const { chromium } = pw.chromium ? pw : pw.default;
  const browser = await chromium.launch({ executablePath: process.env.UI_CHROME || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.setContent(`<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}\n.ui-dropdown__trigger { line-height: ${VALUE_LINE}px; }</style></head><body>`
      + `<div style="max-width:420px">${await plain()}</div><div style="max-width:420px">${await picker(false)}</div><div style="max-width:420px">${await picker(true)}</div></body></html>`, { waitUntil: 'load' });
    return await page.evaluate(() => [...document.querySelectorAll('.ui-dropdown__trigger')].map((t) => {
      const box = t.getBoundingClientRect();
      const mark = t.querySelector('.ui-avatar')?.getBoundingClientRect();
      const edge = parseFloat(getComputedStyle(t).borderTopWidth);
      const inset = mark && { left: mark.left - box.left - edge, top: mark.top - box.top - edge, bottom: box.bottom - mark.bottom - edge };
      return { height: box.height, inset };
    }));
  } finally {
    await browser.close();
  }
}

test('measured in Chromium: the trigger is 42px with the ring and with a person, both themes', {
  skip: !process.env.AVATAR_TRIGGER && 'set AVATAR_TRIGGER=1 and UI_PLAYWRIGHT to run the Chrome layout gate',
}, async (t) => {
  const css = SHEETS.map(read).join('\n');
  for (const theme of ['light', 'dark']) {
    const cells = await measure(css, theme);
    const [none, ring, person] = cells.map((c) => c.height);
    t.diagnostic(`${theme}: no mark ${none}px, dashed ring ${ring}px, chosen person ${person}px, mark inset ${JSON.stringify(cells[2].inset)}`);
    assert.deepEqual(offCentre(cells), [], `${theme}: the mark's left inset differs from its top and bottom insets`);
    assert.equal(none, 42, `${theme}: the plain trigger is ${none}px, so the premise is off`);
    assert.equal(ring, 42, `${theme}: the trigger with the dashed ring is ${ring}px`);
    assert.equal(person, 42, `${theme}: the trigger with a chosen person is ${person}px`);
  }
  await t.test('with the pull at 3px the trigger grows', async () => {
    const broken = css.replace(PULL, '--ui-avatar-pull: 3px');
    assert.notEqual(broken, css);
    const [, { height: ring }] = await measure(broken, 'light');
    assert.equal(ring, 44, 'the old pull no longer grows the trigger, so this check would pass over the defect');
  });
  await t.test('with the field inset rule removed the mark sits nearer the left edge', async () => {
    const broken = css.replace(INSET, '');
    assert.notEqual(broken, css);
    const found = offCentre(await measure(broken, 'light'));
    assert.ok(found.length > 0, 'the gate passed a mark off centre');
    t.diagnostic(found[0]);
  });
});
