/* Rule: in a form field a dropdown trigger has the text input's height and keeps the pill.
 * The text input has the field corner since #836, so the two corners differ. The chosen
 * value has the input's regular weight and normal letter spacing, and no colour of its own.
 * why: docs/components.md#fields, #812, #836
 *
 * Limits: the source half reads declarations and resolves tokens from tokens.css. It
 * does not lay anything out, and it reads no cascade, so a later rule that overrides the
 * field trigger is the browser half's to catch. The browser half (FIELD_TRIGGER=1 with
 * UI_PLAYWRIGHT, optionally UI_CHROME) draws the React Field with a TextField, a
 * Dropdown and a DatePicker, and a Dropdown with no field, in Chromium. It measures at
 * 1440 and at 390 with touch emulation, which matches (pointer: coarse), in both themes.
 * A third cell sets a host's `--text-base: 18px` on the touch phone: the trigger stays at
 * the input's 16px. One field holds a long value, which must keep one line.
 * It draws in the browser's fallback font, not IBM Plex Sans, so it proves equal heights,
 * not the 45px the served Storybook measures.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { markup } from '../../stories/lib/react-markup.js';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

// The browser half's switches, read from the environment.
const { env } = process;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const mediaBody = (css, media) => new RegExp(`@media ${media.replace(/[()]/g, '\\$&')} \\{([\\s\\S]*?)\\n\\}`).exec(decomment(css))?.[1];

const TRIGGER = '.ui-field > .ui-dropdown > .ui-dropdown__trigger';
const VALUE = `${TRIGGER} .ui-dropdown__value`;
// The rule this gate holds, deleted. Both halves must reject it.
const MUTATION = ['the field trigger rule removed', 'src/styles/dropdown.css',
  /\.ui-field > \.ui-dropdown > \.ui-dropdown__trigger \{\n[^}]*\}\n/, ''];
// The touch size written as an offset of the host's scale, as it was before #812's review.
const SCALED = ['the touch size scaled with --text-base', 'src/styles/dropdown.css',
  /(\.ui-field > \.ui-dropdown > \.ui-dropdown__trigger \{ font-size: )16px;/, '$1calc(var(--text-base) + 1.5px);'];
// The value semibold again, as the top bar's switcher drew it.
const HEAVY = ['the field value rule removed', 'src/styles/dropdown.css',
  /\.ui-field > \.ui-dropdown > \.ui-dropdown__trigger \.ui-dropdown__value \{[^}]*\}\n/, ''];
// A long value let wrap again.
const WRAP = ['a long value let wrap', 'src/styles/dropdown.css', /(overflow: hidden;)\n  white-space: nowrap;(\n  text-overflow: ellipsis;\n  text-align: start;)/, '$1$2'];

const mutate = (p, css, mutation) => {
  if (!mutation || mutation[1] !== p) return css;
  const broken = css.replace(mutation[2], mutation[3]);
  assert.notEqual(broken, css, `${mutation[0]}: the mutation did not apply, so it proves nothing`);
  return broken;
};

const tokens = Object.fromEntries([...read('src/tokens/tokens.css').matchAll(/(--[\w-]+):\s*([^;]+);/g)]
  .reverse().map((m) => [m[1], m[2].trim()]));
// Tokens, then one `calc(<px> ± <px>)`, the only arithmetic the kit's offsets use.
const resolve = (value) => value.replace(/var\((--[\w-]+)\)/g, (_, name) => {
  assert.ok(name in tokens, `${name} is not in tokens.css`);
  return resolve(tokens[name]);
}).replace(/^calc\(([\d.]+)px ([+-]) ([\d.]+)px\)$/, (_, a, op, b) => `${op === '+' ? +a + +b : a - b}px`);

/** The declarations of every rule whose selector list holds exactly `selector`, outside any @media, later ones last. */
function declarations(css, selector, media = null) {
  let body = decomment(css);
  if (media) {
    const block = new RegExp(`@media ${media.replace(/[()]/g, '\\$&')} \\{([\\s\\S]*?)\\n\\}`).exec(body);
    if (!block) return null;
    body = block[1];
  } else {
    body = body.replace(/@media[^{]*\{[\s\S]*?\n\}/g, '');
  }
  let found = null;
  for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (splitSelectorList(m[1]).map((s) => s.trim().replace(/\s+/g, ' ')).includes(selector)) {
      found = { ...found, ...Object.fromEntries([...m[2].matchAll(/([\w-]+)\s*:\s*([^;]+)/g)].map((d) => [d[1], resolve(d[2].trim())])) };
    }
  }
  return found;
}

