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
 * One panel answers to the row rather than to its trigger: see unrooted(). #496
 *
 * why: docs/components.md#a-filter-row-holds-its-panels
 */

/* State what this test cannot measure.
 *
 * WHAT THIS GATE DOES NOT REACH:
 *   - Geometry: it reads declarations, not boxes. That a bounded panel fits a
 *     375px view, the add menu included, is filter-bar-fit.mjs's to measure.
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
const TOKENS = readFileSync(path.join(root, 'src/tokens/tokens.css'), 'utf8');
const PANEL = '.ui-dropdown__panel';
const BAR = '.ui-filter-bar';
const ADD = '[data-filter-add]';

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

/** Class count, which is the whole of the specificity at stake here: no selector
 *  in play carries an id or a tag, and a media query adds nothing. An attribute
 *  selector weighs the same as a class and is counted with them — `[data-filter-add]`
 *  is how the add control's menu is named. */
const classes = (one) => (one.match(/\.[A-Za-z_-][\w-]*|\[[^\]]+\]/g) || []).length;

/** A selector list, split on the commas between its selectors. */
const selectors = (list) => list.split(',').map((one) => one.trim()).filter(Boolean);

/** Every custom property the sheets declare, last declaration winning, over the
 *  kit's own tokens. The sweep rules over `src/styles/` alone, but a length there
 *  is written as a token from `src/tokens/`, and one this could not read would be
 *  reported as a floor of unknown size — which is how `min(var(--panel-sm), 100%)`
 *  came back as unbounded. Tokens go first, so a fixture can still declare its own. */
