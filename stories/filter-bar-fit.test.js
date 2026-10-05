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
 * why: docs/components.md#a-filter-row-holds-its-panels
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
import { DD_MENU_FLOOR } from '../src/components/dropdown.js';
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

/** Whether a resolved length can exceed its containing block. A percentage
 *  cannot, and neither can a `min()` holding one: `min(240px, 100%)` is at most
 *  `100%` whatever the first term says. That is arithmetic rather than a special
 *  case, and it is what lets a filter row floor an open menu — the floor is
 *  capped by the room the row leaves, so it can never hold the box wider than
 *  the row. A `max()` is the opposite and stays a floor. */
function canExceed(resolved, selector = '') {
  if (resolved === null) return true;
  const value = resolved.trim();
  if (value.endsWith('%') || value === '0') return false;
  const min = /^min\(([\s\S]*)\)$/.exec(value);
  /* A `min()` holding a percentage is at most that percentage — but only if the
   * percentage is what the browser uses. The kit writes these through a custom
   * property that JavaScript sets to an absolute length, so the fallback
   * resolved here is what renders only until the fit runs. A rule that applies
   * after it has may be read this way; the shut rule, which is the one #467 is
   * about, may not — a shut-scope floor spelled through a token would otherwise
   * walk past this guard at any width.
   *
   * Two scopes qualify, and they are the two in which a panel is PAINTED: `.open`,
   * and `.is-closing`, which holds the open geometry through the fade out. The fit
   * has been written in both, and in both the row is what caps the box — the same
   * reason, so the same reading. Anything else is shut scope and is refused. */
  if (min && /\.open\b|\.is-closing\b/.test(selector)) {
    return !splitArgs(min[1]).some((arg) => !canExceed(arg.trim(), selector));
  }
  return true;
}

/** A function's arguments, split on its own top-level commas. */
function splitArgs(inside) {
  const out = [];
  let depth = 0;
  let at = 0;
  for (let i = 0; i < inside.length; i += 1) {
    if (inside[i] === '(') depth += 1;
    else if (inside[i] === ')') depth -= 1;
    else if (inside[i] === ',' && !depth) { out.push(inside.slice(at, i)); at = i + 1; }
  }
  out.push(inside.slice(at));
  return out;
}

/** A width floor: a rule giving a panel a `min-width` or `width` that can hold
 *  the box wider than whatever contains it.
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
        if (!one.includes(PANEL)) continue;
        for (const prop of ['min-width', 'width']) {
          const value = declared(rule.body, prop);
          if (!value) continue;
          const resolved = resolveVars(value, vars);
          if (!canExceed(resolved, one)) continue;
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

/** Every place the kit writes its menu floor, read rather than repeated. The
 *  number lives in two stylesheets, in the module both implementations call and
 *  in the browser gate; a copy that drifts is a menu that disagrees with itself,
 *  and nothing else would notice. */
