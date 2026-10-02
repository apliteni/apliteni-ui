/* Rule: a select draws ONE chevron, anchored to its right edge, in every theme and
 * every state the sheets give it. why: #511, docs/specification.md#icons-and-glyphs
 *
 * The chevron is three longhands, so any `background` shorthand reaching the same
 * element resets all three, and which rule outranks which decides whether that reads
 * as a lost chevron or a tiled one. #511 was both: `.ui-select:disabled` set it at
 * (0,2,0) — over `.ui-select` (0,1,0), under light's (0,3,0). So this resolves the
 * cascade rather than reading declarations, over the sheets named below.
 *
 * Limits: JSDOM paints nothing — these are the longhands that reach the element, not
 * the pixels; browser evidence is in the PR. Placement, not ink (colour-tokens). No
 * sibling markup is built. What the React sweep misses is stated beside it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

const RULE = /([^{}]+)\{([^{}]*)\}/g;
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const valueOf = (body, prop) =>
  new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]+)`).exec(body)?.[1].trim() ?? null;

// ---- the sheets --------------------------------------------------------------
//
// The kit's, plus react/src/'s own: a `background` shorthand added to a select in
// react/src/ would reproduce #511 with a src/-only sweep still green.
//
// NOT the document a consumer gets. Field/Checkbox/Switch/SearchField import the kit's
// input.css, so tsup re-emits a COPY of it into react/dist, after the kit's own sheets
// — a different order, which this concatenation does not reconstruct. It already costs
// .ui-pager__size-select its compact geometry: #551.

const INDEX = read('src/index.css');
const KIT_SHEETS = [...INDEX.matchAll(/@import\s+"\.\/(styles\/[\w.-]+\.css)"/g)]
  .map((m) => `src/${m[1]}`);
const REACT_SHEETS = readdirSync(path.join(root, 'react/src'))
  .filter((f) => f.endsWith('.css')).sort().map((f) => `react/src/${f}`);
const SHEETS = [...KIT_SHEETS, ...REACT_SHEETS];
const STYLES = SHEETS.map(read);
const SHEET_CSS = STYLES.map(decomment).join('\n');

/** Every selector part in the shipped sheets, with the sheet it came from. */
const PARTS = SHEETS.flatMap((rel, i) =>
  [...decomment(STYLES[i]).matchAll(RULE)]
    .filter(([, selector]) => !selector.trim().startsWith('@'))
    .flatMap(([, selector, body]) =>
      selector.split(',').map((part) => ({ sheet: rel, part: part.trim(), body }))));

// ---- subject discovery ---------------------------------------------------

/** Themes, from the token file that declares them. */
const THEMES = [...new Set([...read('src/tokens/tokens.css')
  .matchAll(/:root\[data-theme="([\w-]+)"\]/g)].map((m) => m[1]))];