function customProperties(sheets) {
  const vars = new Map();
  for (const [, css] of [['src/tokens/tokens.css', TOKENS], ...sheets]) {
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

/** Which anchor a scope is written for: a chip's values, the add control's
 *  catalogue, or neither. The two subjects filterPanelRow() answers for, and the
 *  two the hold has to reach. */
const anchorOf = (one) => (/\.ui-filter-bar__chip\b/.test(one) ? 'a chip menu'
  : (/\[data-filter-add\]/.test(one) ? "the add control's menu" : null));

/** The finding, or null when every state an anchored panel is painted in carries
 *  the same geometry. A panel fades for --dur-med after `open` goes, so a rule that
 *  only answers `.open` leaves the fade painting a collapsed menu — #549 again.
 *
 *  Asked per anchor and inside one rule: the kit writes all four states as one
 *  selector list, so a list that held the chip and not the catalogue would satisfy
 *  a check that only asked whether `.is-closing` appears somewhere in it. */
function unheldOnClose(sheets) {
  const found = fitScopes(sheets);
  if (!found.length) return 'no rule writes --ui-filter-panel-* onto a chip menu any more';
  for (const rule of found) {
    for (const one of rule.scopes) {
      if (!/\.open\b/.test(one)) continue;
      const held = rule.scopes.some((other) => /\.is-closing\b/.test(other)
        && anchorOf(other) === anchorOf(one));
      if (held) continue;
      return `${one} in ${rule.file} gives ${rule.props.join(' and ')} to an `
        + 'open menu and to nothing else, so a closing one drops it while it is still painted';
    }
  }
  // And both anchors are held, so neither can be dropped from the list in silence.
  const anchors = new Set(found.flatMap((rule) => rule.scopes
    .filter((one) => /\.is-closing\b/.test(one)).map(anchorOf)));
  for (const want of ['a chip menu', "the add control's menu"]) {
    if (!anchors.has(want)) return `nothing in src/styles/ holds ${want} through its fade`;
  }
  return null;
}

const gateSource = readFileSync(path.join(root, 'scripts/evidence/filter-bar-fit.mjs'), 'utf8');

/* The add control's menu, #496 — the one panel in a row that asks for more than a
 * chip's values, because it carries the screen's catalogue with a field over it.
 * Its width is decided by a CASCADE and not by one rule: the row's open rule
 * floors every menu, and the add menu's own rule raises that floor. A reader of
 * named declarations cannot see a rule that takes the width away again, which is
 * what this resolver is for. */

/** The element chain the add menu's panel hangs in, outermost first, each step as
 *  the classes and attributes that element carries. A selector matches the menu
 *  when its compounds walk this chain in order and its last compound lands on the
 *  panel itself. Searching, because that is the menu the catalogue draws. */
const ADD_CHAIN = [
  ['.ui-filter-bar'],
  ['[data-filter-add]'],
  ['.ui-dropdown', '.open'],
  ['.ui-dropdown__panel', '.ui-dropdown__panel--search'],
];

/** The tokens of one compound selector: `.a.b[c]` → ['.a', '.b', '[c]']. */
const compound = (one) => one.match(/\.[A-Za-z_-][\w-]*|\[[^\]]+\]/g) || [];

/** Whether a descendant selector matches the chain, its last compound on the last
 *  element. Walks right to left, taking the nearest ancestor that carries every
 *  token — the kit writes descendant combinators here and nothing else. */
function matchesChain(one, chain = ADD_CHAIN) {
  const parts = one.trim().split(/\s+/).filter(Boolean);
  if (parts.some((part) => /[>+~]/.test(part))) return false;
  let at = chain.length - 1;
  const last = compound(parts[parts.length - 1]);
  if (!last.length || !last.every((t) => chain[at].includes(t))) return false;
  at -= 1;
  for (let i = parts.length - 2; i >= 0; i -= 1) {
    const want = compound(parts[i]);
    while (at >= 0 && !want.every((t) => chain[at].includes(t))) at -= 1;
    if (at < 0) return false;
    at -= 1;
  }
  return true;
}

/** What the cascade leaves the add menu for one property: the matching declaration
 *  with the most classes. A tie between two files is reported rather than resolved
 *  — their order in a consumer's bundle is the consumer's, which is the same
 *  reason the bound above is checked by specificity and not by source order. */
function winning(sheets, prop, chain = ADD_CHAIN) {
  const matched = [];
  for (const [file, css] of sheets) {
    for (const rule of rules(css)) {
      for (const one of selectors(rule.selector)) {
        if (!matchesChain(one, chain)) continue;
        const value = declared(rule.body, prop);
        if (value) matched.push({ file, selector: one, prop, value, rank: classes(one) });
      }
    }
  }
  if (!matched.length) return null;
  const top = Math.max(...matched.map((m) => m.rank));
  const at = matched.filter((m) => m.rank === top);
  const disagree = at.filter((m) => m.value !== at[at.length - 1].value);
  if (disagree.length && new Set(at.map((m) => m.file)).size > 1) {
    return { ...at[at.length - 1], tied: at.map((m) => `${m.selector} in ${m.file}: ${m.value}`) };
  }
  return at[at.length - 1];
}

/** The finding, or null when the cascade leaves the add menu a panel's width that
 *  cannot leave its row. Two questions, both asked of the resolved cascade rather
 *  than of a rule somebody named: does it still reach past a chip's floor, and can
 *  what it reaches exceed the room the row measured? */
function addMenuWidth(sheets) {
  const vars = customProperties(sheets);
  const min = winning(sheets, 'min-width');
  const max = winning(sheets, 'max-width');
  const ask = winning(sheets, '--ui-filter-panel-ask');
  if (!min) return 'nothing in src/styles/ floors the add menu, so it shrinks to its rows';
  for (const won of [min, max, ask]) {
    if (won?.tied) {
      return `two rules tie on the add menu's ${won.prop} and a consumer's bundle order would `
        + `decide it: ${won.tied.join('; ')}`;
    }
  }
  if (canExceed(resolveVars(min.value, vars), min.selector)) {
    return `${min.selector} in ${min.file} wins the add menu's min-width with `
      + `${min.value}, which nothing caps at the room its row measured`;
  }
  // The fit writes the floor it resolved; a winner that does not read it renders
  // whatever that rule says and the menu's ask never reaches the width.
  if (!min.value.includes('--ui-filter-panel-floor')) {
    return `${min.selector} in ${min.file} wins the add menu's min-width with ${min.value}, `
      + 'which does not read the floor the fit resolved';
  }
  if (!max || canExceed(resolveVars(max.value, vars), max.selector)) {
    return `the add menu's max-width resolves to ${max ? max.value : 'nothing'}, which does not `
      + 'hold it inside the room its row measured';
  }
  const asked = Number.parseFloat(resolveVars(ask?.value ?? '', vars) ?? '');
  if (!ask || !Number.isFinite(asked)) {
    return 'the add menu declares no --ui-filter-panel-ask, so the fit measures it against a '
      + "chip's floor and the catalogue draws at a chip's width";
  }
  if (asked <= DD_MENU_FLOOR) {
    return `the add menu asks for ${ask.value} (${asked}px), which is no more than the kit's `
      + `${DD_MENU_FLOOR}px menu floor — then it does not need to ask at all`;
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

test('every copy of the menu floor agrees', () => {
  const found = menuFloors(sheets, DD_MENU_FLOOR, gateSource);
  // Four places write it: the standalone panel's rule, the fallback in the row's
  // open rule — one declaration block for all four anchored states, so a chip's
  // menu and the add control's read the same copy — the module both
  // implementations call, and the browser gate.
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

test('the check refuses a list that holds the chip and drops the add menu', () => {
  /* The shape the merged selector list makes possible, and the reason the reading is
   * per anchor: `.is-closing` appears, so a check that only looked for it stayed
   * green while the catalogue collapsed on every close. */
  const half = [['fixture-bar.css',
    `${BAR}__chip .ui-dropdown.open ${PANEL},`
    + ` ${BAR}__chip ${PANEL}.is-closing,`
    + ` ${BAR} ${ADD} .ui-dropdown.open ${PANEL}`
    + ' { min-width: min(var(--ui-filter-panel-floor, 240px), 100%); }']];
  assert.match(unheldOnClose(half), /open menu and to nothing else/);
  // And the other way: the hold dropped from the list altogether.
  const none = [['fixture-bar.css',
    `${BAR}__chip ${PANEL}.is-closing`
    + ' { min-width: min(var(--ui-filter-panel-floor, 240px), 100%); }']];
  assert.match(unheldOnClose(none), /holds the add control's menu through its fade/);
});

test('the check refuses a sheet that stopped writing the fit at all', () => {
  assert.match(unheldOnClose([['fixture.css', '.ui-dropdown { position: relative; }']]), /no rule writes/);
});

/* The add control's menu, #496. Its width is the cascade's, so the cascade is what
 * is asserted — a rule outranking the one below takes the width away in silence. */
test("the cascade leaves the add menu a panel's width, bounded by its row", () => {
  assert.equal(addMenuWidth(sheets), null);
});

test('the resolver reads the chain the menu hangs in, and refuses one it does not', () => {
  // Without this the check could match nothing and report green.
  assert.equal(matchesChain('.ui-filter-bar .ui-dropdown.open .ui-dropdown__panel'), true);
  assert.equal(matchesChain(`${BAR} ${ADD} .ui-dropdown.open ${PANEL}`), true);
  assert.equal(matchesChain(`${PANEL}--search`), true);
  assert.equal(matchesChain(`${BAR}__chip ${PANEL}`), false, 'a chip is not in the add menu\'s chain');
  assert.equal(matchesChain(`${ADD} .ui-dropdown`), false, 'the last compound has to land on the panel');
  assert.equal(matchesChain(`${BAR} > ${PANEL}`), false, 'a child combinator is not walked');
  const win = winning(sheets, 'min-width');
  assert.ok(win && win.rank >= 4, `the winning min-width is ${win && win.selector}`);
});

test('the check refuses a later rule that takes the width away', () => {
  // The review's case: a rule nobody names outranks the add menu's own and the
  // reader of named declarations stays green while the menu is a chip's width.
  const squeezed = [
    ['fixture.css', `${BAR} .ui-dropdown.open ${PANEL} { min-width: min(var(--ui-filter-panel-floor, 240px), var(--ui-filter-panel-room, 100%)); max-width: var(--ui-filter-panel-room, 100%); }`],
    ['fixture-ask.css', `${BAR} ${ADD} ${PANEL} { --ui-filter-panel-ask: 320px; }`],
    ['fixture-later.css', `${BAR} ${ADD} .ui-dropdown.open ${PANEL}${PANEL}--search { min-width: 100%; max-width: 100%; }`],
  ];
  assert.match(addMenuWidth(squeezed), /does not read the floor the fit resolved/);
});

test('the check refuses a floor the room does not cap, a menu nothing holds, and one that asks for nothing', () => {
  const uncapped = [
    ['fixture.css', `${BAR} .ui-dropdown.open ${PANEL} { min-width: var(--ui-filter-panel-floor, 240px); max-width: var(--ui-filter-panel-room, 100%); }`],
  ];
  assert.match(addMenuWidth(uncapped), /nothing caps at the room/);
  const unheld = [
    ['fixture.css', `${BAR} .ui-dropdown.open ${PANEL} { min-width: min(var(--ui-filter-panel-floor, 240px), 100%); max-width: none; }`],
  ];
  assert.match(addMenuWidth(unheld), /does not hold it inside the room/);
  const silent = [
    ['fixture.css', `${BAR} .ui-dropdown.open ${PANEL} { min-width: min(var(--ui-filter-panel-floor, 240px), var(--ui-filter-panel-room, 100%)); max-width: var(--ui-filter-panel-room, 100%); }`],
  ];
  assert.match(addMenuWidth(silent), /declares no --ui-filter-panel-ask/);
  const small = [...silent, ['fixture-ask.css', `${BAR} ${ADD} ${PANEL} { --ui-filter-panel-ask: 240px; }`]];
  assert.match(addMenuWidth(small), /no more than the kit's 240px menu floor/);
  assert.match(addMenuWidth([['fixture.css', `${BAR} ${PANEL} { max-width: 100%; }`]]), /nothing in src\/styles\/ floors/);
});

test('the check refuses a tie between two sheets, where bundle order would decide', () => {
  const tied = [
    ['fixture-a.css', `${BAR} ${ADD} .ui-dropdown.open ${PANEL} { min-width: min(var(--ui-filter-panel-floor, 240px), var(--ui-filter-panel-room, 100%)); max-width: var(--ui-filter-panel-room, 100%); }`],
    ['fixture-b.css', `${BAR} ${ADD} .ui-dropdown.open ${PANEL} { min-width: min(320px, var(--ui-filter-panel-room, 100%)); }`],
  ];
  assert.match(addMenuWidth(tied), /two rules tie on the add menu's min-width/);
});

test('the check accepts the shape the add menu is actually written with', () => {
  const good = [
    ['fixture-row.css', `${BAR} .ui-dropdown.open ${PANEL} { min-width: min(var(--ui-filter-panel-floor, 240px), var(--ui-filter-panel-room, 100%)); max-width: var(--ui-filter-panel-room, 100%); }`],
    ['fixture-add.css', `${BAR} ${ADD} ${PANEL} { --ui-filter-panel-ask: var(--panel-sm); }`],
  ];
  assert.equal(addMenuWidth(good), null);
});
