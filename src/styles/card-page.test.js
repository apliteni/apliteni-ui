/* Rule: a document sheet is paper in both themes. A white page with dark ink sits on the
 * dark stage too, and so do its table, its lines and its loading skeleton. Decided on #736.
 *
 * The sheet takes the light palette by name, so every token resolves on it as it does in
 * light. This gate resolves every custom property on the sheet in each theme and requires
 * the two to agree. A token declared at :root is computed there, so one that derives from
 * a light-only value but is not declared on the sheet keeps its dark value. The gate
 * catches that.
 *
 * Subjects are discovered: every rule in the shipped sheets that lists `.ui-card__page`.
 *
 * Limits: it reads the sheets and resolves var() by hand. It does not render, so the paint
 * is in the #736 browser captures. It reads the default accent only: a page takes the
 * light default accent whatever accent the root carries. Inherited `color` is
 * not a custom property, so the sheet's own `color` declaration is checked apart.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';
import { AA_TEXT, STYLE_FILES, colourOf, declarationsFor, ratio, substitute, winnersOf } from '../../stories/lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const SHEET = '.ui-card__page';
const sources = () => STYLE_FILES.map((file) => ({ file, css: readFileSync(path.join(root, file), 'utf8') }));

/** Every top-level rule that lists the sheet, in cascade order. */
const sheetRules = (files) => files.flatMap(({ file, css }) =>
  [...decomment(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector]) => splitSelectorList(selector.trim()).includes(SHEET))
    .map(([, , body]) => ({ file, body })));

const declarations = (body) => body.split(';').map((d) => d.split(/:(.*)/s).map((s) => s.trim()))
  .filter(([name, value]) => name && value);

/** Each custom property as the sheet computes it, and the sheet's own ink. */
function onSheet(theme, files) {
  // Only a :root declaration reaches the sheet, by inheritance. A component's own
  // property is computed on that component and never reaches this one.
  const rooted = [...declarationsFor(theme)].map(([name, entries]) => [name, entries.filter((e) => e.root)]);
  const atRoot = winnersOf(new Map(rooted.filter(([, entries]) => entries.length)));
  // A :root value is computed at :root, so it reaches the sheet already substituted.
  const vars = new Map([...atRoot].map(([name, value]) => [name, substitute(value, atRoot)]));
  const own = new Map();
  let color = null;
  for (const { body } of sheetRules(files)) {
    for (const [name, value] of declarations(body)) {
      if (name.startsWith('--')) own.set(name, value);
      else if (name === 'color') color = value;
    }
  }
  for (const [name, value] of own) vars.set(name, value);
  for (const name of own.keys()) vars.set(name, substitute(own.get(name), vars));
  return { vars, color };
}

/** The tokens that differ on the sheet between the two themes. */
function drift(files) {
  const [dark, light] = ['dark', 'light'].map((theme) => onSheet(theme, files).vars);
  return [...new Set([...dark.keys(), ...light.keys()])]
    .filter((name) => dark.get(name) !== light.get(name))
    .map((name) => `${name}: dark ${dark.get(name)}, light ${light.get(name)}`);
}

test('the sheet resolves every token in dark as it does in light', () => {
  const files = sources();
  // The light palette, its ring, the code-chip hand-off and the sheet's own rule.
  assert.equal(sheetRules(files).length, 4, 'the rules that list the sheet changed; re-read this gate');
  assert.deepEqual(drift(files), []);
});

test('the sheet is white with readable ink in both themes', () => {
  for (const theme of ['dark', 'light']) {
    const { vars, color } = onSheet(theme, sources());
    assert.ok(color, `${theme}: the sheet sets no ink of its own, so it inherits the theme's`);
    const ground = colourOf('var(--surface)', vars);
    assert.deepEqual(ground, [255, 255, 255, 1], `${theme}: the sheet is not white`);
    const ink = ratio(colourOf(color, vars), ground);
    assert.ok(ink >= AA_TEXT, `${theme}: the sheet's ink measures ${ink.toFixed(2)}:1`);
  }
});

test('a sheet without the light palette is refused', () => {
  const files = sources().map(({ file, css }) => ({
    file, css: css.replace(`${SHEET},\n:root[data-theme="light"] {`, ':root[data-theme="light"] {'),
  }));
  assert.equal(sheetRules(files).length, 3, 'the mutation must remove the light palette');
  assert.ok(drift(files).some((line) => line.startsWith('--surface:')), 'the dark card reaches the sheet');
});
