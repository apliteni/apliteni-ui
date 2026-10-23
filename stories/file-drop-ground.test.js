/* Rule: the words of the page drop layer stay at 4.5:1 over whatever the translucent ground lets
 * through, in both themes. The r4 answer on 2026-10-20 is recorded in #458: "When
 * table - use slightly transparent and blurred background for drop zone".
 *
 * The worst spot behind the words is taken as a solid patch of any opaque colour token the kit
 * declares, laid under the ground at full coverage. A blur never gives a patch that large, so
 * this is a lower bound on the reading, not a measurement of a page.
 *
 * Limits, read before trusting a green run:
 *  - Tokens, not pixels. Whether the engine blurs, and how the blurred rows look, is only
 *    measured in a browser; the PR carries those figures.
 *  - The words are `.ui-empty`'s ink, read from its own rule. The glyph is not judged here:
 *    it is a muted-ink decoration at 60% opacity, below 3:1 on the plain page ground in the
 *    light theme already, and it sits beside the words that carry the meaning.
 *  - The solid fallback (no backdrop-filter, reduced transparency) paints the plain page
 *    ground, which the contrast walk judges as it judges any page.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AA_TEXT, colourOf, composite, ratio, tokensFor } from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const THEMES = ['dark', 'light'];

/** The `background` declared inside the `@supports` branch of `.ui-drop--page`. */
const translucentGround = (css) => {
  const branch = /@supports[^{]*\{\s*\.ui-drop--page\s*\{([^}]*)\}/.exec(css)?.[1];
  assert.ok(branch, 'the page drop layer has no @supports branch with a translucent ground');
  const ground = /background:\s*([^;]+);/.exec(branch)?.[1];
  assert.ok(ground, 'the @supports branch of the page drop layer declares no background');
  return ground.trim();
};

/** The ink the layer's words take: `.ui-empty`'s own colour. */
const wordsInk = (css) => {
  const ink = /\.ui-empty\s*\{[^}]*?\bcolor:\s*([^;]+);/.exec(css)?.[1];
  assert.ok(ink, '.ui-empty declares no colour for the layer\'s words');
  return ink.trim();
};

/** Worst words ratio over every opaque colour token the theme declares, as the backdrop. */
export function worstWords(theme, groundValue, inkValue) {
  const vars = tokensFor(theme);
  const ground = colourOf(groundValue, vars);
  const ink = colourOf(inkValue, vars);
  assert.ok(ground && ink, `${theme}: the ground or the ink did not resolve`);
  let worst = { ratio: Infinity, token: null };
  let counted = 0;
  for (const [name, value] of vars) {
    if (!name.startsWith('--')) continue;
    const behind = colourOf(value, vars);
    if (!behind || behind[3] < 0.999) continue;
    counted += 1;
    const over = ground[3] < 0.999 ? composite(ground, behind) : ground;
    const r = ratio(composite(ink, over), over);
    if (r < worst.ratio) worst = { ratio: r, token: name };
  }
  return { ...worst, counted };
}

const sheet = read('src/styles/file-drop.css');
const ink = wordsInk(read('src/styles/empty.css'));

for (const theme of THEMES) {
  test(`page drop layer: its words keep ${AA_TEXT}:1 over the worst colour behind the translucent ground, ${theme}`, () => {
    const { ratio: r, token, counted } = worstWords(theme, translucentGround(sheet), ink);
    assert.ok(counted >= 20, `only ${counted} opaque colour tokens were tried; the discovery found too few to mean anything`);
    assert.ok(r >= AA_TEXT, `${theme}: the words read ${r.toFixed(2)}:1 over ${token}; need ${AA_TEXT}`);
  });
}

test('page drop layer: a ground that lets the page through too far is rejected (mutation)', () => {
  const thin = 'color-mix(in srgb, var(--bg) 20%, transparent)';
  const failing = THEMES.filter((theme) => worstWords(theme, thin, ink).ratio < AA_TEXT);
  assert.deepEqual(failing, THEMES, 'a 20% ground should fail in both themes');
});

test('page drop layer: the solid ground reads at least as well as the translucent one', () => {
  for (const theme of THEMES) {
    const solid = worstWords(theme, 'var(--bg)', ink).ratio;
    const mixed = worstWords(theme, translucentGround(sheet), ink).ratio;
    assert.ok(solid >= mixed, `${theme}: solid ${solid.toFixed(2)} should not read worse than translucent ${mixed.toFixed(2)}`);
  }
});