function menuFloors(sheets, jsFloor, gateSource) {
  const found = [];
  for (const [file, css] of sheets) {
    for (const rule of rules(css)) {
      const value = declared(rule.body, 'min-width');
      if (!value) continue;
      /* The fallback a filter row's menu reads when the fit has not run. Asked of
       * the RULE and not of each selector in its list: the open geometry is one
       * declaration shared by the open scope and the closing one, and counting it
       * once per selector would report a second copy that does not exist. */
      const token = /min\(\s*var\(\s*--ui-filter-panel-floor\s*,\s*(\d+(?:\.\d+)?)px\s*\)/.exec(value);
      if (token) found.push({ where: `${file} (fallback)`, px: Number(token[1]) });
      // The standalone panel's own floor, not a variant's.
      const bare = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
      if (!bare) continue;
      for (const one of selectors(rule.selector)) {
        if (one.trim() === PANEL) found.push({ where: file, px: Number(bare[1]) });
      }
    }
  }
  found.push({ where: 'DD_MENU_FLOOR', px: jsFloor });
  const gate = /const MENU_FLOOR = (\d+(?:\.\d+)?)/.exec(gateSource);
  if (gate) found.push({ where: 'filter-bar-fit.mjs', px: Number(gate[1]) });
  return found;
}

/** Every rule that writes a chip menu's open geometry, as the scopes it applies to.
 *  The geometry is three declarations — the floor, the cap and the slide — and the
 *  question asked of it is which states they reach. */
function fitScopes(sheets) {
  const out = [];
  for (const [file, css] of sheets) {
    for (const rule of rules(css)) {
      const props = ['min-width', 'max-width', 'margin-inline-start', 'margin-inline-end']
        .filter((prop) => (declared(rule.body, prop) || '').includes('--ui-filter-panel-'));
      if (!props.length) continue;
      out.push({ file, props, scopes: selectors(rule.selector) });
    }
  }
  return out;
}

/** The finding, or null when every state a chip's panel is painted in carries the
 *  same geometry. A panel fades for --dur-med after `open` goes, so a rule that
 *  only answers `.open` leaves the fade painting a collapsed menu — #549 again. */
function unheldOnClose(sheets) {
  const found = fitScopes(sheets);
  if (!found.length) return 'no rule writes --ui-filter-panel-* onto a chip menu any more';
  const bad = found.filter((rule) => rule.scopes.some((one) => /\.open\b/.test(one))
    && !rule.scopes.some((one) => /\.is-closing\b/.test(one)));
  if (bad.length) {
    return `${bad[0].scopes.join(', ')} in ${bad[0].file} gives ${bad[0].props.join(' and ')} to an `
      + 'open menu and to nothing else, so a closing one drops it while it is still painted';
  }
  return null;
}

const gateSource = readFileSync(path.join(root, 'scripts/evidence/filter-bar-fit.mjs'), 'utf8');

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

test('every copy of the menu floor agrees', () => {
  const found = menuFloors(sheets, DD_MENU_FLOOR, gateSource);
  // Four places write it: the standalone panel's rule, the filter row's
  // fallback, the module both implementations call, and the browser gate.
  assert.equal(found.length, 4, `floors found: ${found.map((f) => `${f.where}=${f.px}`).join(', ')}`);
  const distinct = [...new Set(found.map((f) => f.px))];
  assert.deepEqual(distinct, [240], found.map((f) => `${f.where}=${f.px}`).join(', '));
});

test('the sweep refuses a floor that drifted in one place', () => {
  // The mutation the old assertion could not fail: change the stylesheet alone
  // and the constant no longer describes what ships.
  const drifted = sheets.map(([file, css]) => [
    file,
    file.endsWith('dropdown.css') ? css.replace('min-width: 240px', 'min-width: 260px') : css,
  ]);
  const found = menuFloors(drifted, DD_MENU_FLOOR, gateSource);
  assert.notDeepEqual([...new Set(found.map((f) => f.px))], [240]);
});

test('the sweep refuses a floor that drifted in the module', () => {
  const found = menuFloors(sheets, 260, gateSource);
  assert.notDeepEqual([...new Set(found.map((f) => f.px))], [240]);
});

test('the sweep refuses a floor that drifted in the browser gate', () => {
  const found = menuFloors(sheets, DD_MENU_FLOOR, 'const MENU_FLOOR = 260;');
  assert.notDeepEqual([...new Set(found.map((f) => f.px))], [240]);
});

test('a shut-scope floor spelled through a token is still a floor', () => {
  // #467's guard. A custom property a browser resolves from JavaScript never
  // reads the fallback this parser does, so outside `.open` the exemption would
  // admit a floor of any width.
  const shut = [
    ['fixture.css', `${BAR} ${PANEL} { min-width: min(400px, var(--x, 100%)); }`],
    ['fixture-bar.css', `${BAR} ${PANEL} { max-width: 100%; }`],
  ];
  assert.equal(floors(shut).length, 1);
  assert.match(unbounded(shut), /outranks every bound|max-width/);
});

test('a floor capped by a percentage is not a floor, however it is spelled', () => {
  // `min(240px, 100%)` is at most `100%`, so it cannot hold the box wider than
  // what contains it. That is what lets a filter row floor an OPEN menu without
  // re-opening #467: the floor is capped by the room the row leaves.
  const capped = [
    ['fixture.css', `${BAR} .ui-dropdown.open ${PANEL} { min-width: min(240px, 100%); }`],
    ['fixture-bar.css', `${BAR} ${PANEL} { min-width: 100%; max-width: 100%; }`],
  ];
  assert.equal(floors(capped).length, 0);
  // Through a token, the way the kit actually writes it.
  const viaVar = [
    ['fixture.css', `${BAR} .ui-dropdown.open ${PANEL} { min-width: min(240px, var(--room, 100%)); }`],
    ['fixture-bar.css', `${BAR} ${PANEL} { min-width: 100%; max-width: 100%; }`],
  ];
  assert.equal(floors(viaVar).length, 0);
});

test('an uncapped length inside a min() is still a floor', () => {
  // The mutation: drop the percentage and the cap goes with it.
  const bare = [['fixture.css', `${BAR} .ui-dropdown.open ${PANEL} { min-width: min(240px, 320px); }`]];
  assert.equal(floors(bare).length, 1);
  // And a max() is the opposite of a min(): it can only grow the box.
  const grows = [['fixture.css', `${BAR} .ui-dropdown.open ${PANEL} { min-width: max(240px, 100%); }`]];
  assert.equal(floors(grows).length, 1);
});

test('a floor written inside the bar\'s own scope is seen, not skipped', () => {
  // The sweep used to ignore any selector mentioning the bar, which is where the
  // most dangerous floor lives: inside the bar's scope it carries more classes
  // than the bound, and `min-width` beats `max-width` whatever the specificity,
  // so the bound cannot answer it at all.
  const inside = [
    ['fixture.css', `${BAR} ${PANEL}--search { min-width: 280px; }`],
    ['fixture-bar.css', `${BAR} ${PANEL} { min-width: 100%; max-width: 100%; }`],
  ];
  assert.equal(floors(inside).length, 1);
  assert.match(unbounded(inside), /outranks every bound/);
});

test('the bound itself is not counted as a floor it has to answer', () => {
  // It is a percentage, so it cannot hold the box wider than its containing
  // block — which is why dropping the bar from the skip list is safe.
  const bound = [['fixture-bar.css', `${BAR} ${PANEL} { min-width: 100%; max-width: 100%; }`]];
  assert.equal(floors(bound).length, 0);
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

test('the closing scope reads like the open one, and only while it is capped', () => {
  // `is-closing` holds the open geometry through the fade, so the same reading
  // applies to it: capped by the room the row leaves, so not a floor.
  const capped = [
    ['fixture.css', `${BAR}__chip ${PANEL}.is-closing { min-width: min(240px, var(--room, 100%)); }`],
    ['fixture-bar.css', `${BAR} ${PANEL} { min-width: 100%; max-width: 100%; }`],
  ];
  assert.equal(floors(capped).length, 0);
  // The mutation: take the cap away and the exemption goes with it.
  const bare = [['fixture.css', `${BAR}__chip ${PANEL}.is-closing { min-width: 240px; }`]];
  assert.equal(floors(bare).length, 1);
});

test('a closing chip menu keeps the open geometry, so #549 is not repainted on the way out', () => {
  const found = fitScopes(sheets);
  assert.ok(
    found.length >= 1,
    'no rule in src/styles/ writes --ui-filter-panel-* onto a chip menu. Either the properties were '
    + 'renamed or the fit stopped being read; both leave this check with nothing to measure.',
  );
  assert.equal(unheldOnClose(sheets), null);
});

test('the check refuses geometry that only answers .open', () => {
  // The state this PR replaced: the fit stops applying in the frame the menu
  // closes, while the panel keeps fading for --dur-med.
  const openOnly = [['fixture-bar.css',
    `${BAR}__chip .ui-dropdown.open ${PANEL} { min-width: min(var(--ui-filter-panel-floor, 240px), 100%); }`]];
  assert.match(unheldOnClose(openOnly), /open menu and to nothing else/);
});

test('the check refuses a sheet that stopped writing the fit at all', () => {
  assert.match(unheldOnClose([['fixture.css', '.ui-dropdown { position: relative; }']]), /no rule writes/);
});
