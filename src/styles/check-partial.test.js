/* Rule: a checkbox with some of its group on reads as partly on — the checked fill with
 * a level dash where the tick goes — for the kit's box and for DataTable's selection
 * box alike. why: #619
 *
 * Browsers hold `indeterminate` as a property, so no story or markup sets it by
 * attribute and the paint is never reached by a walk that reads attributes. This gate
 * reads the sheet for the rules that draw it, measures the dash against its fill, and
 * proves it fails when a rule is removed.
 *
 * Limits: a declaration gate proves what the sheet says, not what a browser paints. The
 * browser half (DASH_CENTRE=1 with UI_PLAYWRIGHT) measures the dash at scale 2 in Chromium,
 * where a 2px stroke in the 17px padding box stays half a CSS pixel off vertically; the
 * captures and the tap-zone measurement are in the PR. It reads the default
 * accent in each theme; stories/accent-contrast.test.js owns the other accents' fills.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseColour, ratio } from '../../stories/lib/contrast.js';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const INPUT_CSS = readFileSync(path.join(here, 'input.css'), 'utf8');
const TOKENS = readFileSync(path.join(here, '../tokens/tokens.css'), 'utf8');

const blank = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
// A rule may sit inside @media, so the at-rule prelude is not a rule and the body is.
const rules = (css) => [...blank(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map(([, selector, body]) => ({ selector: selector.trim(), body }));
const bodiesOf = (css, selector) => rules(css).filter((r) => splitSelectorList(r.selector).includes(selector)).map((r) => r.body);
const bodyOf = (css, selector) => bodiesOf(css, selector).join(' ') || undefined;

/* The two boxes that take the partial paint. */
const HOSTS = ['.ui-check input[type="checkbox"]', '.ui-table__selection input[type="checkbox"]'];

/** Everything the partial paint needs, as one finding per missing piece. */
function partialFindings(css) {
  const out = [];
  const need = (host, suffix, patterns, why) => {
    const selector = `${host}${suffix}`;
    const body = bodyOf(css, selector);
    if (body === undefined) { out.push(`${selector} is not declared — ${why}`); return; }
    for (const [pattern, what] of patterns) if (!pattern.test(body)) out.push(`${selector} ${what}`);
  };
  for (const host of HOSTS) {
    need(host, ':indeterminate', [
      [/background:\s*var\(--accent\)/, 'lost the checked fill'],
      [/border-color:\s*var\(--accent\)/, 'lost the checked edge'],
    ], 'the partial box is an empty box again');
    need(host, ':indeterminate::after', [
      [/content:\s*""/, 'draws nothing'],
      [/inset:\s*0\b/, 'is not centred in the box by its own edges'],
      [/margin:\s*auto/, 'is not centred in the box by its own edges'],
      [/width:\s*11px/, 'lost the dash width'],
      [/height:\s*0\b/, 'is not a single line'],
      [/border-width:\s*2px 0 0/, 'is not a 2px dash'],
      [/border:\s*solid var\(--accent-contrast\)/, 'lost its ink'],
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
    const dark = `:where(:root[data-theme="dark"]) ${host}:enabled:is(:checked, :indeterminate)::after`;
    const darkBody = bodyOf(css, dark);
    if (darkBody === undefined) out.push(`${dark} is not declared — the dark dash falls back to white ink`);
    else if (!/border-color:\s*var\(--signal-contrast\)/.test(darkBody)) out.push(`${dark} lost --signal-contrast`);
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
  // The radio's dot is a fill like the tick's ink, so it takes the dark ink too (#619). The
  // forced-colours dot has the same specificity and must come after it, or dark would win.
  const darkDot = ':where(:root[data-theme="dark"]) .ui-check input[type="radio"]:enabled:checked::after';
  if (!/background:\s*var\(--signal-contrast\)/.test(bodyOf(css, darkDot) ?? '')) out.push(`${darkDot} is not --signal-contrast`);
  else if (css.indexOf(darkDot) > css.indexOf('.ui-check input[type="radio"]:enabled:checked::after { background: CanvasText')) {
    out.push('the dark dot comes after the forced-colours dot and outranks it');
  }
  return out;
}

test('the partial paint is declared for the kit box and DataTable\'s selection box', () => {
  assert.deepEqual(partialFindings(INPUT_CSS), [], 'the partial paint is incomplete');
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
    // Dark ink and the unavailable paint.
    ['dark dash back on white ink', mutate('border-color: var(--signal-contrast); }', 'border-color: var(--accent-contrast); }')],
    ['unavailable dash keeps the live ink', mutate('.ui-check input[type="checkbox"]:disabled:indeterminate::after,', '.ui-check input[type="checkbox"]:disabled:indeterminate-x::after,')],
    ['forced-colours radio dot removed', mutate('.ui-check input[type="radio"]:enabled:checked::after { background: CanvasText; }', '')],
    ['dark radio dot back on white ink', mutate('input[type="radio"]:enabled:checked::after { background: var(--signal-contrast); }', 'input[type="radio"]:enabled:checked::after { background: var(--accent-contrast); }')],
    ['dark radio dot removed', mutate(':where(:root[data-theme="dark"]) .ui-check input[type="radio"]:enabled:checked::after { background: var(--signal-contrast); }\n', '')],
    ['dash placed by offsets', mutate('  inset: 0;\n  margin: auto;\n  width: 11px; height: 0;', '  left: 3px; top: 7px;\n  width: 11px; height: 0;')],
    ['forced-colours checked edge removed', mutate('.ui-check input:disabled:is(:checked, :indeterminate),\n', '')],
    ['forced-colours partial edge outranked', mutate('  .ui-check input[type="checkbox"]:disabled:is(:checked, :indeterminate),\n  .ui-table__selection input[type="checkbox"]:disabled,', '  .ui-table__selection input[type="checkbox"]:disabled,')],
    ['forced-colours edge removed', mutate('{ border-color: GrayText; }\n  .ui-check input[type="checkbox"]:disabled:is', '{ border-color: CanvasText; }\n  .ui-check input[type="checkbox"]:disabled:is')],
  ].filter(([, css]) => !caught(css)).map(([name]) => name);
  assert.deepEqual(survivors, [], 'these removals leave the partial paint looking complete');
});

const themeVars = (theme) => {
  const at = TOKENS.indexOf(`:root[data-theme="${theme}"]`);
  assert.notEqual(at, -1, `no :root[data-theme="${theme}"] block in tokens.css`);
  const body = TOKENS.slice(at, TOKENS.indexOf('\n}', at));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
};

/* The dash and the radio dot are marks, so they answer to the 3:1 a graphic needs against the
 * fill they sit on. Light inks them with --accent-contrast, dark with --signal-contrast. */
test('the dash and the radio dot clear 3:1 on the fill in both themes', () => {
  const ink = { light: '--accent-contrast', dark: '--signal-contrast' };
  for (const theme of ['light', 'dark']) {
    const vars = themeVars(theme);
    const fill = parseColour(vars['--accent']);
    const mark = parseColour(vars[ink[theme]]);
    assert.ok(ratio(mark, fill) >= 3, `${theme}: the dash measures ${ratio(mark, fill).toFixed(2)}:1 on the accent fill`);
  }
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
