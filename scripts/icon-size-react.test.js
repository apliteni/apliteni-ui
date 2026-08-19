/* Rule: an icon-sizing rule in the React workspace is measured too.
 *
 * why: CONTRIBUTING.md#one-gate-per-workspace-over-one-shared-implementation
 * why: docs/specification.md#icons-and-glyphs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import {
  BLIND_REFUSAL,
  CLAMPED_BLIND_REFUSAL,
  CLAMP_REFUSAL,
  DIMS,
  DROPPED_REFUSAL,
  IMPORT_REFUSAL,
  blindSpots,
  clampsOn,
  droppedDecls,
  foldLogicalDims,
  importsIn,
  isSvgSubject,
  kitSheetNames,
  kitStyleHtml,
  mount,
  resolve,
  rulesOf,
  selectorParts,
  stripComments,
  styleBlocksOf,
  styleImportsIn,
  svgClassSet,
  walk,
  without,
  writtenAs,
} from './lib/icon-cascade.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const reactSrc = path.join(root, 'react', 'src');
const previewPath = path.join(root, 'react', '.storybook', 'preview.ts');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');

// The same tripwire the other two gates carry, and the same deliberate
// inconvenience: a rule that quietly leaves coverage looks exactly like a rule
// that passes, so this is the real count with no slack in it. It is 0 because no
// React stylesheet sizes an icon yet — which is what makes this the moment to
// gate it rather than the commit after the first one lands. Raise it when you add
// a rule; lower it in the same commit as the removal, and say why there.
const EXPECTED_SUBJECTS = 0;

/* Every directory under react/src the walk refused to enter. SKIP_DIRS prunes by
 * NAME wherever the name turns up, which is what build output needs and what
 * hand-written source does not: a react/src/public/ holding a stylesheet is
 * ordinary React, and pruning it drops every rule in it out of the sweep without
 * moving a count that sits at zero either way. */
const SKIPPED_DIRS = [];
const REACT_FILES = walk(reactSrc, [], SKIPPED_DIRS).sort();
const isTest = (p) => /\.test\.[cm]?[jt]sx?$/.test(p);
const isSource = (p) => /\.[cm]?[jt]sx?$/.test(p) && !isTest(p);

/* The kit's stylesheets, in the order src/index.css imports them. Read here
 * rather than beside the document below because the sweep needs to know what is
 * already the kit's before it decides what is its own. */
const SHEETS = kitSheetNames(src);
const KIT_SHEETS = new Set(SHEETS.map((name) => `src/${name}`));

/* The *.css the walk finds under react/src. Path order, which is stable across
 * machines in a way readdir order is not. */
const WALKED_SHEETS = REACT_FILES.filter((p) => p.endsWith('.css')).map(rel);

/* Every stylesheet a React source imports — the `import './DataTable.css'` at
 * the top of DataTable.tsx. That is the list the workspace actually loads, and
 * it is the only thing that can tell the sweep above it read less than the
 * workspace ships: rename DataTable.css to DataTable.pcss and the glob halves in
 * silence, because the count that would notice is 0 before and after. */
const IMPORTED_SHEETS = [...new Set(REACT_FILES.filter(isSource)
  .flatMap((p) => styleImportsIn(readFileSync(p, 'utf8'))
    .map((spec) => rel(path.resolve(path.dirname(p), spec)))))].sort();

/* An imported sheet the walk cannot reach, because it is not under react/src at
 * all — it still reaches a React consumer, which is the only question this gate
 * asks. The split is DERIVED: a sheet src/index.css already imports is mounted
 * as part of KIT and swept by the kit gate, so adopting it into OWN would count
 * every rule twice; anything else has no other gate over it.
 *
 * Only `.css`, and only what exists. A `.pcss` or a `./x.css?inline` is a sheet
 * this gate cannot read, so it falls through to the coverage test below. */
const ADOPTED = IMPORTED_SHEETS.filter((p) => (
  !WALKED_SHEETS.includes(p)
  && !KIT_SHEETS.has(p)
  && p.endsWith('.css')
  && existsSync(path.join(root, p))
));

