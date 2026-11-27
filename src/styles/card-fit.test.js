import { splitSelectorList } from '../../scripts/lib/selector-list.js';
/* Rule: a card sized to its contents is capped at the room it has.
 *
 * `.ui-card--fit` ends a card where its table ends (#504). The hazard it introduces is the
 * opposite one: a width that is not a percentage escapes its column and pushes the page
 * sideways. So every width a card rule sets is read out of the sheet and must carry a cap.
 *
 * Subjects come from the sheet, not from a list here, so a modifier added later is a
 * subject the day it lands. Limits: jsdom computes no width and renders no page. Every
 * number behind this rule is read off Chromium and recorded on the pull request.
 *
 * why: docs/foundations.md#spacing-and-rhythm
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(path.join(HERE, 'card.css'), 'utf8');

// A comment names declarations in prose, so it goes before any body is read.
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Top-level rules only; a card sets no width inside a media block today. */
const rulesIn = (css) => [...noComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector.trim(), body }))
  .filter(({ selector }) => selector && !selector.startsWith('@'));

const declaration = (body, property) => {
  const found = [...body.matchAll(new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;}]+)`, 'g'))];
  return found.length ? found[found.length - 1][1].trim() : null;
};

/** Every rule that gives a card a width of its own. */
const cardWidthRules = (css) => rulesIn(css)
  .filter(({ selector, body }) => /\.ui-card(?:--[\w-]+)?\b/.test(selector)
    && !/__/.test(selector) && declaration(body, 'width'));

function cardWidths(css) {
  const rules = cardWidthRules(css);
  assert.ok(rules.length > 0, 'no card rule sets a width — the subject is gone');
  const problems = [];
  let measured = 0;

  for (const { selector, body } of rules) {
    const width = declaration(body, 'width');
    const cap = declaration(body, 'max-width');
    // A percentage, `auto` or `inherit` cannot exceed the column by itself. Anything
    // sized to its own contents — fit-content, max-content, a length — can, so it
    // carries the cap in the same rule where a reader of the sheet will find it.
    const contained = /^(auto|inherit|100%|\d+(?:\.\d+)?%)$/.test(width);
    if (!contained && cap !== '100%') {
      problems.push(`${selector} sizes a card to its contents (width: ${width}) and is not capped at 100%`);
    }
    measured += 1;
  }
  assert.equal(measured, rules.length, 'every card width rule must be measured once');

  // The modifier the rule above exists for. Named, because a sheet with no card width
  // at all would otherwise satisfy every check in this function.
  const fit = rules.find(({ selector }) => splitSelectorList(selector).some((s) => s.trim() === '.ui-card--fit'));
  if (!fit) problems.push('.ui-card--fit is gone: a card around one table has nothing to end it');
  else if (declaration(fit.body, 'width') !== 'fit-content') {
    problems.push(`.ui-card--fit must size to its contents, not ${declaration(fit.body, 'width')}`);
  }
  return problems;
}

test('a card sized to its contents is capped at the room it has', () => {
  assert.deepEqual(cardWidths(CSS), []);
});

test('the card-width gate rejects a card that can push the page sideways', () => {
  for (const [name, mutation] of [
    ['the cap dropped from the fit modifier',
      CSS.replace('.ui-card--fit { width: fit-content; max-width: 100%; }', '.ui-card--fit { width: fit-content; }')],
    ['a fit modifier capped at something other than the room',
      CSS.replace('.ui-card--fit { width: fit-content; max-width: 100%; }',
        '.ui-card--fit { width: fit-content; max-width: 60rem; }')],
    ['a later modifier sized to its contents and left uncapped',
      `${CSS}\n.ui-card--hug { width: max-content; }`],
    ['a later modifier given a fixed width',
      `${CSS}\n.ui-card--panel { width: 42rem; }`],
  ]) {
    assert.ok(cardWidths(mutation).length > 0, `${name} must be rejected`);
  }
  assert.deepEqual(
    cardWidths(CSS.replace('.ui-card--fit { width: fit-content; max-width: 100%; }',
      '.ui-card--fit { width: 100%; }')),
    ['.ui-card--fit must size to its contents, not 100%'],
    'a fit modifier that fills its column instead must be reported',
  );
  assert.throws(() => cardWidths(noComments(CSS).replace(/width\s*:/g, 'inline-size:')),
    /no card rule sets a width/);
});

/* Browser half (CARD_FIT=1 with UI_PLAYWRIGHT, optionally UI_CHROME): a fit card holding a
 * table wider than its column takes the full column in Chromium, in both themes, at 390, 820
 * and 1440px. A light card hangs its side inset outside the column, 16px at 720px and below
 * and 24px above, so it is the column and both hangs wide. A narrow table still ends the card
 * inside the column. It draws raw kit markup in the browser's fallback font, so it proves the
 * edges, not a table's exact width. #924 */
const { env } = process;
const ROOT = path.resolve(HERE, '../..');
const SHEETS = [...readFileSync(path.join(ROOT, 'src/index.css'), 'utf8').matchAll(/@import "\.\/([^"]+)"/g)]
  .map((m) => path.join(ROOT, 'src', m[1]));
// The light cap from before #924: a fit card capped at the column it hangs out of.
const HANG_CAP_OFF = ['the light fit card capped at 100%',
  /:root\[data-theme="light"\] \.ui-card--fit:not\(\.ui-card--pad-lg\):not\(\.ui-card--accent\):not\(\.ui-card--live\) \{[^}]*\}\n/, ''];
const kitSheet = (mutation) => SHEETS.map((p) => {
  const css = readFileSync(p, 'utf8');
  if (!mutation || !p.endsWith('card.css')) return css;
  const broken = css.replace(mutation[1], mutation[2]);
  assert.notEqual(broken, css, `${mutation[0]}: the mutation did not apply, so it proves nothing`);
  return broken;
}).join('\n');

const row = (cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
const table = (columns) => `<table class="ui-table"><thead><tr>${Array.from({ length: columns }, (_, i) => `<th>Month ${i + 1}</th>`).join('')}</tr></thead>`
  + `<tbody>${row(Array.from({ length: columns }, (_, i) => `€ ${(12345.5 + i * 1111).toFixed(2)}`))}</tbody></table>`;
const WIDTHS = [{ width: 390, hang: 16 }, { width: 820, hang: 24 }, { width: 1440, hang: 24 }];

async function measureCards(css) {
  const pw = await import(env.UI_PLAYWRIGHT || 'playwright');
  const { chromium } = pw.chromium ? pw : pw.default;
  const browser = await chromium.launch({ executablePath: env.UI_CHROME || undefined });
  try {
    const out = [];
    for (const { width, hang } of WIDTHS) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width, height: 800 } });
        const page = await context.newPage();
        // The column pads each side by the light hang, as the page shell does.
        await page.setContent(`<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}
          body { margin: 0; } .column { margin-inline: ${hang}px; display: flex; flex-direction: column; gap: 24px; }</style></head>`
          + `<body><div class="column"><div class="ui-card ui-card--fit" id="wide">${table(30)}</div>`
          + `<div class="ui-card ui-card--fit" id="narrow">${table(2)}</div></div></body></html>`, { waitUntil: 'load' });
        const box = await page.evaluate(() => {
          const edges = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; };
          return {
            column: edges(document.querySelector('.column')),
            wide: edges(document.querySelector('#wide')),
            narrow: edges(document.querySelector('#narrow')),
            pageScroll: document.documentElement.scrollWidth - innerWidth,
          };
        });
        out.push({ cell: `${width}px ${theme}`, hang: theme === 'light' ? hang : 0, ...box });
        await context.close();
      }
    }
    return out;
  } finally {
    await browser.close();
  }
}

/** What the measured cards do wrong. One expression, so the gate and the mutation run the same code. */
function cardFaults(cells) {
  const out = [];
  if (cells.length !== WIDTHS.length * 2) out.push(`${cells.length} of ${WIDTHS.length * 2} cells measured`);
  for (const c of cells) {
    const left = c.column.left - c.hang;
    const right = c.column.right + c.hang;
    if (Math.abs(c.wide.left - left) > 0.5 || Math.abs(c.wide.right - right) > 0.5) {
      out.push(`${c.cell}: the wide fit card runs ${c.wide.left} to ${c.wide.right}px, the column and its hang ${left} to ${right}px`);
    }
    if (c.narrow.width >= c.column.width) out.push(`${c.cell}: the narrow fit card is ${c.narrow.width}px, the column ${c.column.width}px — it does not end at its table`);
    if (c.pageScroll > 0) out.push(`${c.cell}: the page scrolls ${c.pageScroll}px sideways`);
  }
  return out;
}

test('measured in Chromium: a fit card takes the full column in both themes', {
  skip: !env.CARD_FIT && 'set CARD_FIT=1 and UI_PLAYWRIGHT to run the Chrome layout gate',
}, async (t) => {
  const cells = await measureCards(kitSheet());
  for (const c of cells) t.diagnostic(`${c.cell}: column ${c.column.width}px, wide card ${c.wide.width}px, narrow card ${c.narrow.width}px`);
  assert.deepEqual(cardFaults(cells), []);
  await t.test(`the gate rejects ${HANG_CAP_OFF[0]}`, async () => {
    const found = cardFaults(await measureCards(kitSheet(HANG_CAP_OFF)));
    assert.ok(found.length > 0, `the gate passed a sheet with ${HANG_CAP_OFF[0]}`);
    t.diagnostic(found[0]);
  });
});
