/* Rule: every width floor the kit writes for a dropdown panel is answered inside
 * a filter row, by a rule that outranks it.
 *
 * `.ui-dropdown__panel` floors a panel at 240px and places it at its trigger's
 * inline start. In a filter row that sum is the page's width: the second chip on
 * a 390px phone starts 158px along, so its panel reached 398px and the page
 * scrolled sideways — shut as well as open. That is #467.
 *
 * Floors are swept, not listed, so a second one joins the subject set by
 * existing, and the sweep fails when it finds none. The check is specificity and
 * not source order: two sheets' order in a consumer's bundle is the consumer's.
 *
 * why: docs/specification.md#a-filter-row-holds-its-panels
 */

/* State what this test cannot measure.
 *
 * WHAT THIS GATE DOES NOT REACH:
 *   - Geometry. It reads declarations, not boxes. That a bounded panel fits a
 *     375px and a 390px view is measured by scripts/evidence/filter-bar-fit.mjs,
 *     which `npm test` does not run — nothing in it drives a browser.
 *   - A floor in a consumer's own sheet, or one an inline style carries.
 *     `ddResetSearch()` writes an inline `min-width` on every search panel; the
 *     `max-width` still bounds it, and no assertion here sees it.
 *   - A floor written as `width` on an ancestor rather than on the panel.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STYLES = path.join(root, 'src/styles');
const PANEL = '.ui-dropdown__panel';
const BAR = '.ui-filter-bar';

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

/** The last value a rule body gives a property, or null. */
const declared = (body, prop) => {
  const hit = [...body.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`, 'g'))].at(-1);
  return hit ? hit[1].trim() : null;
};

/** Class count, which is the whole of the specificity at stake here: every
 *  selector in play is classes only, and a media query adds nothing. */
const classes = (one) => (one.match(/\.[A-Za-z_-][\w-]*/g) || []).length;

/** A selector list, split on the commas between its selectors. */
const selectors = (list) => list.split(',').map((one) => one.trim()).filter(Boolean);

/** A width floor: a rule giving a panel a `min-width` or `width` that is not a
 *  percentage, so it can hold the box wider than whatever contains it. */
function floors(sheets) {
  const found = [];
  for (const [file, css] of sheets) {
    for (const rule of rules(css)) {
      for (const one of selectors(rule.selector)) {
        if (!one.includes(PANEL) || one.includes(BAR)) continue;
        for (const prop of ['min-width', 'width']) {
          const value = declared(rule.body, prop);
          if (value && !value.endsWith('%') && value !== '0' && !value.startsWith('var(')) {
            found.push({ file, selector: one, prop, value, rank: classes(one) });
          }
        }
      }
    }
  }
  return found;
}

/** The bounds a filter row puts on a panel: the `max-width` that stops it
 *  passing its trigger, and the `min-width` that stops it falling short. */
function bounds(sheets) {
  const found = [];
  for (const [file, css] of sheets) {
    for (const rule of rules(css)) {
      for (const one of selectors(rule.selector)) {
        if (!one.includes(PANEL) || !one.includes(BAR)) continue;
        found.push({
          file,
          selector: one,
          rank: classes(one),
          max: declared(rule.body, 'max-width'),
          min: declared(rule.body, 'min-width'),
        });
      }
    }
  }
  return found;
}

/** The finding, or null when a row's panels are bounded. Shared by the sweep
 *  over the kit's own sheets and by the mutations below, so the two cannot
 *  disagree about what counts as bounded. */
function unbounded(sheets) {
  const floor = floors(sheets);
  if (!floor.length) return 'no rule in src/styles/ floors a dropdown panel any more';
  const bound = bounds(sheets).filter((b) => b.max === '100%');
  if (!bound.length) return `${floor.length} panel width floors and no \`${BAR} ${PANEL}\` max-width of 100%`;
  const weak = floor.filter((f) => !bound.some((b) => b.rank > f.rank));
  if (weak.length) {
    return `${weak[0].selector} in ${weak[0].file} outranks every bound, so its `
      + `${weak[0].prop}: ${weak[0].value} decides the panel's width inside a filter row`;
  }
  return null;
}

const sheets = readdirSync(STYLES)
  .filter((name) => name.endsWith('.css'))
  .map((name) => [`src/styles/${name}`, readFileSync(path.join(STYLES, name), 'utf8')]);

test('the kit still floors a panel somewhere, so this gate has a subject', () => {
  const found = floors(sheets);
  assert.ok(
    found.length >= 1,
    'no rule in src/styles/ gives .ui-dropdown__panel a width floor. Either the class was renamed '
    + 'or the floor was dropped; both leave this gate sweeping an empty set and reporting green, '
    + 'so it fails here instead.',
  );
  // The count is asserted, not printed: a floor that quietly stops being swept
  // is the failure this sweep exists to catch.
  assert.equal(found.length, 2, `panel width floors found: ${found.map((f) => `${f.selector} ${f.prop}: ${f.value}`).join('; ')}`);
});

test('a filter row bounds every panel floor, and outranks it', () => {
  assert.equal(unbounded(sheets), null);
});

test('a filter panel is never narrower than the trigger it drops from', () => {
  const floored = bounds(sheets).filter((b) => b.min === '100%');
  assert.ok(
    floored.length >= 1,
    `no \`${BAR} ${PANEL}\` rule sets min-width: 100%. Without it a panel shrinks to its longest `
    + 'option and stops lining up with the chip it belongs to.',
  );
});

/* The mutations. Each is the shape of a real regression, and each has to be
 * refused — a checker that accepts them measures nothing. */
test('the check refuses a row whose panels are not bounded', () => {
  const floor = [['fixture.css', `${PANEL} { min-width: 240px; }`]];
  assert.match(unbounded(floor), /no `\.ui-filter-bar \.ui-dropdown__panel` max-width/);
});

test('the check refuses a bound that only wins by coming later', () => {
  // Same class count on both sides: in the kit's own sheets the bound wins on
  // specificity, and a consumer's bundle decides order. One that ties loses.
  const tie = [
    ['fixture.css', `${PANEL}.is-scroll { min-width: 240px; }`],
    ['fixture-bar.css', `${BAR}__chip ${PANEL} { min-width: 100%; max-width: 100%; }`],
  ];
  assert.match(unbounded(tie), /outranks every bound/);
});

test('the check refuses a sheet with no floor left to bound', () => {
  assert.match(unbounded([['fixture.css', '.ui-dropdown { position: relative; }']]), /no rule/);
});

test('the check accepts the shape the kit actually writes', () => {
  const good = [
    ['fixture.css', `${PANEL} { min-width: 240px; }`],
    ['fixture-bar.css', `${BAR} ${PANEL} { min-width: 100%; max-width: 100%; }`],
  ];
  assert.equal(unbounded(good), null);
});