/** Every stylesheet this sweep reads, discovered rather than listed. */
const REACT_SHEETS = [...WALKED_SHEETS, ...ADOPTED].sort();

/* And the CSS a component writes in a <style> block of its own, which is the
 * idiom this repo's vanilla stories already use and which react/src is free to
 * use too. Extracted by the same function scripts/icon-size-surfaces.test.js
 * extracts a story's blocks with, so the two cannot drift — including what it
 * does with an interpolation it cannot resolve, which is to leave a marker the
 * guards below refuse rather than an empty block that reads as no CSS at all. */
const STYLE_BLOCKS = REACT_FILES.filter(isSource)
  .flatMap((p) => styleBlocksOf(readFileSync(p, 'utf8'))
    .map((css, j) => ({ from: `${rel(p)} block ${j}`, css })));

/** Every piece of CSS this gate measures, each knowing where it came from. */
const OWN = [
  ...REACT_SHEETS.map((name) => ({ from: name, css: readFileSync(path.join(root, name), 'utf8') })),
  ...STYLE_BLOCKS,
];

const KIT = kitStyleHtml(src, SHEETS);

const OWN_HTML = OWN
  .map(({ from, css }) => `<style data-sheet="${from}">${css}</style>`)
  .join('\n');

const dom = new JSDOM(`<!doctype html><html><head>${KIT}${OWN_HTML}</head><body></body></html>`);
const { document, getComputedStyle } = dom.window;

assert.equal(document.styleSheets.length, SHEETS.length + OWN.length,
  'jsdom dropped a stylesheet composing the React workspace — every rule in it would silently '
  + 'leave coverage.');

/** That workspace's own sheets, after the kit's. */
const ownSheets = () => OWN.map((_o, j) => document.styleSheets[SHEETS.length + j]);

/* What each of them says, with comments taken out — a commented-out
 * `width: 20px` is not a declaration, and leaving it in would make the guard
 * below fire on a file that is perfectly fine. */
const RAW = OWN.map(({ css }) => stripComments(css));

/* The kit's sheets are folded here as well as in src/styles/icon-size.test.js,
 * because this document holds its own copy of them: a reset written with a
 * logical property and left unfolded would sit out the cascade entirely, and
 * every React rule would then win a contest nobody was holding. */
[...document.styleSheets].forEach((sheet, k) => {
  foldLogicalDims(sheet, k < SHEETS.length ? SHEETS[k] : OWN[k - SHEETS.length].from);
});

// The classes that end up on an <svg>, derived from the source the way the other
// gates derive them. The kit's components are read because React renders the
// kit's glyphs; the React source is read because a component that puts a class
// straight onto an svg writes `className`, and a class nothing recognises takes
// every rule targeting it out of coverage.
const SVG_CLASSES = svgClassSet([src, reactSrc], ['.js', '.ts', '.tsx']);

const subjects = [];
OWN.forEach(({ from }, j) => {
  for (const [rule] of rulesOf(ownSheets()[j], from, SVG_CLASSES)) {
    for (const raw of selectorParts(rule.selectorText)) {
      const sel = raw.replace(/\s+/g, ' ');
      if (!isSvgSubject(sel, SVG_CLASSES)) continue;
      for (const dim of DIMS) {
        const want = rule.style.getPropertyValue(dim).trim();
        if (want) subjects.push({ sel, dim, want, from, rule, as: writtenAs(rule, dim) });
      }
    }
  }
});

test('the sweep still finds the React workspace stylesheets', () => {
  /* On the WALK, not on the union: a sweep that also adopts sheets from outside
   * react/src can come back non-empty with the walk returning nothing at all,
   * and every assertion below would then pass over a workspace this gate never
   * opened. */
  assert.ok(WALKED_SHEETS.length > 0,
    'found no *.css under react/src — the sweep is broken, not the workspace. Every assertion '
    + 'below would pass on an empty sweep, including the count.');
});