/** Selector parts of any stylesheet text, not just the shipped ones. */
const partsOf = (css) => [...decomment(css).matchAll(RULE)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .flatMap(([, selector, body]) => selector.split(',').map((part) => ({ part: part.trim(), body })));

/* Every state a sheet puts on `.ui-select`: the pseudo-classes and `.is-*`
 * classes written after it. The empty suffix is the resting control, which the
 * theme-scoped rule `:root[data-theme="light"] .ui-select` also lands on. */
const statesIn = (parts) => [...new Set(parts
  .flatMap(({ part }) => [...part.matchAll(/\.ui-select((?::[\w-]+|\.[\w-]+)*)/g)])
  .map((m) => m[1]))].sort();
const STATES = statesIn(PARTS);

/* Variants: a class that is not `.ui-select` itself but that some sheet gives a
 * chevron declaration to. The pager resizes the control and repositions the glyph,
 * so it is a second real subject and not a copy of the first. */
const CHEVRON_PROPS = ['background', 'background-image', 'background-repeat', 'background-position'];
const VARIANTS = [...new Set(PARTS
  .filter(({ body }) => CHEVRON_PROPS.some((p) => valueOf(body, p)))
  // The class has to END in `select`, or `.ui-table__selection` joins the sweep.
  .flatMap(({ part }) => [...part.matchAll(/\.([\w-]*select)(?![\w-])/g)].map((m) => m[1])))]
  .filter((cls) => cls !== 'ui-select');

/* The class list a variant really ships with, read out of the factories rather
 * than assumed — `.ui-pager__size-select` alone would resolve a cascade no page
 * has, since the markup pairs it with `ui-select`. */
const FACTORIES = ['src/components/index.js', 'src/components/pagination.js'].map(read).join('\n');
function classListFor(cls) {
  if (cls === null) return 'ui-select';
  const found = [...FACTORIES.matchAll(/class="([^"{}]*)"/g)]
    .map((m) => m[1].trim())
    .find((list) => list.split(/\s+/).includes(cls));
  assert.ok(found, `no factory emits class="…${cls}…" — the variant sweep reads markup that is gone`);
  return found;
}

const FLAVOURS = [null, ...VARIANTS].map((cls) => ({ name: cls ?? 'ui-select', classList: classListFor(cls) }));

/* A rule can also reach a select through an ANCESTOR — `.ui-filter-bar select { … }` —
 * and a bare specimen never matches one. The ancestor chains are read off the same
 * selector parts, so a contextual rule added later is mounted rather than missed.
 * The theme root is dropped: the document element already carries it. */
const COMBINATOR = /\s*[>]\s*|\s+/;
const SELECT_CLASSES = ['ui-select', ...VARIANTS];
const reachesSelect = (compound) =>
  SELECT_CLASSES.some((c) => compound.includes(`.${c}`)) || /^select(?![\w-])/.test(compound);

/* A sibling combinator would need sibling markup, which this gate does not build.
 * None reaches a select today; if one ever does, the sweep says so rather than
 * mounting the wrong shape silently. */
const SIBLING_PARTS = PARTS.map(({ part }) => part)
  .filter((part) => /[+~]/.test(part) && part.split(/\s*[+~>]\s*|\s+/).filter(Boolean).some(reachesSelect));

const contextsIn = (parts) => [...new Set(parts.map(({ part }) => {
  const compounds = part.split(COMBINATOR).filter(Boolean);
  if (!reachesSelect(compounds[compounds.length - 1])) return null;
  return compounds.slice(0, -1).filter((c) => !c.startsWith(':root')).join(' ');
}).filter((c) => c !== null))].sort();
const CONTEXTS = contextsIn(PARTS);

/** An ancestor compound as markup: `span.a.b` → <span class="a b">, `.a` → <div class="a">. */
function wrap(compound, inner) {
  const tag = /^[\w-]+/.exec(compound)?.[0] ?? 'div';
  const classes = [...compound.matchAll(/\.([\w-]+)/g)].map((m) => m[1]).join(' ');
  return `<${tag}${classes ? ` class="${classes}"` : ''}>${inner}</${tag}>`;
}

/* Re-derived from whatever sheets are handed in, so a mutation that adds a
 * contextual or React-side rule is MOUNTED rather than silently skipped. */
function casesFor(css) {
  const parts = partsOf(css);
  const states = statesIn(parts);
  const contexts = contextsIn(parts);
  return THEMES.flatMap((theme) => FLAVOURS.flatMap((f) =>
    states.flatMap((state) => contexts.map((context) => ({ theme, flavour: f, state, context })))));
}
const CASES = casesFor(SHEET_CSS);

// ---- cascade resolution ---------------------------------------------------

/** Custom properties in effect for a theme, in cascade order. */
function tokensFor(theme) {
  const wanted = [':root', `:root[data-theme="${theme}"]`];
  const vars = new Map();
  for (const file of ['src/tokens/brand.generated.css', 'src/tokens/tokens.css', 'src/tokens/accents.css']) {
    for (const [, selector, body] of decomment(read(file)).matchAll(RULE)) {
      if (!selector.split(',').map((s) => s.trim()).some((s) => wanted.includes(s))) continue;
      for (const decl of body.split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        const name = decl.slice(0, i).trim();
        if (name.startsWith('--')) vars.set(name, decl.slice(i + 1).trim());
      }
    }
  }
  return vars;
}

/* JSDOM drops a shorthand it cannot parse, and `background: var(--x)` is one of
 * them — leave the var() in and the very reset this gate exists to catch becomes
 * invisible. Substituting first is what makes the measurement real. */
function substitute(css, vars) {
  let out = css;
  for (let pass = 0; pass < 12 && out.includes('var('); pass++) {
    out = out.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g, (m, name, fallback) =>
      vars.has(name) ? vars.get(name) : (fallback != null ? fallback.trim() : m));
  }
  return out;
}

