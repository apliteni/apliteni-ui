/* Rule: nothing below the floating step casts a shadow, and the floating step
 * casts exactly one — the two-step edge's inner line written at the call site,
 * then `--elev-drop`. The ledger of what this does not reach is below the imports.
 *
 * Subjects are discovered: every `box-shadow` in every sheet `src/index.css`
 * imports. Each is read per theme with the token files substituted in, because
 * the property name decides nothing — a ring, a glow and a drop are all written
 * `box-shadow`, and only a layer's geometry says which it is.
 *
 * why: docs/specification.md#elevation
 * why: CONTRIBUTING.md#the-elevation-gate-and-its-counts
 * why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STYLE_FILES, TOKEN_FILES, tokensFor, declarationsFor, substitute, parseColour, composite, ratio } from './lib/contrast.js';
import { boxShadowsIn, layersOf, isCast, geometryOf, inkOf } from '../scripts/lib/box-shadow.js';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const read = (p) => readFileSync(root(p), 'utf8');
const THEMES = ['dark', 'light'];

/* The floating treatment, as a surface writes it. Two layers and not one token,
 * because a var() inside a custom property is substituted on the element that
 * DECLARES it: an --elev-edge read inside a :root token resolves at :root, and
 * every component that re-points it writes a dead declaration. #314 found five.
 * why: docs/specification.md#elevation */
const TREATMENT_LINE = 'inset 0 0 0 1px var(--elev-edge, var(--border))';
const TREATMENT_DROP = 'var(--elev-drop)';
/* why: CONTRIBUTING.md#a-gate-carries-a-ledger-of-what-it-does-not-reach
 *
 * WHAT THIS GATE DOES NOT REACH:
 *  - `filter: drop-shadow()`. Two ship, both zero-offset glows of a signal
 *    colour; one with an offset would pass here unread.
 *  - A shadow arriving from markup — an inline `style=`, or a consumer's sheet.
 *  - Whether a surface that SHOULD float took the treatment. The rule is
 *    one-directional; a panel that quietly loses it is caught by the count — but
 *    a SWAP is not: a card gaining the treatment while a panel loses it leaves
 *    both counts where they are, and only the cast test catches the card.
 *  - A cast that appears only when two custom properties take non-winning values
 *    at the same time. Each name is tried against every value the kit gives it,
 *    one name at a time, against the cascade's winner for the rest.
 *  - The rendered result. The contrast ratios here — the two lines, the drop, and
 *    --muted at AA on a raised surface — are arithmetic over flat colours, and a
 *    blurred penumbra is not one, so the drop is scored at its CORE.
 *  - The React workspace, gated over this same reader in
 *    react/src/elevation.test.ts.
 */


/** Every box-shadow the kit's own stylesheets declare, with its file. */
const sweep = STYLE_FILES.flatMap((file) =>
  boxShadowsIn(read(file)).map((d) => ({ ...d, file })));

// Asserted so coverage cannot shrink to zero and stay green. Moving it means
// recording the change: CONTRIBUTING.md#the-elevation-gate-and-its-counts
test('the sweep sees every box-shadow the kit ships', () => {
  assert.equal(sweep.length, 38,
    `the kit's stylesheets declare ${sweep.length} box-shadow rules, not the pinned 38. `
    + 'Adding or removing one is fine — move the number, and check the new declaration '
    + 'against docs/specification.md#elevation.');
  assert.ok(new Set(sweep.map((d) => d.file)).size >= 8,
    'the sweep collapsed onto a handful of files — STYLE_FILES is probably not resolving');
});

/** Every custom property a value reads, transitively. */
function namesRead(value, vars, seen = new Set()) {
  for (const [, name] of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (seen.has(name)) continue;
    seen.add(name);
    namesRead(vars.get(name) ?? '', vars, seen);
  }
  return seen;
}

/* Every value a layer can resolve to: the cascade's winner, and then the winner
 * with one of the properties it reads swapped for each OTHER value the kit gives
 * that name anywhere. A reader that resolves one declaration per name is a guess
 * about the cascade, and a guess can be walked past — the #314 review planted a
 * genuine cast in a redeclared `--drawer-line` and watched the sweep stay green,
 * because the sweep kept the first declaration and the browser used the second.
 * Trying every declared value is an over-approximation on purpose: it can call a
 * cast that no element actually paints, and it cannot miss one that some element
 * does. why: CONTRIBUTING.md#the-elevation-gate-and-its-counts */