test('the sweep enters every directory under react/src', () => {
  assert.deepEqual(SKIPPED_DIRS.map(rel), [],
    'a directory under react/src carries a name SKIP_DIRS prunes — node_modules, dist, public or '
    + 'storybook-static. That list is for build output found anywhere, and it cannot tell build '
    + 'output from a react/src/public/ somebody wrote by hand, so every stylesheet under it left '
    + 'this sweep and the count stayed at 0. Rename the directory, or narrow the pruning to the '
    + 'paths where build output actually lands.');
});

test('every stylesheet a React component imports is in coverage', () => {
  /* A sheet the workspace loads is measured either here or by
   * src/styles/icon-size.test.js, and this asks which. The sweep follows an
   * import wherever it points, so living outside react/src is no longer a way
   * out — what is left is a sheet this gate cannot read at all: another
   * extension (`./DataTable.pcss`), a bundler query (`./x.css?inline`), or a
   * specifier pointing at nothing. Each is loaded by the workspace, shipped
   * through react/dist/index.css and measured by nobody, and the subject count
   * cannot say so, because it is 0 whether the sheet is read or not. */
  const uncovered = IMPORTED_SHEETS.filter((p) => !REACT_SHEETS.includes(p) && !KIT_SHEETS.has(p));
  assert.deepEqual(uncovered, [],
    'a React source imports a stylesheet nothing measures. Name it .css and point it at a file '
    + 'that exists, or widen the sweep to whatever the workspace now writes.');
});