/** What the field trigger does wrong against the input, read from source. */
function sourceFaults(mutation) {
  const dropdown = mutate('src/styles/dropdown.css', read('src/styles/dropdown.css'), mutation);
  const input = declarations(read('src/styles/input.css'), '.ui-input');
  const field = declarations(dropdown, TRIGGER);
  const touch = declarations(dropdown, TRIGGER, '(pointer: coarse)');
  const pill = declarations(dropdown, '.ui-dropdown__trigger');
  const out = [];
  if (!field) return [`dropdown.css has no ${TRIGGER} rule`];
  // The trigger is a control the reader presses, so it keeps the pill. #836
  const corner = field['border-radius'] ?? pill['border-radius'];
  if (corner !== resolve('var(--radius-pill)')) out.push(`radius ${corner}, not the pill`);
  const block = (padding) => padding.split(/\s+/)[0];
  if (block(field.padding) !== block(input.padding)) out.push(`block padding ${block(field.padding)}, the input's is ${block(input.padding)}`);
  if (field['font-size'] !== input['font-size']) out.push(`font size ${field['font-size']}, the input's is ${input['font-size']}`);
  const net = /font-size:\s*(\d+px)/.exec(read('src/styles/field-zoom.css'))[1];
  if (touch?.['font-size'] !== net) out.push(`touch font size ${touch?.['font-size']}, the input's is ${net}`);
  // Written flat, as the net is, so a host's scale cannot move it off the input.
  if (!new RegExp(`\\{\\s*font-size:\\s*${net};`).test(mediaBody(dropdown, '(pointer: coarse)') ?? '')) out.push(`touch font size is not the net's flat ${net}`);
  if (pill['border-radius'] !== resolve('var(--radius-pill)')) out.push(`the trigger outside a field lost the pill: ${pill['border-radius']}`);
  // The value reads as the input's text. A colour here would outrank the off and placeholder inks.
  const value = declarations(dropdown, VALUE);
  if (value?.['font-weight'] !== resolve('var(--weight-normal)')) out.push(`value weight ${value?.['font-weight']}, the input's is regular`);
  if (value?.['letter-spacing'] !== 'normal') out.push(`value letter spacing ${value?.['letter-spacing']}, the input's is normal`);
  if (value && 'color' in value) out.push(`the value sets colour ${value.color}`);
  return out;
}

test('source: the field trigger keeps the pill and takes the input block padding and size', () => {
  assert.deepEqual(sourceFaults(), []);
});

for (const mutation of [MUTATION, SCALED, HEAVY]) {
  test(`source: the gate rejects ${mutation[0]}`, () => {
    assert.ok(sourceFaults(mutation).length > 0);
  });
}

// The whole kit sheet, in the order index.css imports it, and the picker's own sheet.
const SHEETS = [...read('src/index.css').matchAll(/@import "\.\/([^"]+)"/g)].map((m) => `src/${m[1]}`)
  .concat('react/src/DatePicker.css');
const sheet = (mutation) => SHEETS.map((p) => mutate(p, read(p), mutation)).join('\n');
const ITEMS = [{ label: 'Avery Example', value: 'a' }, { label: 'Jordan Okafor', value: 'j' },
  { label: 'Northwind Studio, the design and print office on the third floor', value: 'n' }];
const form = () => markup(({ h, kit }) => h('div', { style: { width: '360px' } },
  h(kit.TextField, { label: 'Title', defaultValue: 'Pay the studio invoice' }),
  h(kit.Field, { label: 'Owner' }, (control) => h(kit.Dropdown, { ...control, variant: 'select', items: ITEMS, value: 'a' })),
  h(kit.Field, { label: 'Due' }, ({ id }) => h(kit.DatePicker, { id, mode: 'day', value: '2026-11-20' })),
  h(kit.Field, { label: 'Office' }, (control) => h(kit.Dropdown, { ...control, variant: 'select', items: ITEMS, value: ITEMS[2].label, selectedValue: 'n' })),
  h(kit.Dropdown, { ariaLabel: 'Status', variant: 'select', items: ITEMS, value: 'a' })));