function resolutionsOf(raw, theme) {
  const vars = tokensFor(theme);
  const decls = declarationsFor(theme);
  const out = new Set([substitute(raw, vars)]);
  for (const name of namesRead(raw, vars)) {
    for (const entry of decls.get(name) ?? []) {
      if (entry.value === vars.get(name)) continue;
      const alt = new Map(vars);
      alt.set(name, entry.value);
      out.add(substitute(raw, alt));
    }
  }
  return [...out];
}

/* A raw layer is substituted on its own, so provenance survives: a layer that
 * resolves to a cast shadow has to be `var(--elev-drop)`, not merely contain ink
 * that looks like it. */
test('the only cast shadow under src/ is the floating treatment', () => {
  const offences = [];
  let floating = 0;
  for (const theme of THEMES) {
    for (const d of sweep) {
      for (const raw of layersOf(d.value)) {
        if (raw === TREATMENT_DROP) { floating += 1; continue; }
        const casts = resolutionsOf(raw, theme).some((v) => layersOf(v).some(isCast));
        if (!casts) continue;
        offences.push(`${d.file}:${d.line} (${theme})  ${d.selector} { box-shadow: … ${raw} … }`);
      }
    }
  }
  assert.deepStrictEqual(offences, [],
    'a cast shadow that is not the floating treatment. A surface below the floating step '
    + 'says how high it is with its step and its hairline; a floating one adds '
    + 'the inner line and var(--elev-drop) and nothing else:\n  ' + offences.join('\n  '));
  // Both themes are walked, so each floating declaration is counted twice.
  assert.equal(floating, 22,
    `${floating / THEMES.length} declarations carry the floating treatment, not the pinned 11. `
    + 'If a floating surface dropped it, put it back; if one was added, move the number.');
});

test('nothing under src/ reads a deprecated --shadow-* token', () => {
  const dead = ['--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-seg', '--shadow-card'];
  const offences = [];
  for (const file of ['src/index.css', ...STYLE_FILES]) {
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const name of dead) {
      if (css.includes(`var(${name}`)) offences.push(`${file} reads var(${name})`);
    }
  }
  assert.deepStrictEqual(offences, [],
    'the five deprecated shadow tokens are published for consumers and resolve to the '
    + 'transparent shadow in both themes. A kit rule reading one paints nothing and says '
    + 'it meant to cast:\n  ' + offences.join('\n  '));
  for (const theme of THEMES) {
    const vars = tokensFor(theme);
    for (const name of dead) assert.equal(vars.get(name), '0 0 #0000', `${name} in ${theme}`);
  }
});

/* Primer's --shadow-floating-* order, which is what the review page recommended:
 * the 1px inset line first, then the broad faint drops. */
test('--elev-drop is broad faint drops and nothing else', () => {
  for (const theme of THEMES) {
    const vars = tokensFor(theme);
    const raw = vars.get('--elev-drop');
    assert.ok(raw, `--elev-drop is missing in ${theme}`);
    const drops = layersOf(raw);
    assert.equal(drops.length, 2, `${theme}: --elev-drop has ${drops.length} layers, expected 2`);

    for (const drop of drops) {
      assert.ok(!/(^|\s)inset(\s|$)/.test(drop), `${theme}: a drop went inset`);
      const { x, y, blur, spread } = geometryOf(drop);
      assert.equal(x, 0, `${theme}: a drop offset sideways; light falls from above in this kit`);
      assert.ok(y > 0, `${theme}: a drop with no downward offset is a glow, not a drop`);
      assert.ok(blur >= 2 * y, `${theme}: blur ${blur} against offset ${y} — the drop is tight, `
        + 'and a tight drop draws an edge instead of separating a surface from what it covers');
      assert.ok(spread < 0, `${theme}: a drop with no negative spread reaches past the panel on `
        + 'every side and reads as a halo');
    }
  }
});

/* #314 finding 1. A var() written inside a custom property is substituted at
 * computed-value time on the element that DECLARES it, so a hook read inside a
 * :root token is resolved once, at :root, and the already-literal string
 * inherits down. Every component that re-points that hook is writing a
 * declaration the browser ignores. The drawer's `--elev-edge: transparent` and
 * the three toasts' tints were all dead this way, and the drawer drew a 1px ring
 * across the top and bottom of a full-height panel — the exact thing its own
 * comment says it prevents.
 *
 * The rule is general and needs no list: a name a component sheet declares may
 * not be READ inside a :root token. */