/* JSDOM can drive no state but `:disabled`, which a real disabled <select> matches
 * natively. Every other discovered pseudo-class becomes an attribute selector of
 * identical (0,1,0) weight, so the specificity this gate measures is preserved.
 * Taken from what the sweep found rather than listed, so a state added to the
 * sheets is driven without being named twice. */
const DRIVEN = [...new Set(STATES.flatMap((s) => [...s.matchAll(/:([\w-]+)/g)].map((m) => m[1])))]
  .filter((p) => p !== 'disabled');
function desugar(css) {
  let out = css;
  for (const s of DRIVEN) out = out.split(`:${s}`).join(`[data-ui-state~="${s}"]`);
  return out;
}

/** One specimen per flavour × state × context, under one theme. */
function specimen({ flavour, state, context }) {
  const pseudo = [...state.matchAll(/:([\w-]+)/g)].map((m) => m[1]);
  const classes = [flavour.classList, ...[...state.matchAll(/\.([\w-]+)/g)].map((m) => m[1])].join(' ');
  const driven = pseudo.filter((p) => DRIVEN.includes(p));
  const attrs = [
    pseudo.includes('disabled') ? ' disabled' : '',
    driven.length ? ` data-ui-state="${driven.join(' ')}"` : '',
  ].join('');
  const el = `<select class="${classes}"${attrs} aria-label="rows"><option>10</option></select>`;
  return context.split(' ').filter(Boolean).reduceRight((inner, c) => wrap(c, inner), el);
}