const WIDTHS = [{ name: 'desktop', width: 1440, touch: false }, { name: 'touch phone', width: 390, touch: true },
  { name: 'touch phone, host --text-base 18px', width: 390, touch: true, host: ':root { --text-base: 18px; }' }];

async function measure(css) {
  const pw = await import(env.UI_PLAYWRIGHT || 'playwright');
  const { chromium } = pw.chromium ? pw : pw.default;
  const browser = await chromium.launch({ executablePath: env.UI_CHROME || undefined });
  const html = await form();
  try {
    const out = [];
    for (const { name, width, touch, host = '' } of WIDTHS) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: touch, isMobile: touch });
        const page = await context.newPage();
        await page.setContent(`<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}\n${host}</style></head>`
          + `<body>${html}</body></html>`, { waitUntil: 'load' });
        const box = await page.evaluate(() => {
          const text = (el) => ({ weight: getComputedStyle(el).fontWeight, spacing: getComputedStyle(el).letterSpacing });
          const one = (el) => ({ height: el.getBoundingClientRect().height, radius: getComputedStyle(el).borderTopLeftRadius,
            font: getComputedStyle(el).fontSize, ...text(el.querySelector('.ui-dropdown__value') ?? el) });
          return {
            coarse: matchMedia('(pointer: coarse)').matches,
            input: one(document.querySelector('.ui-field .ui-input')),
            field: [...document.querySelectorAll('.ui-field .ui-dropdown__trigger')].map(one),
            pill: one(document.querySelector('body > div > .ui-dropdown > .ui-dropdown__trigger')),
          };
        });
        out.push({ cell: `${name} ${theme}`, touch, ...box });
        await context.close();
      }
    }
    return out;
  } finally {
    await browser.close();
  }
}

/** What a measured form does wrong. One expression, so the gate and the mutation run the same code. */
function faults(cells) {
  const out = [];
  if (cells.length !== WIDTHS.length * 2) out.push(`${cells.length} of ${WIDTHS.length * 2} cells measured`);
  for (const c of cells) {
    if (c.coarse !== c.touch) out.push(`${c.cell}: (pointer: coarse) is ${c.coarse}, so the cell proves nothing`);
    if (c.field.length !== 3) out.push(`${c.cell}: ${c.field.length} of 3 field triggers found`);
    c.field.forEach((t, i) => {
      if (Math.abs(t.height - c.input.height) > 0.5) out.push(`${c.cell}: field trigger ${i + 1} is ${t.height}px, the input ${c.input.height}px`);
      if (t.radius !== resolve('var(--radius-pill)')) out.push(`${c.cell}: field trigger ${i + 1} radius ${t.radius}, not the pill`);
      if (t.font !== c.input.font) out.push(`${c.cell}: field trigger ${i + 1} text ${t.font}, the input's ${c.input.font}`);
      if (t.weight !== c.input.weight || t.spacing !== c.input.spacing) {
        out.push(`${c.cell}: field value ${i + 1} weight ${t.weight} spacing ${t.spacing}, the input's ${c.input.weight} ${c.input.spacing}`);
      }
    });
    if (c.pill.radius !== resolve('var(--radius-pill)')) out.push(`${c.cell}: the trigger outside a field has radius ${c.pill.radius}`);
  }
  return out;
}

test('measured in Chromium: a field trigger is as high as the input, both widths and themes', {
  skip: !env.FIELD_TRIGGER && 'set FIELD_TRIGGER=1 and UI_PLAYWRIGHT to run the Chrome layout gate',
}, async (t) => {
  const cells = await measure(sheet());
  for (const c of cells) t.diagnostic(`${c.cell}: input ${c.input.height}px, triggers ${c.field.map((f) => f.height).join(' and ')}px, pill radius ${c.pill.radius}`);
  assert.deepEqual(faults(cells), []);
  for (const mutation of [MUTATION, SCALED, WRAP, HEAVY]) {
    await t.test(`the gate rejects ${mutation[0]}`, async () => {
      const found = faults(await measure(sheet(mutation)));
      assert.ok(found.length > 0, `the gate passed a sheet with ${mutation[0]}`);
      t.diagnostic(found[0]);
    });
  }
});
