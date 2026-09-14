/* Reading a box-shadow the way the elevation rule reads one.
 *
 * One implementation, imported by the gate in each workspace —
 * why: CONTRIBUTING.md#one-gate-per-workspace-over-one-shared-implementation
 *
 * The rule in docs/specification.md#elevation turns on one distinction: a CAST
 * shadow is an offset layer of ink under a surface, and a ring or a glow is a
 * zero-offset layer that says *this is lit*. Both are written `box-shadow`, so
 * the property name decides nothing and the layer has to be read.
 */

/** Split a box-shadow value into its comma-separated layers, respecting nesting.
 *  color-mix(in srgb, var(--x) 62%, transparent) carries two commas of its own,
 *  and a naive split turns one layer into three unparseable ones. */
export function layersOf(value) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < value.length; i += 1) {
    const c = value[i];
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    else if (c === ',' && depth === 0) { out.push(value.slice(from, i).trim()); from = i + 1; }
  }
  const last = value.slice(from).trim();
  if (last) out.push(last);
  return out.filter(Boolean);
}

/* A length is what the layer's geometry is made of. Anything else in the layer —
 * `inset`, a hex, a color-mix(), a var() — is not a length and is skipped, which
 * is what lets the same reader work on a substituted value and on a raw one. */
const LENGTH = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:px|rem|em)?$/;

/** The top-level words of a layer, with a function and its brackets kept whole. */
function wordsOf(layer) {
  const out = [];
  let depth = 0;
  let word = '';
  for (const c of layer) {
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    if (depth === 0 && /\s/.test(c)) { if (word) out.push(word); word = ''; continue; }
    word += c;
  }
  if (word) out.push(word);
  return out;
}

/** The lengths of one layer, in order: x, y, blur, spread. Missing ones are 0,
 *  and one written as a var() this reader cannot resolve is NaN — see below. */
export function geometryOf(layer) {
  const words = wordsOf(layer).filter((w) => w !== 'inset');
  const nums = [];
  for (const [i, word] of words.entries()) {
    if (LENGTH.test(word)) { nums.push(Number.parseFloat(word)); continue; }
    /* A var() standing where a length belongs — `0 var(--y) 10px black` — is a
     * length this reader cannot resolve, and reporting 0 for it would call an
     * offset layer flat and let a cast shadow through isCast(). NaN says "not
     * read": every comparison against it is false, so the layer is taken FOR a
     * cast rather than cleared as one, and the caller that holds the vars can
     * substitute and read it again. A var() in the LAST slot is the colour —
     * `inset 1px 0 0 var(--border)` is how the drawer writes its line — and a
     * colour function is never a length. #314 nit 8. */
    if (word.startsWith('var(') && i < words.length - 1 && nums.length < 4) { nums.push(Number.NaN); continue; }
    break;
  }
  const [x = 0, y = 0, blur = 0, spread = 0] = nums;
  return { x, y, blur, spread };
}

/** Is this layer a cast shadow — ink offset or blurred under the surface? */
export function isCast(layer) {
  if (/(^|\s)inset(\s|$)/.test(layer)) return false;
  const { x, y, blur } = geometryOf(layer);
  return x !== 0 || y !== 0 || blur !== 0;
}

/* Every box-shadow declaration in a stylesheet, with the selector it sits under.
 * Comments come out first: a commented-out declaration is not a declaration, and
 * the pattern anchors on `{` and `;`, either of which a comment can stand between.
 * Strings are not blanked, because no box-shadow in this kit holds one — a value
 * that did would be reported with its quotes, which is loud rather than silent. */
const RULE = /([^{}]+)\{([^{}]*)\}/g;

/** Blank a comment out without moving a line, so a counted line stays honest. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** Every custom property a stylesheet declares, with the selector it sits under.
 *  The React gate harvests its own workspace with this, because the vanilla
 *  resolver (stories/lib/contrast.js) reads what `src/index.css` imports and
 *  nothing else — a property declared in `react/src/` was invisible to it, and a
 *  cast written behind one resolved to nothing at all. #314 round 2, finding 2. */
export function customPropertiesIn(css) {
  const clean = decomment(css);
  const found = [];
  for (const m of clean.matchAll(RULE)) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    if (selector.startsWith('@')) continue;
    for (const decl of m[2].split(';')) {
      const i = decl.indexOf(':');
      if (i < 0) continue;
      const name = decl.slice(0, i).trim();
      if (!name.startsWith('--')) continue;
      found.push({ selector, name, value: decl.slice(i + 1).trim() });
    }
  }
  return found;
}

export function boxShadowsIn(css) {
  const clean = decomment(css);
  const found = [];
  for (const m of clean.matchAll(RULE)) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    for (const decl of m[2].split(';')) {
      const i = decl.indexOf(':');
      if (i < 0) continue;
      if (decl.slice(0, i).trim().toLowerCase() !== 'box-shadow') continue;
      const line = clean.slice(0, m.index + m[0].indexOf(decl)).split('\n').length;
      found.push({ selector, value: decl.slice(i + 1).trim(), line });
    }
  }
  return found;
}

/** The ink of one layer: everything that is not `inset` and not a leading length. */
export function inkOf(layer) {
  const rest = layer.replace(/(^|\s)inset(\s|$)/, ' ').trim();
  let depth = 0;
  let word = '';
  let at = 0;
  for (let i = 0; i <= rest.length; i += 1) {
    const c = rest[i] ?? ' ';
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    if (depth === 0 && /\s/.test(c)) {
      if (word && !LENGTH.test(word)) return rest.slice(at).trim();
      if (word) at = i + 1;
      word = '';
      continue;
    }
    word += c;
  }
  return '';
}

/** Every custom property a value reads, transitively, through `vars`. */
export function namesRead(value, vars, seen = new Set()) {
  for (const [, name] of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (seen.has(name)) continue;
    seen.add(name);
    namesRead(vars.get(name) ?? '', vars, seen);
  }
  return seen;
}

/* Every value a layer can resolve to: the cascade's winner, then that winner with
 * one of the properties it reads swapped for each OTHER value the kit gives that
 * name. Resolving one declaration per name is a guess about the cascade, and a
 * guess can be walked past — #314 parked a real drop behind a redeclared property
 * and watched a gate stay green, twice. Trying every declared value is an
 * over-approximation on purpose: it can call a cast no element paints, and cannot
 * miss one some element does. The cascade is an argument rather than an import, so
 * each workspace's gate hands over its own declarations as well as the kit's.
 * why: CONTRIBUTING.md#the-elevation-gate-and-its-counts */
export function resolutionsOf(raw, { vars, decls, substitute }) {
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
