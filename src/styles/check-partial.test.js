/* Rule: a checkbox with some of its group on reads as partly on — the checked fill with
 * a level dash where the tick goes — for the kit's box and for DataTable's selection
 * box alike. why: #619
 *
 * Rule: a checked or partial box is an accent tint with an accent edge and mark, not a
 * solid accent block, and the edge and the mark clear 3:1 under every accent in both
 * themes. why: #814, decision rev_813ccb2322b5/d27
 *
 * Browsers hold `indeterminate` as a property, so no story or markup sets it by
 * attribute and the paint is never reached by a walk that reads attributes. This gate
 * reads the sheet for the rules that draw it, measures the dash against its fill, and
 * proves it fails when a rule is removed.
 *
 * Limits: a declaration gate proves what the sheet says, not what a browser paints. The
 * browser half (DASH_CENTRE=1 with UI_PLAYWRIGHT) measures the dash at scale 2 in Chromium,
 * where a 2px stroke in the 17px padding box stays half a CSS pixel off vertically; the
 * captures and the tap-zone measurement are in the PR. The contrast test reads the sheets,
 * not a render: it composites the tint over --surface and the row washes over the two
 * row grounds, so it does not see a consumer's own row fill.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { colourOf, composite, ratio, tokensFor } from '../../stories/lib/contrast.js';
import { ACCENTS } from '../../stories/lib/accessibility-walks.js';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const INPUT_CSS = readFileSync(path.join(here, 'input.css'), 'utf8');
const TABLE_CSS = readFileSync(path.join(here, 'table.css'), 'utf8');

const blank = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
// A rule may sit inside @media, so the at-rule prelude is not a rule and the body is.
const rules = (css) => [...blank(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map(([, selector, body]) => ({ selector: selector.trim(), body }));
const bodiesOf = (css, selector) => rules(css).filter((r) => splitSelectorList(r.selector).includes(selector)).map((r) => r.body);
const bodyOf = (css, selector) => bodiesOf(css, selector).join(' ') || undefined;

/* The two boxes that take the partial paint. */
const HOSTS = ['.ui-check input[type="checkbox"]', '.ui-table__selection input[type="checkbox"]'];
/* The checked and partial box: a tint of the accent on the card, with an accent edge. */
const TINT = 'color-mix(in srgb, var(--accent) 14%, var(--surface))';
const TINTED = [[/background:\s*color-mix\(in srgb, var\(--accent\) 14%, var\(--surface\)\)/, 'lost the accent tint'],
  [/border-color:\s*var\(--accent\)/, 'lost the accent edge']];
const MARK = [/border:\s*solid var\(--accent\)/, 'lost its accent ink'];