test('the React workspace still renders against the kit stylesheets', () => {
  /* The premise of this whole file. If that import goes, React stories stop
   * rendering against the reset in src/styles/base.css and there is no contest
   * here to measure — at which point this gate should be rewritten or deleted,
   * not left passing over a workspace it no longer describes. */
  /* Read the way styleImportsIn() reads a specifier: comments out first, and the
   * match anchored to the start of a line — unanchored, a commented-out import
   * still matches, which is the ordinary way somebody switches one off. The strip
   * handles the block spelling, including one wrapped around whole lines. */
  const preview = stripComments(readFileSync(previewPath, 'utf8'));
  assert.match(preview, /^\s*import\s+['"]@apliteni\/apliteni-ui\/css['"]/m,
    'react/.storybook/preview.ts no longer imports the kit CSS, so the React workspace no longer '
    + 'renders against the icon reset this gate measures every React rule against. Either restore '
    + 'the import or retire this gate — do not leave it green over a contest nobody is in.');
});

test('the kit reset reaches an icon in this document', () => {
  /* Proof that the kit's sheets are not merely counted but applying. A document
   * built from empty or unreadable sheets would give every React rule a walkover
   * and report it as a win. Asserted as a ratio of the font-size, so it pins the
   * reset rather than the root font-size.
   *
   * Both axes, since the reset declares both and this is the only thing here
   * watching it. Reading `width` alone, `height: 1.1em` could be deleted from
   * base.css with this gate and the other two green. */
  const box = document.createElement('div');
  box.style.fontSize = '20px';
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  box.appendChild(el);
  document.body.appendChild(box);
  const style = getComputedStyle(el);
  const got = { width: style.width, height: style.height };
  box.remove();
  assert.deepEqual(got, { width: '22px', height: '22px' },
    'the kit reset does not size a bare icon on both axes in this document, so a React rule '
    + 'measured here could win by default. Either the kit sheets are mounted and not applying, or '
    + 'the reset has lost one of the two declarations it makes.');
});

test('the sweep still recognises a class put directly on an svg', () => {
  // If this derivation returns nothing, every class-on-svg rule leaves coverage
  // in silence — which is how .ui-fbck was missed in the kit the first time.
  assert.ok(SVG_CLASSES.has('ui-fbck'),
    'the scanner no longer finds `ui-fbck`, the class src/components/feedback.js writes onto its '
    + `check svg; it found: ${[...SVG_CLASSES].join(', ') || '(nothing)'}`);
});

test('no sizing declaration in the React CSS is one this gate cannot read', () => {
  /* Two ways a rule that sizes an icon can be here and be invisible, neither of
   * which moves the subject count: a declaration jsdom drops, and an `@import`
   * this gate never opens while esbuild inlines it for consumers.
   *
   * why: CONTRIBUTING.md#a-declaration-jsdom-drops-leaves-no-subject-to-count */
  const dropped = [];
  const unfollowed = [];
  const blind = [];
  const clampedBlind = [];
  OWN.forEach(({ from }, j) => {
    unfollowed.push(...importsIn(RAW[j]).map((spec) => `${from}: @import ${spec}`));
    const found = blindSpots(from, OWN[j].css, ownSheets()[j]);
    blind.push(...found.blind);
    clampedBlind.push(...found.clampedBlind);
    dropped.push(...droppedDecls(from, OWN[j].css, SVG_CLASSES));
  });
  assert.deepEqual(unfollowed, [], IMPORT_REFUSAL);
  assert.deepEqual(dropped, [], DROPPED_REFUSAL);
  assert.deepEqual(blind, [], BLIND_REFUSAL);
  assert.deepEqual(clampedBlind, [], CLAMPED_BLIND_REFUSAL);
});

test('every icon sizing rule in the React workspace is gated', () => {
  assert.equal(subjects.length, EXPECTED_SUBJECTS,
    `collected ${subjects.length} icon sizing declarations across ${OWN.length} pieces of CSS `
    + `under react/src (${OWN.map((o) => o.from).join(', ')}), expected ${EXPECTED_SUBJECTS}:\n`
    + subjects.map((s) => `  ${s.from}: ${s.sel} { ${s.as}: ${s.want} }`).join('\n')
    + '\nIf you added a rule, raise EXPECTED_SUBJECTS. If you removed one, lower it and say why in '
    + 'the commit — a rule that leaves coverage is otherwise indistinguishable from a pass.');
});

test('no rule in the React workspace sizes an icon with a clamp', () => {
  // Only the workspace's own sheets. The kit's are src/styles/icon-size.test.js's
  // to sweep, and this document holds a copy of them.
  const clamped = OWN.flatMap(({ from }, j) => clampsOn(ownSheets()[j], from, SVG_CLASSES));
  assert.deepEqual(clamped, [], CLAMP_REFUSAL);
});

for (const { sel, dim, want, from, rule, as } of subjects) {
  test(`${from}: ${sel} { ${as}: ${want} } decides the icon's ${dim}`, () => {
    const { el, top } = mount(document, sel, SVG_CLASSES);
    try {
      assert.ok(el.matches(sel),
        `mounted an element that does not match "${sel}" — the measurement would be of the wrong thing`);
      /* Forced so the two candidates cannot agree by arithmetic: the reset is
       * 1.1em, and on an element whose font-size makes 1.1em equal the declared
       * px the comparison would pass whichever rule won. At 100px the reset reads
       * 110px and nothing else does. It changes no selector, so it changes nothing
       * about which rules match; `resolve` clones this element, inline style
       * included, so the expectation is computed on the same basis. */
      el.style.fontSize = '100px';
      const got = getComputedStyle(el).getPropertyValue(dim);
      const expected = resolve(getComputedStyle, el, dim, want);
      assert.equal(got, expected,
        `${from} asks for ${as}: ${want} (resolves to ${expected}) and the cascade gives ${got}. `
        + 'Something upstream out-specifies it — see the header of src/styles/icon-size.test.js.');
      // And prove that comparison could have failed — see without().
      const gone = without(getComputedStyle, el, rule, dim);
      assert.notEqual(gone, expected,
        `taking "${as}: ${want}" out of ${from} changes nothing — the element still computes `
        + `${gone}. So the assertion above passes whether this rule wins or loses, and gates `
        + 'nothing. Either the rule is redundant and should go, or this subject needs a basis '
        + 'that pulls it apart from whatever else is setting the same value.');
    } finally {
      top.remove();
    }
  });
}
