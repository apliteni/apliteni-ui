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
 *   - Geometry: it reads declarations, not boxes. That a bounded panel fits a
 *     375px view is measured by filter-bar-fit.mjs, which `npm test` cannot run.
 *   - A floor in a consumer's own sheet, or one an inline style carries — such
 *     as the `min-width` `ddResetSearch()` writes on every search panel.
 *   - A floor written as `width` on an ancestor rather than on the panel.
 *   - Arithmetic: a token resolves to its declared value or its fallback, but
 *     `calc(...)` is not, so it counts as a floor with its length unknown.
 *   - Which block a custom property came from: last-in-file wins here, where a
 *     browser picks per selector and viewport.
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

/** Every custom property the sheets declare, last declaration winning. A floor
 *  spelled as a token is still a floor, so the sweep has to be able to read one. */
function customProperties(sheets) {
  const vars = new Map();
  for (const [, css] of sheets) {
    for (const rule of rules(css)) {
      for (const hit of rule.body.matchAll(/(?:^|;)\s*(--[\w-]+)\s*:([^;]*)/g)) {
        vars.set(hit[1], hit[2].trim());
      }
    }
  }
  return vars;
}

/** One `var(` reference as [token, fallback], reading to its matching paren so a
 *  fallback holding its own parentheses is not cut in half. */
function readVar(value, at) {
  let depth = 0;
  for (let i = at; i < value.length; i += 1) {
    if (value[i] === '(') depth += 1;
    else if (value[i] === ')') {
      depth -= 1;
      if (!depth) {
        const inside = value.slice(at + 4, i);
        const comma = splitTop(inside);
        return { token: comma[0].trim(), fallback: comma[1], end: i + 1 };
      }
    }
  }
  return null;
}

/** Split on the first top-level comma — the one separating a var()'s token from
 *  its fallback, not a comma inside a nested function. */
function splitTop(inside) {
  let depth = 0;
  for (let i = 0; i < inside.length; i += 1) {
    if (inside[i] === '(') depth += 1;
    else if (inside[i] === ')') depth -= 1;
    else if (inside[i] === ',' && !depth) return [inside.slice(0, i), inside.slice(i + 1).trim()];
  }
  return [inside];
}

/** A value with every `var()` replaced by what it resolves to, or null when some
 *  token resolves to nothing — a declared property first, then the fallback. */
function resolveVars(value, vars, depth = 0) {
  if (depth > 8) return null;
  let out = value;
  let at = out.indexOf('var(');
  while (at !== -1) {
    const ref = readVar(out, at);
    if (!ref) return null;
    const declaredValue = vars.get(ref.token);
    const source = declaredValue !== undefined ? declaredValue : ref.fallback;
    if (source === undefined) return null;
    const resolved = resolveVars(source, vars, depth + 1);
    if (resolved === null) return null;
    out = out.slice(0, at) + resolved + out.slice(ref.end);
    at = out.indexOf('var(');
  }
  return out.trim();
}

/** A width floor: a rule giving a panel a `min-width` or `width` that is not a
 *  percentage, so it can hold the box wider than whatever contains it.
 *
 *  A token is resolved rather than skipped. In a kit whose lengths are tokens,
 *  `var(--panel-floor, 320px)` is the likely shape of the next floor, and one
 *  that went unread would tie the bound's specificity and win on source order
 *  while this sweep reported green. A value that resolves to nothing is counted
 *  as a floor rather than waved through: a floor this cannot rule out is one it
 *  has to report. */
function floors(sheets) {
  const vars = customProperties(sheets);
  const found = [];
  for (const [file, css] of sheets) {
    for (const rule of rules(css)) {
      for (const one of selectors(rule.selector)) {
        if (!one.includes(PANEL) || one.includes(BAR)) continue;
        for (const prop of ['min-width', 'width']) {
          const value = declared(rule.body, prop);
          if (!value) continue;
          const resolved = resolveVars(value, vars);
          if (resolved !== null && (resolved.endsWith('%') || resolved === '0')) continue;
          found.push({ file, selector: one, prop, value, resolved, rank: classes(one) });
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
    const spelt = weak[0].resolved !== null && weak[0].resolved !== weak[0].value
      ? `${weak[0].value} (${weak[0].resolved})`
      : weak[0].value;
    return `${weak[0].selector} in ${weak[0].file} outranks every bound, so its `
      + `${weak[0].prop}: ${spelt} decides the panel's width inside a filter row`;
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

test('a floor spelled as a token is read, not skipped', () => {
  // The review's case: same floor, same specificity, green or red depending only
  // on how the length was spelled. Two classes ties the bound, so source order
  // would decide and the bound can lose.
  const token = [
    ['fixture.css', `${PANEL}.is-wide { min-width: var(--panel-floor, 320px); }`],
    ['fixture-bar.css', `${BAR} ${PANEL} { min-width: 100%; max-width: 100%; }`],
  ];
  const literal = [
    ['fixture.css', `${PANEL}.is-wide { min-width: 320px; }`],
    ['fixture-bar.css', `${BAR} ${PANEL} { min-width: 100%; max-width: 100%; }`],
  ];
  assert.equal(floors(token).length, 1, 'a var() floor has to be counted like a literal one');
  assert.equal(floors(token)[0].resolved, '320px');
  // The two spellings have to reach the same verdict, which is the whole point;
  // the finding quotes the value as written, so only the verdict is compared.
  assert.match(unbounded(token), /outranks every bound/);
  assert.match(unbounded(literal), /outranks every bound/);
  assert.equal(unbounded(token) === null, unbounded(literal) === null);
});

test('a token resolves through a declared property, not only through its fallback', () => {
  const declaredFloor = [
    ['tokens.css', ':root { --panel-floor: 320px; }'],
    ['fixture.css', `${PANEL}.is-wide { min-width: var(--panel-floor); }`],
    ['fixture-bar.css', `${BAR} ${PANEL} { min-width: 100%; max-width: 100%; }`],
  ];
  assert.equal(floors(declaredFloor)[0].resolved, '320px');
  assert.match(unbounded(declaredFloor), /outranks every bound/);
});

test('a token resolving to a percentage is not a floor', () => {
  const percent = [
    ['tokens.css', ':root { --panel-floor: 100%; }'],
    ['fixture.css', `${PANEL}.is-wide { min-width: var(--panel-floor); }`],
  ];
  assert.equal(floors(percent).length, 0);
});

test('a token that resolves to nothing is counted rather than waved through', () => {
  // No declaration and no fallback: the length is unknown, so it is reported.
  const unknown = [['fixture.css', `${PANEL}.is-wide { min-width: var(--panel-floor); }`]];
  assert.equal(floors(unknown).length, 1);
  assert.equal(floors(unknown)[0].resolved, null);
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