/** Everything the partial paint needs, as one finding per missing piece. */
function partialFindings(css) {
  const out = [];
  const need = (host, suffix, patterns, why) => {
    const selector = `${host}${suffix}`;
    const body = bodyOf(css, selector);
    if (body === undefined) { out.push(`${selector} is not declared — ${why}`); return; }
    for (const [pattern, what] of patterns) if (!pattern.test(body)) out.push(`${selector} ${what}`);
  };
  for (const host of ['.ui-check input', '.ui-table__selection input[type="checkbox"]']) {
    need(host, ':checked', TINTED, 'a checked box looks empty');
  }
  for (const host of HOSTS) {
    need(host, ':checked::after', [MARK], 'a checked box has no tick');
    need(host, ':indeterminate', TINTED, 'the partial box is an empty box again');
    need(host, ':indeterminate::after', [
      [/content:\s*""/, 'draws nothing'],
      [/inset:\s*0\b/, 'is not centred in the box by its own edges'],
      [/margin:\s*auto/, 'is not centred in the box by its own edges'],
      [/width:\s*11px/, 'lost the dash width'],
      [/height:\s*0\b/, 'is not a single line'],
      [/border-width:\s*2px 0 0/, 'is not a 2px dash'],
      MARK,
    ], 'the partial box has no dash');
    need(host, ':disabled:indeterminate', [
      [/background:\s*var\(--disabled-ink\)/, 'lost the disabled fill'],
    ], 'an unavailable partial box keeps the live accent');
    need(host, ':disabled:indeterminate::after', [
      [/border-color:\s*var\(--disabled-surface\)/, 'lost the disabled dash ink'],
    ], 'an unavailable partial box has the live dash');
    need(host, ':disabled:is(:checked, :indeterminate)::after', [
      [/border-color:\s*GrayText/, 'is not GrayText'],
    ], 'forced colours draw an unavailable mark like an available one');
  }
  // The mark is --accent in both themes, so a theme rule that re-inks it breaks the measured pair.
  for (const { selector } of rules(css)) {
    if (/data-theme/.test(selector) && /:checked|:indeterminate/.test(selector)) out.push(`${selector} re-inks the mark for one theme`);
  }
  for (const selector of [
    '.ui-check input:disabled',
    '.ui-check input:disabled:is(:checked, :indeterminate)',
    '.ui-check input[type="checkbox"]:disabled:is(:checked, :indeterminate)',
    '.ui-table__selection input[type="checkbox"]:disabled',
    '.ui-table__selection input[type="checkbox"]:disabled:is(:checked, :indeterminate)',
  ]) {
    if (!/border-color:\s*GrayText/.test(bodyOf(css, selector) ?? '')) out.push(`${selector} has no GrayText edge in forced colours`);
  }
  for (const [selector, ink] of [['.ui-check input[type="radio"]:enabled:checked::after', 'CanvasText'], ['.ui-check input[type="radio"]:disabled:checked::after', 'GrayText']]) {
    if (!new RegExp(`background:\\s*${ink}`).test(bodyOf(css, selector) ?? '')) out.push(`${selector} has no ${ink} dot in forced colours`);
  }
  // The radio shares the checked tint, so its dot is a fill in the mark's ink.
  const dot = '.ui-check input[type="radio"]:checked::after';
  if (!/background:\s*var\(--accent\)/.test(bodyOf(css, dot) ?? '')) out.push(`${dot} is not --accent on the tint`);
  return out;
}

test('the checked and partial paint is declared for the kit box and DataTable\'s selection box', () => {
  assert.deepEqual(partialFindings(INPUT_CSS), [], 'the checked or partial paint is incomplete');
});

test('the sweep rejects each way of losing the partial paint', () => {
  const mutate = (from, to) => {
    assert.ok(INPUT_CSS.includes(from), `mutation target moved: ${from}`);
    return INPUT_CSS.replace(from, to);
  };
  const caught = (css) => partialFindings(css).length > 0;
  const survivors = [
    // The dash removed.
    ['dash rule renamed', mutate('.ui-check input[type="checkbox"]:indeterminate::after,', '.ui-check input[type="checkbox"]:indeterminate-x::after,')],
    ['dash narrowed to nothing', mutate('width: 11px; height: 0;', 'width: 0; height: 0;')],
    ['dash given a fill instead of a border', mutate('border-width: 2px 0 0;', 'border-width: 0;')],
    // The fill removed: an empty box again.
    ['fill removed', mutate('.ui-check input[type="checkbox"]:indeterminate,', '.ui-check input[type="checkbox"]:indeterminate-x,')],
    // The selection box left on the browser's paint.
    ['selection box left out', INPUT_CSS.replaceAll('.ui-table__selection input[type="checkbox"]:indeterminate', '.ui-x input')],
    // The solid block back, the mark back on white ink, or a theme rule over the mark.
    ['checked box a solid accent block', mutate('.ui-table__selection input[type="checkbox"]:checked { background: color-mix(in srgb, var(--accent) 14%, var(--surface));', '.ui-table__selection input[type="checkbox"]:checked { background: var(--accent);')],
    ['partial box a solid accent block', mutate('.ui-table__selection input[type="checkbox"]:indeterminate { background: color-mix(in srgb, var(--accent) 14%, var(--surface));', '.ui-table__selection input[type="checkbox"]:indeterminate { background: var(--accent);')],
    ['tick back on white ink', mutate('  width: 5px; height: 10px;\n  border: solid var(--accent);', '  width: 5px; height: 10px;\n  border: solid var(--accent-contrast);')],
    ['dash back on white ink', mutate('  border: solid var(--accent);\n  border-width: 2px 0 0;', '  border: solid var(--accent-contrast);\n  border-width: 2px 0 0;')],
    ['dark theme re-inks the mark', `${INPUT_CSS}\n:where(:root[data-theme="dark"]) .ui-check input[type="checkbox"]:enabled:is(:checked, :indeterminate)::after { border-color: var(--signal-contrast); }`],
    ['unavailable dash keeps the live ink', mutate('.ui-check input[type="checkbox"]:disabled:indeterminate::after,', '.ui-check input[type="checkbox"]:disabled:indeterminate-x::after,')],
    ['forced-colours radio dot removed', mutate('.ui-check input[type="radio"]:enabled:checked::after { background: CanvasText; }', '')],
    ['radio dot back on white ink', mutate('  border-radius: 50%;\n  background: var(--accent);', '  border-radius: 50%;\n  background: var(--accent-contrast);')],
    ['dash placed by offsets', mutate('  inset: 0;\n  margin: auto;\n  width: 11px; height: 0;', '  left: 3px; top: 7px;\n  width: 11px; height: 0;')],
    ['forced-colours checked edge removed', mutate('.ui-check input:disabled:is(:checked, :indeterminate),\n', '')],
    ['forced-colours partial edge outranked', mutate('  .ui-check input[type="checkbox"]:disabled:is(:checked, :indeterminate),\n  .ui-table__selection input[type="checkbox"]:disabled,', '  .ui-table__selection input[type="checkbox"]:disabled,')],
    ['forced-colours edge removed', mutate('{ border-color: GrayText; }\n  .ui-check input[type="checkbox"]:disabled:is', '{ border-color: CanvasText; }\n  .ui-check input[type="checkbox"]:disabled:is')],
  ].filter(([, css]) => !caught(css)).map(([name]) => name);
  assert.deepEqual(survivors, [], 'these removals leave the partial paint looking complete');
});

