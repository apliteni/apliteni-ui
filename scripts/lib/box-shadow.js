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

/* Each rule of a stylesheet, and each declaration in it, with the offset of the
 * declaration's PROPERTY NAME in the sheet — not of the character after the
 * previous semicolon, which is where the line the two gates printed used to be
 * counted from. That put every offence on the line the declaration before it
 * ended on, and on the far side of a comment block it was ten lines out.
 * #314 round 2, finding 3. */
function* declarationsIn(css) {
  for (const m of css.matchAll(RULE)) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    // m[0] is `<selector>{<body>}`, so the body starts one character past it.
    let at = m.index + m[1].length + 1;
    for (const decl of m[2].split(';')) {
      const start = at + (decl.length - decl.trimStart().length);
      at += decl.length + 1; // the `;` the split took out
      const i = decl.indexOf(':');
      if (i < 0) continue;
      yield {
        selector,
        name: decl.slice(0, i).trim(),
        value: decl.slice(i + 1).trim(),
        line: css.slice(0, start).split('\n').length,
      };
    }
  }
}

/** Every custom property a stylesheet declares, with the selector it sits under.
 *  The React gate harvests its own workspace with this, because the vanilla
 *  resolver (stories/lib/contrast.js) reads what `src/index.css` imports and
 *  nothing else — a property declared in `react/src/` was invisible to it, and a
 *  cast written behind one resolved to nothing at all. #314 round 2, finding 2.
 *  At-rules are not filtered here: which selectors count is the caller's rule. */
export function customPropertiesIn(css) {
  return [...declarationsIn(decomment(css))].filter((d) => d.name.startsWith('--'));
}

export function boxShadowsIn(css) {
  return [...declarationsIn(decomment(css))]
    .filter((d) => d.name.toLowerCase() === 'box-shadow')
    .map(({ selector, value, line }) => ({ selector, value, line }));
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

/* The treatment's drop layer, as a floating surface writes it. Both gates used
 * to count this spelling and never read it — isCast() would refuse the kit's own
 * shadow on all thirteen floating surfaces — and #314's third review re-pointed
 * `--elev-drop` from a component sheet and stayed green on a tight dark cast. So
 * the layer is resolved like every other, against the two rules below.
 * why: CONTRIBUTING.md#the-elevation-gate-and-its-counts */
export const TREATMENT_DROP = 'var(--elev-drop)';
const DROP = '--elev-drop';

/** Why `value` is not the shape --elev-drop may take, or '' if it is: two broad
 *  faint drops, each offset straight down, blurred wider than it is offset, held
 *  inside the panel's footprint by a negative spread, and inked at an alpha
 *  rather than a colour. why: docs/specification.md#elevation */
export function dropShapeOffence(value) {
  const drops = layersOf(value);
  if (drops.length !== 2) return `${drops.length} layer${drops.length === 1 ? '' : 's'}, where the drop is two`;
  for (const drop of drops) {
    if (/(^|\s)inset(\s|$)/.test(drop)) return `"${drop}" went inset`;
    const { x, y, blur, spread } = geometryOf(drop);
    if (x !== 0) return `"${drop}" is offset sideways, and light falls from above in this kit`;
    if (!(y > 0)) return `"${drop}" has no downward offset, which is a glow rather than a drop`;
    if (!(blur >= 2 * y)) return `"${drop}" blurs ${blur} against an offset of ${y} — a tight drop `
      + 'draws an edge instead of separating a surface from what it covers';
    if (!(spread < 0)) return `"${drop}" has no negative spread, so it reaches past the panel on `
      + 'every side and reads as a halo';
    const ink = inkOf(drop);
    if (!/^color-mix\(\s*in srgb\s*,\s*.+\s+[\d.]+%\s*,\s*transparent\s*\)$/.test(ink))
      return `"${drop}" writes its ink as ${ink || 'nothing at all'}, and a drop's ink is `
        + 'color-mix(in srgb, <ink> N%, transparent) — the alpha is the whole of what makes a '
        + 'drop faint, and this reader will not guess at one';
  }
  return '';
}

/** Everything wrong with the drop layer in one cascade: where --elev-drop is
 *  declared, and every value it can resolve to. `palette` is the files the token
 *  may come from — each gate hands over the ones it reads. The first rule cannot
 *  be left to the resolver: a cascade marks what it did not read from a token
 *  file `root: false`, so the palette wins where a browser would let a later
 *  `:root` declaration win. why: CONTRIBUTING.md#the-elevation-gate-and-its-counts */
export function dropOffences(cascade, palette) {
  const out = [];
  for (const entry of cascade.decls.get(DROP) ?? []) {
    if (palette.includes(entry.file)) continue;
    // (?![\w-]) rather than \b, so a class named `:root-…` is not read as :root.
    if (!entry.selector.split(',').some((sel) => /^:root(?![\w-])/.test(sel.trim()))) continue;
    out.push(`${entry.file}  ${entry.selector} { ${DROP}: ${entry.value} } — the palette is the `
      + 'only place this token is declared at :root, and a component sheet declaring it there '
      + 'changes the one shadow every floating surface in the kit reads');
  }
  for (const value of resolutionsOf(TREATMENT_DROP, cascade)) {
    const why = dropShapeOffence(value);
    if (why) out.push(`${TREATMENT_DROP} resolves to "${value}" — ${why}`);
  }
  return out;
}
