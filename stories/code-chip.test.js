/* Rule: an inline code chip keeps a step on every painted ground the kit draws, in both
 * themes, without an edge of its own.
 *
 * `.ui-code` is text on a chip, so #455 leaves it two grounds and no grey — the page and
 * the card — and it cannot read the one it is standing on. Each painted container hands it
 * the surface it is not using, through `--code-bg`. This gate walks the hand-off the other
 * way: it discovers every painted ground from the sheets, resolves the chip's surface for
 * that ground in both themes and in every context a ground token is re-pointed in, and
 * measures the step between the two.
 *
 * LIMITS, so this is not read as more than it is:
 *  - It reads the SHEETS, not a render: it proves which surface a container hands over and
 *    what the two values measure, not that a browser composited them. The rendered pairs
 *    are stories/contrast.test.js's subject, and the look is the issue's captures.
 *  - A subject is a selector that declares its own opaque `--ring-gap` — the kit's
 *    definition of a painted container, held by stories/ring-surfaces.test.js. A ground
 *    painted without one (a translucent wash, a decorative fill) is not a ground a chip is
 *    handed: the chip keeps whatever its opaque ancestor gave it, and the wash shifts both
 *    the chip and the ground together.
 *  - One selector, one ground: where the sheets paint the same selector twice the last
 *    declaration is measured, because that is the paint a reader sees. A ground that wins
 *    only under a selector the sheets never write is not measured at all.
 *  - The step is a WCAG ratio between two flat colours. It says the chip is not the paint
 *    of its ground; it does not say a reader finds the result beautiful.
 *  - color-mix() is evaluated for the one shape the kit writes, `in srgb, A p%, B`;
 *    an unevaluable ground fails this gate rather than being skipped.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { customPropertiesIn, namesRead } from '../scripts/lib/box-shadow.js';
import { parseColour, ratio, substitute, tokensFor } from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));

const THEMES = ['dark', 'light'];

/* The card's own step over the page: 1.110 in light, where the ladder is tightest. A chip
 * is asked for the step the kit already ships and no more — #448 chose that value for the
 * card deliberately, and a chip that beats it is louder than the card it sits on. */
const STEP = 1.1;

const files = ['src', 'react/src'].flatMap((base) => readdirSync(path.join(root, base), { recursive: true })
  .filter((file) => String(file).endsWith('.css')).map((file) => `${base}/${file}`));

/** Split a selector list at top-level commas, so `:not(a, b)` stays one selector. #521 */
const selectorsOf = (list) => {
  const out = [];
  let depth = 0;
  let current = '';
  for (const char of list) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) { out.push(current.trim()); current = ''; continue; }
    current += char;
  }
  out.push(current.trim());
  return out.filter(Boolean);
};

const rulesIn = (file) => [...decomment(read(file)).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map((match) => ({ file, selector: match[1].trim(), body: match[2] }));

const sheets = files.flatMap(rulesIn);
const own = (rule) => new Map(customPropertiesIn(`${rule.selector}{${rule.body}}`).map((d) => [d.name, d.value]));

/* The painted grounds: a rule that paints and says so by setting its own gap. The page is
 * one of them and declares its pair on :root, so it is discovered with the rest. A theme
 * block is still the page — `:root, :root[data-theme="dark"]` writes the gap once for both. */
const painted = sheets.flatMap((rule) => {
  const gap = own(rule).get('--ring-gap');
  if (!gap || gap === 'inherit') return [];
  return selectorsOf(rule.selector)
    .map((selector) => (selector.startsWith(':root') ? ':root' : selector))
    .map((selector) => ({ file: rule.file, selector, gap }));
});
/* Last paint wins: a selector the sheets paint twice stands on the second one. */
const grounds = [...new Map(painted.map((ground) => [ground.selector, ground])).values()];

/* Every rule that hands a chip a surface, in document order. tokens.css owns all of them:
 * which surface is free is a property of the ladder, not of a component sheet. */
const handOffs = rulesIn('src/tokens/tokens.css').flatMap((rule) => {
  const pick = own(rule).get('--code-bg');
  return pick ? selectorsOf(rule.selector).map((selector) => ({ selector, pick })) : [];
});
const pickFor = (selector) => handOffs.filter((hand) => hand.selector === selector).at(-1)?.pick;

/* A container may RE-POINT a token a ground or a hand-off is written in — a table takes
 * its card's surface — and that is a second context the pair has to hold in. The contexts
 * are discovered from the sheets, so a new one has to be answered here rather than ignored.
 *
 * Only a LADDER token counts, meaning one the page declares itself. A component that
 * declares its own surface alias (--drawer-surface, --cmdk-surface, --footer-surface) is
 * not re-pointing a ground: that declaration is the only one the token has, it is already
 * in the page's own resolution, and reading it as an overlay would hand one component's
 * surface to a sibling that never sees it. */
const ladder = new Set(rulesIn('src/tokens/tokens.css')
  .filter((rule) => rule.selector.startsWith(':root'))
  .flatMap((rule) => [...own(rule).keys()]));
const written = new Set(grounds.flatMap(({ gap, selector }) => [gap, pickFor(selector) ?? '']
  .flatMap((value) => [...namesRead(value, tokensFor('dark'))])).filter((name) => ladder.has(name)));
const contexts = [{ where: 'the page', overrides: new Map() },
  ...sheets.filter((rule) => !rule.selector.startsWith(':root'))
    .map((rule) => ({ rule, overrides: new Map([...own(rule)].filter(([name]) => written.has(name))) }))
    .filter(({ overrides }) => overrides.size)
    .map(({ rule, overrides }) => ({ where: `inside ${rule.selector}`, overrides }))];

const varsFor = (theme, overrides) => new Map([...tokensFor(theme), ...overrides]);

/* The one shape of color-mix the kit writes, plus the hex and rgb() parseColour reads. */
const colourOf = (value, vars) => {
  const resolved = substitute(String(value).trim(), vars).trim();
  const mix = /^color-mix\(\s*in srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)\s*\)$/.exec(resolved);
  if (mix) {
    const [a, b] = [colourOf(mix[1], vars), colourOf(mix[3], vars)];
    if (!a || !b) return null;
    const share = Number.parseFloat(mix[2]) / 100;
    return [0, 1, 2].map((i) => a[i] * share + b[i] * (1 - share)).concat(1);
  }
  return parseColour(resolved);
};