/* The tint is the fill the sheet declares, read back so a changed share is measured. */
const SHEET_TINT = /background:\s*(color-mix\([^;]+\));/.exec(bodyOf(INPUT_CSS, '.ui-check input:checked') ?? '')?.[1];
/* The selected-row washes, discovered from table.css as the status-word gate does. */
const WASHES = rules(TABLE_CSS).filter((r) => r.selector.includes('.ui-table__selection :checked') && /background\s*:/.test(r.body))
  .map((r) => ({ state: /:hover/.test(r.selector) ? 'hovered selected row' : 'selected row', fill: /background\s*:\s*([^;]+)/.exec(r.body)[1].trim() }));

/** Every pair under 3:1 in one theme and accent, the lowest of each pair, and how many pairs were read. */
function checkedPairs(theme, accent, tint = SHEET_TINT) {
  const vars = tokensFor(theme, accent);
  const accentInk = colourOf('var(--accent)', vars);
  const card = colourOf('var(--surface)', vars);
  const pairs = [['mark on fill', ratio(accentInk, composite(colourOf(tint, vars), card))], ['edge on the card', ratio(accentInk, card)]];
  for (const ground of [card, colourOf('var(--table-bg)', vars)]) {
    for (const w of WASHES) {
      const row = composite(colourOf(w.fill, new Map(vars).set('--table-bg', ground === card ? 'var(--surface)' : vars.get('--table-bg'))), ground);
      pairs.push([`edge on a ${w.state}`, ratio(accentInk, row)]);
    }
  }
  return pairs;
}

/* The tick, the dash and the radio dot are marks, and the edge is the box's boundary, so each
 * answers to the 3:1 a graphic needs (WCAG 1.4.11). The edge is read on the card, on a
 * selected row and on a hovered selected row; a row is the card's --surface or --table-bg. */