test('a hook a component re-points is read at the call site, not inside a root token', () => {
  const blank = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const RULE = /([^{}]+)\{([^{}]*)\}/g;
  const declared = (files, keep) => {
    const names = new Set();
    for (const file of files) {
      for (const [, selector, body] of blank(read(file)).matchAll(RULE)) {
        if (!keep(selector)) continue;
        for (const decl of body.split(';')) {
          const i = decl.indexOf(':');
          if (i > 0 && decl.slice(0, i).trim().startsWith('--')) names.add(decl.slice(0, i).trim());
        }
      }
    }
    return names;
  };
  // A hook: a name the palette never gives a value, so a read of it ALWAYS takes
  // the fallback unless the element itself sets it. --elev-edge is one.
  const palette = declared(TOKEN_FILES, () => true);
  const hooks = new Set([...declared(STYLE_FILES, (sel) => !sel.trimStart().startsWith('@'))]
    .filter((name) => !palette.has(name)));

  const offences = [];
  for (const file of TOKEN_FILES) {
    const css = blank(read(file));
    for (const m of css.matchAll(RULE)) {
      if (!m[1].trim().startsWith(':root')) continue;
      for (const decl of m[2].split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        const name = decl.slice(0, i).trim();
        if (!name.startsWith('--')) continue;
        for (const [, hook] of decl.slice(i + 1).matchAll(/var\(\s*(--[\w-]+)/g)) {
          if (!hooks.has(hook)) continue;
          const line = css.slice(0, m.index + m[0].indexOf(decl)).split('\n').length;
          offences.push(`${file}:${line}  ${name} reads var(${hook}), and ${hook} is a hook src/styles/ re-points`);
        }
      }
    }
  }
  assert.deepStrictEqual(offences, [],
    'a :root token reads a hook a component re-points. CSS substitutes a var() inside a '
    + 'custom property on the element that DECLARES it, so this resolves at :root — always '
    + 'to the fallback — and every component override below it is dead. Compose the layer at '
    + 'the call site instead:\n  ' + offences.join('\n  '));
});

/* The other half of #314 finding 1: an override nothing reads. --elev-edge is
 * only worth writing on an element that also writes the inner line, so a
 * re-pointing has to reach a box-shadow declaration that can match the same
 * element. The drawer's `--elev-edge: transparent` failed this — it writes no
 * ring at all — and so would a toast modifier whose block stopped reading it. */

/** The classes an element matching this selector branch certainly carries: those
 *  in the last compound, plus the block each BEM modifier implies — this kit
 *  never writes `.ui-toast--soft` on something that is not also `.ui-toast`. */
const classesOf = (branch) => {
  const compound = branch.trim().split(/\s*[>+~]\s*|\s+/).filter(Boolean).at(-1) ?? '';
  const set = new Set();
  for (const [, name] of compound.replace(/:[\w-]+(\([^()]*\))?/g, '').matchAll(/\.([\w-]+)/g)) {
    set.add(name);
    const at = name.indexOf('--');
    if (at > 0) set.add(name.slice(0, at));
  }
  return set;
};
const subset = (a, b) => [...a].every((c) => b.has(c));
const canShareAnElement = (one, other) => one.split(',').some((a) => other.split(',').some((b) => {
  const [x, y] = [classesOf(a), classesOf(b)];
  return x.size > 0 && y.size > 0 && (subset(x, y) || subset(y, x));
}));

test('every re-pointing of the edge reaches a declaration that reads it', () => {
  const readers = sweep.filter((d) => d.value.includes('var(--elev-edge'));
  assert.ok(readers.length > 0, 'no box-shadow reads --elev-edge — the hook has no call site left');
  const offences = [];
  for (const entry of declarationsFor('dark').get('--elev-edge') ?? []) {
    if (entry.root) continue;
    if (readers.some((d) => canShareAnElement(entry.selector, d.selector))) continue;
    offences.push(`${entry.file}  ${entry.selector} { --elev-edge: ${entry.value} }`);
  }
  assert.deepStrictEqual(offences, [],
    '--elev-edge re-pointed on an element that writes no inner line, so nothing reads it. '
    + 'Either the surface should write the treatment, or the override is left over:\n  '
    + offences.join('\n  '));
});

/* The treatment is a pair, and the pair has an order: the inner line first, the
 * drops last, with the focus ring in front of both when there is one. Checked on
 * the declaration rather than on a token, because the declaration is now where
 * the composition happens. */
test('the inner line is written in front of the drops, at every call site', () => {
  for (const theme of THEMES) {
    const vars = tokensFor(theme);
    for (const d of sweep) {
      const layers = layersOf(d.value);
      const at = layers.indexOf(TREATMENT_DROP);
      if (at < 0) continue;
      const where = `${d.file}:${d.line} (${theme})  ${d.selector}`;
      assert.equal(at, layers.length - 1, `${where}: the drops are not the last layer — `
        + 'a layer behind them is painted behind the surface and under the drop');
      const lines = layers.slice(0, at).filter((l) => l !== 'var(--ring)');
      assert.ok(lines.length >= 1, `${where}: the drops with no inner line in front of them — `
        + 'the two-step edge is half the treatment');
      for (const one of lines.flatMap((l) => layersOf(substitute(l, vars)))) {
        assert.ok(/(^|\s)inset(\s|$)/.test(one),
          `${where}: "${one}" sits in front of the drops and is not inset`);
        const { x, y, blur, spread } = geometryOf(one);
        assert.ok(blur === 0 && Math.abs(spread) <= 1 && Math.abs(x) <= 1 && Math.abs(y) <= 1,
          `${where}: "${one}" is not a hairline — the inner half of the two-step edge is one pixel`);
      }
      // A ring drawn over the treatment would replace it; composed, it comes first.
      if (d.value.includes('var(--ring)')) assert.equal(layers[0], 'var(--ring)',
        `${where}: the focus ring is composed with the treatment, and it goes in front`);
    }
  }
});

/* The neutral call site is written the same way everywhere, so a surface that
 * wants its own inner line has one thing to re-point and the rest have none. */
test('a neutral floating surface writes the same inner line as the rest', () => {
  const writing = sweep.filter((d) => d.value.includes(TREATMENT_DROP));
  const odd = writing.filter((d) => !layersOf(d.value).includes(TREATMENT_LINE)
    && !d.value.includes('var(--drawer-line)'));
  assert.deepStrictEqual(odd.map((d) => `${d.file}:${d.line}  ${d.selector}`), [],
    `every floating surface but the drawer writes \`${TREATMENT_LINE}\`. The drawer is the one `
    + 'flush to a screen edge, so it draws its line in one direction instead of four.');
});

/* Each is the "a + b" row of docs/reviews/295-popover-variants.html, which is what
 * the decision on #309 was taken against. The gate holds the floor, not the value:
 * a treatment that measures better is fine. */
const FLOOR = {
  dark: { edge: 1.64, inner: 1.30, drop: 1.20 },
  light: { edge: 1.44, inner: 1.23, drop: 1.43 },
};

test('the floating treatment reads at least what the review page measured', () => {
  for (const theme of THEMES) {
    const vars = tokensFor(theme);
    const v = (name) => parseColour(substitute(`var(${name})`, vars));
    const card = v('--surface');
    const panel = v('--bg-elevated');

    const edge = ratio(v('--border-strong'), card);
    assert.ok(edge >= FLOOR[theme].edge - 0.005,
      `${theme}: the outer line reads ${edge.toFixed(2)} on the card, under the ${FLOOR[theme].edge} `
      + 'the review page measured for the two-step edge');
    const inner = ratio(v('--border-strong'), v('--border'));
    assert.ok(inner >= FLOOR[theme].inner - 0.005,
      `${theme}: the two lines read ${inner.toFixed(2)} against each other, under ${FLOOR[theme].inner} — `
      + 'a two-step edge whose steps agree is one line drawn twice');

    // The drop's core: the first drop's ink, composited over the card at its own
    // alpha. The kit writes an alpha as a color-mix against `transparent`, which is
    // the one shape read here — a drop written any other way is refused rather than
    // guessed at, because a mis-read alpha would report a number nobody painted.
    const [far] = layersOf(vars.get('--elev-drop'));
    const mix = /^color-mix\(\s*in srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*transparent\s*\)$/
      .exec(substitute(inkOf(far), vars));
    assert.ok(mix, `${theme}: the drop's ink is not color-mix(in srgb, <token> N%, transparent) — `
      + `it reads "${inkOf(far)}", and this gate will not guess at an alpha`);
    const ink = parseColour(mix[1]);
    assert.ok(ink, `${theme}: the drop's ink did not parse out of "${mix[1]}"`);
    const core = composite([ink[0], ink[1], ink[2], Number(mix[2]) / 100], card);
    const got = ratio(core, card);
    assert.ok(got >= FLOOR[theme].drop - 0.005,
      `${theme}: the drop core reads ${got.toFixed(2)} on the card, under the ${FLOOR[theme].drop} `
      + 'the review page measured. A drop that faint is the flat panel the issue was opened about');

    // The ladder is capped by ink: --muted is the faintest text a panel carries.
    for (const [name, bg] of [['--bg-elevated', panel], ['--surface-3', v('--surface-3')]]) {
      const m = ratio(v('--muted'), bg);
      assert.ok(m >= 4.5, `${theme}: --muted reads ${m.toFixed(2)} on ${name} — under AA`);
    }
  }
});
