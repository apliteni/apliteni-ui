/* Rule: a field sunk into a floating panel is no deeper a well than a field on
 * a card. #306's round 10 reported the dropdown's search box as "too dark in
 * light theme", and the field was innocent — it paints exactly what `.ui-input`
 * paints. What changed was underneath it: #314 made a light panel the only pure
 * white the kit draws, so the same sunken token fell two rungs below its
 * surface there instead of one.
 *
 * Measured rather than declared, because the finding was about how deep a well
 * LOOKS and a declaration cannot say. The reference is the kit's own ordinary
 * field on a card, per theme, so the bar moves when the ladder does.
 *
 * why: docs/specification.md#elevation
 * Measure behavior instead of matching the source text.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tokensFor, substitute, parseColour, luminance, ratio } from './lib/contrast.js';

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8');
const SHEET = read('src/styles/dropdown.css');
const INPUTS = read('src/styles/input.css');
const THEMES = ['dark', 'light'];

/** Every leaf rule in a sheet as { selector, body }, comments stripped. */
function rules(css) {
  const out = [];
  const open = [];
  let buf = '';
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (ch === '{') { open.push(buf.trim()); buf = ''; } else if (ch === '}') {
      const selector = open.pop() ?? '';
      if (buf.trim()) out.push({ selector, body: buf.trim() });
      buf = '';
    } else buf += ch;
  }
  return out;
}

/** The `background` a selector ends up with in a theme, cascade resolved over
 *  this sheet: the bare rule, then the theme's own override if it writes one. */
function ground(css, selector, theme) {
  const vars = tokensFor(theme);
  const wanted = [selector];
  if (theme === 'light') wanted.push(`:root[data-theme="light"] ${selector}`);
  let value = null;
  for (const rule of rules(css)) {
    const list = rule.selector.split(',').map((one) => one.trim());
    if (!list.some((one) => wanted.includes(one))) continue;
    const decl = [...rule.body.matchAll(/(?:^|;)\s*background\s*:([^;]*)/g)].at(-1);
    if (decl) value = decl[1].trim();
  }
  assert.ok(value, `${selector} declares no background in this sheet for ${theme}`);
  return parseColour(substitute(value, vars));
}

/** How deep a well reads: the contrast against its surround, and the lightness
 *  it drops from it. Two numbers because in light they disagree in magnitude —
 *  a ratio near white is a small number over a large drop. */
const well = (field, surround) => ({
  ratio: +ratio(field, surround).toFixed(3),
  drop: +((luminance(surround) - luminance(field)) * 100).toFixed(2),
});

/* Dark's own number, measured on this tree, held as a ceiling rather than fixed.
 *
 * Dark carries the same shape as light did — --surface-2 is two rungs under
 * --bg-elevated there too — but its panel is a middle step rather than pure
 * white, so the well reads as a well and not as a hole, and round 10 reported
 * only light. Artur has not been asked about dark, so it keeps the token every
 * other field in the kit takes and this ratchet refuses a change that makes it
 * WORSE. Bringing dark in line later lowers the number, which passes; the entry
 * retires when it does.
 * State what this test cannot measure.
 */
const DARK_WELL = 1.234;

test('a light field sinks no deeper into its panel than a kit field sinks into a card', () => {
  const theme = 'light';
  const vars = tokensFor(theme);
  const panel = parseColour(substitute('var(--bg-elevated)', vars));
  const card = parseColour(substitute('var(--surface)', vars));

  const inPanel = well(ground(SHEET, '.ui-dropdown__search-input', theme), panel);
  const onCard = well(ground(INPUTS, '.ui-input', theme), card);

  // A tenth of a ratio point of headroom: the two grounds are different rungs
  // and are not asked to match, only to read as the same kind of well.
  assert.ok(
    inPanel.ratio <= onCard.ratio + 0.1,
    `the search field reads ${inPanel.ratio} against its panel where a kit field reads `
    + `${onCard.ratio} against a card — a deeper well than the kit's own, which is what #306's `
    + 'round 10 reported. The surface a sunken box sits in decides how far it sinks, and a '
    + 'floating panel is a rung above a card.',
  );
  assert.ok(
    inPanel.drop <= onCard.drop + 1,
    `the search field drops ${inPanel.drop} points of lightness from its panel where a kit field `
    + `drops ${onCard.drop} from a card`,
  );
});

test('dark holds the well it already had, and cannot be sunk further', () => {
  const vars = tokensFor('dark');
  const panel = parseColour(substitute('var(--bg-elevated)', vars));
  const deep = well(ground(SHEET, '.ui-dropdown__search-input', 'dark'), panel);
  assert.ok(
    deep.ratio <= DARK_WELL,
    `the dark search field reads ${deep.ratio} against its panel, past the ${DARK_WELL} this tree `
    + 'measured. Dark is the theme round 10 did not report and nobody has decided about; deepening '
    + 'it is a decision somebody writes rather than a drift.',
  );
});

test('the field is still a well, rather than the panel with a line round it', () => {
  for (const theme of THEMES) {
    const vars = tokensFor(theme);
    const panel = parseColour(substitute('var(--bg-elevated)', vars));
    const deep = well(ground(SHEET, '.ui-dropdown__search-input', theme), panel);
    assert.ok(
      deep.ratio >= 1.05,
      `[${theme}] the search field reads ${deep.ratio} against its panel — at that distance the `
      + 'well has been flattened into the surface rather than lightened, and the border is doing '
      + 'all the work',
    );
  }
});
