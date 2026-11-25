/* Rule: a native select in a form field fits its longest option, capped at the field
 * width. A short list does not fill the field, and a long option does not outgrow it.
 * why: docs/components.md#fields, #874
 *
 * Limits: the source half reads declarations. The browser half (SELECT_FIT=1 with
 * UI_PLAYWRIGHT, optionally UI_CHROME) draws a native select inside a field in Chromium
 * and measures the short and the long case. It proves the two floors, not the exact
 * option width, and reads only this rule: the chevron and the pill are held by
 * stories/select-chevron.test.js and src/styles/control-shape.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

const { env } = process;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const RULE = '.ui-field > .ui-select';
const SHEET = 'src/styles/input.css';
// The rule this gate holds, and the two things in it that must stay: the fit and the cap.
const FIT_OFF = ['the select fit removed', SHEET,
  /(\.ui-field > \.ui-select \{ width: )fit-content(; max-width: 100%; \})/, '$1' + '100%$2'];
const CAP_OFF = ['the select field cap removed', SHEET,
  /(\.ui-field > \.ui-select \{ width: fit-content; max-width: )100%(; \})/, '$1' + 'none$2'];

/** The width and cap of the rule that sizes a form select, read from one sheet's text. */
function selectWidthDeclarations(css) {
  for (const m of decomment(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!splitSelectorList(m[1]).map((s) => s.trim().replace(/\s+/g, ' ')).includes(RULE)) continue;
    const body = m[2];
    return {
      width: /(?:^|;)\s*width\s*:\s*([^;]+)/.exec(body)?.[1].trim(),
      maxWidth: /(?:^|;)\s*max-width\s*:\s*([^;]+)/.exec(body)?.[1].trim(),
    };
  }
  return null;
}

/** What the select's width rule does wrong, read from source. */
function sourceFaults(css) {
  const d = selectWidthDeclarations(css);
  if (!d) return [`input.css has no ${RULE} rule`];
  const out = [];
  if (d.width !== 'fit-content') out.push(`width ${d.width}, not fit-content`);
  if (d.maxWidth !== '100%') out.push(`max-width ${d.maxWidth}, not 100%`);
  return out;
}

test('source: a form select fits its longest option and caps at the field width', () => {
  assert.deepEqual(sourceFaults(read(SHEET)), []);
});

for (const mutation of [FIT_OFF, CAP_OFF]) {
  test(`source: the gate rejects ${mutation[0]}`, () => {
    const broken = read(mutation[1]).replace(mutation[2], mutation[3]);
    assert.notEqual(broken, read(mutation[1]), `${mutation[0]}: the mutation did not apply, so it proves nothing`);
    assert.ok(sourceFaults(broken).length > 0);
  });
}

// The whole kit sheet, in the order index.css imports it.
const SHEETS = [...read('src/index.css').matchAll(/@import "\.\/([^"]+)"/g)].map((m) => `src/${m[1]}`);
const sheet = (mutation) => SHEETS.map((p) => {
  if (!mutation || mutation[1] !== p) return read(p);
  const broken = read(p).replace(mutation[2], mutation[3]);
  assert.notEqual(broken, read(p), `${mutation[0]}: the mutation did not apply, so it proves nothing`);
  return broken;
}).join('\n');

// A field 360px wide: the short list should fit far under it, the long option should cap at it.
const form = () => `<div style="width: 360px">
  <div class="ui-field"><label class="ui-field__label" for="short">Currency</label>
    <select id="short" class="ui-select"><option>EUR</option><option>USD</option></select></div>
  <div class="ui-field"><label class="ui-field__label" for="long">Owner</label>
    <select id="long" class="ui-select"><option>Northwind Studio, the design and print office on the third floor</option><option>EUR</option></select></div>
</div>`;

const WIDTHS = [390, 1440];

async function measure(css) {
  const pw = await import(env.UI_PLAYWRIGHT || 'playwright');
  const { chromium } = pw.chromium ? pw : pw.default;
  const browser = await chromium.launch({ executablePath: env.UI_CHROME || undefined });
  try {
    const out = [];
    for (const width of WIDTHS) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width, height: 800 } });
        const page = await context.newPage();
        await page.setContent(`<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head><body>${form()}</body></html>`, { waitUntil: 'load' });
        const box = await page.evaluate(() => {
          const short = document.querySelector('#short').getBoundingClientRect().width;
          const long = document.querySelector('#long').getBoundingClientRect().width;
          const field = document.querySelector('#short').closest('.ui-field').getBoundingClientRect().width;
          return { short, long, field };
        });
        out.push({ cell: `${width}px ${theme}`, ...box });
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
    // The fit: a short list takes its options' width, so it sits well inside the field.
    if (c.short >= c.field - 0.5) out.push(`${c.cell}: the short select is ${c.short}px, the field ${c.field}px — it fills the field instead of fitting its options`);
    // The cap: the longest option must not push the select past the field.
    if (c.long > c.field + 0.5) out.push(`${c.cell}: the long select is ${c.long}px, wider than the field ${c.field}px — the cap is lost`);
  }
  return out;
}

test('measured in Chromium: a form select fits its options and caps at the field width', {
  skip: !env.SELECT_FIT && 'set SELECT_FIT=1 and UI_PLAYWRIGHT to run the Chrome layout gate',
}, async (t) => {
  const cells = await measure(sheet());
  for (const c of cells) t.diagnostic(`${c.cell}: short ${c.short}px, long ${c.long}px, field ${c.field}px`);
  assert.deepEqual(faults(cells), []);
  for (const mutation of [FIT_OFF, CAP_OFF]) {
    await t.test(`the gate rejects ${mutation[0]}`, async () => {
      const found = faults(await measure(sheet(mutation)));
      assert.ok(found.length > 0, `the gate passed a sheet with ${mutation[0]}`);
      t.diagnostic(found[0]);
    });
  }
});
