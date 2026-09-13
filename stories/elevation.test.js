/* Rule: nothing below the floating step casts a shadow, and the floating step
 * casts exactly one — `--elev-floating`, the two-step edge and the drop in a
 * single list. The ledger of what this does not reach is below the imports.
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
import { STYLE_FILES, tokensFor, substitute, parseColour, composite, ratio } from './lib/contrast.js';
import { boxShadowsIn, layersOf, isCast, geometryOf, inkOf } from '../scripts/lib/box-shadow.js';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const read = (p) => readFileSync(root(p), 'utf8');
const THEMES = ['dark', 'light'];
/* why: CONTRIBUTING.md#a-gate-carries-a-ledger-of-what-it-does-not-reach
 *
 * WHAT THIS GATE DOES NOT REACH:
 *  - `filter: drop-shadow()`. Two ship, both zero-offset glows of a signal
 *    colour; one with an offset would pass here unread.
 *  - A shadow arriving from markup — an inline `style=`, or a consumer's sheet.
 *  - Whether a surface that SHOULD float took the treatment. The rule is
 *    one-directional; a panel that quietly loses it is caught by the count.
 *  - The rendered result. The ratios are arithmetic over flat colours and a
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

/* A raw layer is substituted on its own, so provenance survives: a layer that
 * resolves to a cast shadow has to be `var(--elev-floating)`, not merely contain
 * ink that looks like it. */
test('the only cast shadow under src/ is the floating treatment', () => {
  const offences = [];
  let floating = 0;
  for (const theme of THEMES) {
    const vars = tokensFor(theme);
    for (const d of sweep) {
      for (const raw of layersOf(d.value)) {
        const casts = layersOf(substitute(raw, vars)).some(isCast);
        if (!casts) continue;
        if (raw === 'var(--elev-floating)') { floating += 1; continue; }
        offences.push(`${d.file}:${d.line} (${theme})  ${d.selector} { box-shadow: … ${raw} … }`);
      }
    }
  }
  assert.deepStrictEqual(offences, [],
    'a cast shadow that is not the floating treatment. A surface below the floating step '
    + 'says how high it is with its step and its hairline; a floating one adds '
    + 'var(--elev-floating) and nothing else:\n  ' + offences.join('\n  '));
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
test('--elev-floating is a 1px inset line and then broad faint drops', () => {
  for (const theme of THEMES) {
    const vars = tokensFor(theme);
    const raw = vars.get('--elev-floating');
    assert.ok(raw, `--elev-floating is missing in ${theme}`);
    const layers = layersOf(raw);
    assert.equal(layers.length, 3, `${theme}: --elev-floating has ${layers.length} layers, expected 3`);

    const [line, ...drops] = layers;
    assert.ok(/(^|\s)inset(\s|$)/.test(line), `${theme}: the first layer is not inset`);
    assert.deepEqual(geometryOf(line), { x: 0, y: 0, blur: 0, spread: 1 },
      `${theme}: the inner line is not a 1px spread at zero offset — it would stop being a line`);

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
    const [, far] = layersOf(vars.get('--elev-floating'));
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