const steps = () => THEMES.flatMap((theme) => contexts.flatMap(({ where, overrides }) => {
  const vars = varsFor(theme, overrides);
  return grounds.map(({ selector, gap }) => ({
    theme,
    where,
    selector,
    step: ratio(colourOf(gap, vars), colourOf(pickFor(selector), vars)),
  }));
}));

/* One entry per CAUSE, written by hand. The mandatory `why` is the point of the ledger: an
 * entry says a person read the pair and accepted it. Do not build a regenerator. */
const LEDGER = [{
  id: 'A',
  selectors: ['.ui-card--accent', '.ui-card--live'],
  themes: ['light'],
  worst: 1.09,
  why: 'A tinted card in LIGHT sits between the two reading surfaces, so neither is a full '
    + 'step away from it. Light mixes its tint DOWN from white (#448, --card-tint 5%), '
    + 'which lands the accent card at #f8f4fc and the live card beside it: above the page '
    + 'it covers, below the white card it is a variant of. It is handed that card, the '
    + 'better of the two at 1.07-1.08 against the page\'s 1.02-1.04, and still lands under '
    + 'the 1.110 a plain card gives. Dark has the room and clears the step on both. Not '
    + 'closed here because every way to close it is a rule this kit has already decided '
    + 'against: a grey chip (#455), an edge (#490) or a second accent signal on the one '
    + 'card whose subject IS the accent. What a tinted card carries is a short status line, '
    + 'not reference prose with identifiers in it.',
}];

const accepts = (finding) => LEDGER.some((entry) => entry.themes.includes(finding.theme)
  && entry.selectors.includes(finding.selector));

test('the chip gate discovers every painted ground, context and theme', () => {
  assert.equal(grounds.length, 33, 'painted-ground discovery changed; a new painted container must say which surface it hands an inline code chip');
  assert.equal(contexts.length, 2, 'a container re-points a ground token; say what a chip inside it takes');
  assert.ok(grounds.some(({ selector }) => selector === ':root'), 'the page is a painted ground and is measured with the rest');
  for (const { file, selector } of grounds) {
    assert.ok(pickFor(selector), `${file}: ${selector} paints a ground and never hands an inline code chip a surface`);
  }
  for (const theme of THEMES) {
    for (const { where, overrides } of contexts) {
      const vars = varsFor(theme, overrides);
      for (const { file, selector, gap } of grounds) {
        assert.ok(colourOf(gap, vars), `${file}: ${selector} ground is unreadable in ${theme}, ${where}`);
        assert.ok(colourOf(pickFor(selector), vars), `${file}: ${selector} chip surface is unreadable in ${theme}, ${where}`);
      }
    }
  }
  assert.equal(steps().length, grounds.length * contexts.length * THEMES.length, 'every ground is measured in every context and theme');
});

test('an inline code chip keeps a step on every painted ground, in both themes', () => {
  const findings = steps().filter(({ step }) => step < STEP);
  const unexplained = findings.filter((finding) => !accepts(finding));
  assert.deepEqual(unexplained, [], `a chip disappears on a ground nobody accepted: ${JSON.stringify(unexplained)}`);
  for (const entry of LEDGER) {
    const rows = findings.filter((finding) => entry.themes.includes(finding.theme)
      && entry.selectors.includes(finding.selector));
    assert.equal(rows.length, entry.themes.length * entry.selectors.length * contexts.length,
      `ledger ${entry.id} no longer describes what the sheets do; re-read the pairs before changing the count`);
    assert.ok(Math.max(...rows.map(({ step }) => step)) <= entry.worst,
      `ledger ${entry.id} is worse than it says (${rows.map(({ step }) => step.toFixed(3)).join(', ')} against ${entry.worst})`);
    assert.ok(entry.why.length > 200, `ledger ${entry.id} needs a reason a reader can act on`);
  }
  assert.equal(findings.length, LEDGER.reduce((n, e) => n + e.themes.length * e.selectors.length * contexts.length, 0),
    'an accepted ground stopped failing; take it out of the ledger');
});

test('the chip paints the surface it is handed, and claims no edge of its own', () => {
  const rule = rulesIn('src/styles/code.css').find((r) => r.selector === '.ui-code');
  assert.match(rule.body, /background:\s*var\(--code-bg\)\s*;/, 'the chip must paint the surface its container hands over');
  assert.doesNotMatch(rule.body, /(?:^|;)\s*(?:border|box-shadow|outline)\s*:/, 'the chip reads by its surface and its typeface, never by an edge. #490');
  assert.doesNotMatch(rule.body, /--ring-gap/, 'a chip that re-points the gap re-points its own surface with it');
  const recipe = rulesIn('src/tokens/tokens.css').find((r) => own(r).get('--code-bg') === 'var(--bg)');
  assert.ok(!selectorsOf(recipe.selector).includes('.ui-code'),
    'the chip cannot be in the hand-off list: it would hand the page to itself and paint the page everywhere');
});