test('the checked edge and mark clear 3:1 under every accent in both themes', (t) => {
  assert.equal(SHEET_TINT, TINT, 'the checked fill is not the tint this gate measures');
  assert.deepEqual(WASHES.map((w) => w.state).sort(), ['hovered selected row', 'selected row'], 'the selected washes were not found in table.css');
  assert.ok(ACCENTS.length >= 4, `only ${ACCENTS.length} accents discovered`);
  const failures = [];
  let measured = 0;
  for (const theme of ['light', 'dark']) {
    const lowest = {};
    for (const accent of ACCENTS) {
      for (const [pair, r] of checkedPairs(theme, accent)) {
        assert.ok(Number.isFinite(r), `${theme} ${accent}: ${pair} was not measured`);
        measured++;
        if (r < 3) failures.push(`${theme} ${accent}: ${pair} ${r.toFixed(2)}:1`);
        if (!(lowest[pair]?.r <= r)) lowest[pair] = { r, accent };
      }
    }
    t.diagnostic(`${theme}: ${Object.entries(lowest).map(([pair, { r, accent }]) => `${pair} ${r.toFixed(2)} (${accent})`).join(', ')}`);
  }
  assert.equal(measured, 2 * ACCENTS.length * (2 + 2 * WASHES.length), 'a pair was skipped');
  assert.deepEqual(failures, [], 'a checked box falls under 3:1');
  // A paler tint pushes the mark under 3:1 on the lighter dark accents, so the check can fail.
  const pale = checkedPairs('dark', 'default', 'color-mix(in srgb, var(--accent) 60%, var(--surface))');
  assert.ok(pale.some(([, r]) => r < 3), 'a 60% tint measured clear, so the check passes over a weak mark');
});

const DASH_SHEETS = ['../tokens/brand.generated.css', '../tokens/tokens.css', '../tokens/accents.css', 'base.css', 'input.css']
  .map((f) => readFileSync(path.join(here, f), 'utf8')).join('\n');

async function dashGaps(css) {
  const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const { chromium } = pw.chromium ? pw : pw.default;
  const browser = await chromium.launch({ executablePath: process.env.UI_CHROME || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 200, height: 120 }, deviceScaleFactor: 2 });
    await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body style="margin:24px"><label class="ui-check"><input type="checkbox" aria-label="Some"></label><script>document.querySelector('input').indeterminate = true</script></body></html>`);
    const r = await page.evaluate(() => { const q = document.querySelector('input').getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
    const png = await page.screenshot({ clip: { x: r.x - 4, y: r.y - 4, width: r.w + 8, height: r.h + 8 } });
    return await page.evaluate(async ({ b64, r }) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const L = (i, j) => { const k = (j * c.width + i) * 4; return d[k] + d[k + 1] + d[k + 2]; };
      const bx = 8, by = 8, bw = Math.round(r.w * 2), bh = Math.round(r.h * 2);
      const fill = L(bx + bw / 2, by + 4);
      let i0 = 1e9, i1 = -1, j0 = 1e9, j1 = -1;
      for (let j = by + 6; j < by + bh - 6; j++) for (let i = bx + 6; i < bx + bw - 6; i++) if (Math.abs(L(i, j) - fill) > 120) { i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j); }
      return { left: i0 - bx, right: bx + bw - 1 - i1, top: j0 - by, bottom: by + bh - 1 - j1, found: i1 >= 0 };
    }, { b64: png.toString('base64'), r });
  } finally {
    await browser.close();
  }
}

test('measured at scale 2: the dash has equal gaps left and right, and is within a device pixel and a half vertically', {
  skip: !process.env.DASH_CENTRE && 'set DASH_CENTRE=1 and UI_PLAYWRIGHT to run the Chrome measurement',
}, async (t) => {
  const g = await dashGaps(DASH_SHEETS);
  t.diagnostic(`left ${g.left}, right ${g.right}, top ${g.top}, bottom ${g.bottom} device pixels`);
  assert.ok(g.found, 'no dash was drawn, so its centre proves nothing');
  assert.equal(g.left, g.right, 'the dash is not centred between the left and right edges');
  assert.ok(Math.abs(g.top - g.bottom) <= 2, `the dash sits ${Math.abs(g.top - g.bottom)} device pixels off the vertical centre`);

  await t.test('a dash placed by offsets is measured as off-centre', async () => {
    const off = await dashGaps(`${DASH_SHEETS}\n.ui-check input[type="checkbox"]:indeterminate::after { inset: auto; margin: 0; left: 3px; top: 7px; width: 10px; }`);
    assert.notEqual(off.left, off.right, 'the offset dash measured centred, so the check would pass over the defect');
  });
});