/** Read the three chevron longhands back for every case, against the given sheets. */
function measure(sheetCss) {
  const all = casesFor(sheetCss);
  const out = [];
  for (const theme of THEMES) {
    const css = substitute(desugar(sheetCss), tokensFor(theme));
    const cases = all.filter((c) => c.theme === theme);
    const dom = new JSDOM(
      `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
      + `<body>${cases.map(specimen).join('')}</body></html>`,
      { pretendToBeVisual: true },
    );
    const nodes = dom.window.document.querySelectorAll('select');
    assert.equal(nodes.length, cases.length, 'a specimen did not mount');
    cases.forEach((c, i) => {
      const cs = dom.window.getComputedStyle(nodes[i]);
      out.push({
        ...c,
        image: cs.backgroundImage,
        repeat: cs.backgroundRepeat,
        position: cs.backgroundPosition,
      });
    });
    dom.window.close();
  }
  return out;
}

/** What "one chevron, anchored right" means, as a list of faults. */
// The only anchoring the kit uses; a chevron placed another way needs this widened.
const ANCHORED = /^right\s+[\d.]+(?:px|rem|em)\s+center$/;
function faultsIn(m) {
  const faults = [];
  const copies = (m.image.match(/url\(/g) ?? []).length;
  if (copies !== 1) faults.push(`background-image draws ${copies} image(s): ${m.image}`);
  if (m.repeat !== 'no-repeat') faults.push(`background-repeat is \`${m.repeat}\` — the chevron tiles`);
  if (!ANCHORED.test(m.position)) faults.push(`background-position is \`${m.position}\`, not anchored to the right edge`);
  return faults;
}

const describe = (m) =>
  `${m.theme} · ${m.context ? `${m.context} ` : ''}${m.flavour.name}${m.state || ' (resting)'}`;

// ---- the gate ------------------------------------------------------------

test('the sweep finds the subjects it is written for', () => {
  assert.ok(THEMES.length >= 2, `tokens.css declares ${THEMES.length} theme(s); #511 was a defect only one of them showed`);
  assert.ok(STATES.includes(''), 'no sheet styles a resting `.ui-select` — the state sweep is reading nothing');
  assert.ok(STATES.includes(':disabled'), 'no `.ui-select:disabled` rule found; that is the state #511 broke');
  assert.ok(VARIANTS.length >= 1, 'no resized select variant found — the variant sweep is reading nothing');
  assert.ok(KIT_SHEETS.length > 10, `read ${KIT_SHEETS.length} kit sheet(s) out of src/index.css`);
  assert.ok(REACT_SHEETS.length > 0, 'no react/src/*.css found — the React half of the package is unswept');
  assert.ok(CONTEXTS.includes(''), 'nothing styles a select without an ancestor — the context sweep is reading nothing');
  assert.deepStrictEqual(SIBLING_PARTS, [],
    'a sibling combinator now reaches a select, and this gate builds no sibling markup — extend specimen() before trusting it');
  assert.equal(CASES.length, THEMES.length * FLAVOURS.length * STATES.length * CONTEXTS.length);
});

test('every select draws one chevron, anchored right, in every theme and state', () => {
  const measured = measure(SHEET_CSS);
  assert.equal(measured.length, CASES.length, 'a case went unmeasured');

  const broken = measured.flatMap((m) => faultsIn(m).map((f) => `${describe(m)}: ${f}`));
  assert.deepStrictEqual(broken, [], `a select's chevron is not a single glyph on its right edge:\n  ${broken.join('\n  ')}`);
});

/* A gate that cannot fail proves nothing, and this one reads a computed value
 * rather than a string — so each mutation below is a real way to break the
 * chevron, re-resolved through the same cascade. The first is #511 itself. */
test('the gate rejects every way of resetting the chevron', () => {
  const MUTATIONS = [
    {
      why: '#511: the disabled paint written as the `background` shorthand again',
      apply: (css) => css.replace(
        /background-color:(\s*var\(--disabled-surface\))/,
        'background:$1',
      ),
    },
    {
      why: 'the chevron left to tile',
      apply: (css) => css.replace(/background-repeat:\s*no-repeat;/, 'background-repeat: repeat;'),
    },
    {
      why: 'the chevron left at the origin',
      apply: (css) => css.replace(/background-position:\s*right 15px center;/, 'background-position: 0% 0%;'),
    },
    {
      // The React half of the package: react/dist/index.css loads ON TOP of the kit's.
      why: 'a `background` shorthand added to a select from the React sheets',
      apply: (css) => `${css}\n.ui-select:disabled { background: #123456; }\n`,
    },
    {
      // Reaches the select through an ancestor, which a bare specimen never matches.
      why: 'a contextual rule repainting a select inside a container',
      apply: (css) => `${css}\n.ui-filter-bar .ui-select { background: #123456; }\n`,
    },
  ];

  for (const { why, apply } of MUTATIONS) {
    const mutated = apply(SHEET_CSS);
    assert.notEqual(mutated, SHEET_CSS, `the mutation "${why}" no longer edits anything — rewrite it against the current sheet`);
    const broken = measure(mutated).filter((m) => faultsIn(m).length > 0);
    assert.ok(broken.length > 0, `the gate passed a sheet mutated to break the chevron: ${why}`);
  }
});

/* #511 showed up in one theme as a tiled chevron and in the other as no chevron at
 * all, which is why a single-theme check would have shipped it. Pinned separately
 * so the reason the sweep covers both themes cannot be dropped as redundant. */
test('the #511 mutation breaks the disabled select in both themes, differently', () => {
  const mutated = SHEET_CSS.replace(/background-color:(\s*var\(--disabled-surface\))/, 'background:$1');
  assert.notEqual(mutated, SHEET_CSS, 'the #511 mutation no longer edits anything');

  const disabled = measure(mutated).filter((m) => m.state === ':disabled' && m.flavour.name === 'ui-select');
  assert.equal(disabled.length, THEMES.length, 'the disabled select was not measured in every theme');

  for (const m of disabled) {
    assert.ok(faultsIn(m).length > 0, `${describe(m)}: the shorthand reset went unnoticed`);
  }
  const tiled = disabled.filter((m) => m.repeat === 'repeat' && (m.image.match(/url\(/g) ?? []).length === 1);
  const lost = disabled.filter((m) => m.image === 'none');
  assert.ok(tiled.length > 0, 'no theme tiled the chevron — the shape of #511 in light');
  assert.ok(lost.length > 0, 'no theme lost the chevron — the shape of #511 in dark');
});
