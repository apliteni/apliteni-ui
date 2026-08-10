/* Rule: an icon-sizing rule in the React workspace is measured too.
 *
 * react/.storybook/preview.ts imports `@apliteni/apliteni-ui/css`, and
 * react/kit-alias.ts points that specifier at src/index.css — the very sheets the
 * other two gates compose. So every React story renders against the inline-icon
 * reset in src/styles/base.css, and react/src/primitives/Icon.tsx injects the
 * kit's own glyph markup, so the specificity contest that #148 was about happens
 * here on the same terms. Nothing measured it. A rule like
 * `.rx-btn svg { width: 16px }` in react/src/DataTable.css either won or lost and
 * neither gate could say which, which is the state the kit itself was in when 21
 * of its 24 sizing rules were not applying.
 *
 * A GATE OF ITS OWN, not a fourth surface in scripts/icon-size-surfaces.test.js.
 * That file holds one count across every surface it sweeps, and a shared count
 * cancels: a React rule dropping out of coverage and a site rule arriving in the
 * same commit leave the number where it was, and the tripwire says nothing. The
 * two workspaces also fail for different people — a broken React sweep is a
 * problem for consumers of the ./react entry point, and it should say so in its
 * own red. The machinery is imported from scripts/lib/icon-cascade.js rather than
 * copied, so the three gates cannot drift into measuring different things.
 *
 * IT DISCOVERS, IT DOES NOT ENUMERATE. Every *.css under react/src, at any depth,
 * so react/src/primitives/ joins the sweep the day it grows a stylesheet.
 *
 * ONE CASCADE, NOT ONE DOCUMENT PER FILE. Every one of those sheets is imported by
 * a component, tsup concatenates them into a single react/dist/index.css, and the
 * workspace's Storybook loads them together — so they genuinely compete, and
 * measuring each in a document of its own would let two rules that override each
 * other both report that they decide the icon. They go into one document as
 * separate <style> elements, in path order after the kit's, which keeps each
 * rule's file name on it. The surfaces gate groups per file for the opposite
 * reason: two unrelated pages are two cascades, and a class name they happen to
 * share must not let one decide the other's contest.
 *
 * SOURCE, NOT BUILT. The sheets are read out of react/src rather than out of
 * react/dist/index.css, which is the sheet the ./react/css export actually ships.
 * react/dist is gitignored build output, and this machinery already refuses to
 * walk a directory called dist wherever it finds one — see SKIP_DIRS, and the
 * local-green/CI-red defect that argument comes from. Reading it here would bring
 * that defect back: a developer with an older build still on disk would have this
 * gate measure CSS the working tree no longer contains. It is not reliably there
 * to read, either. `npm ci` builds it through `prepare`, but
 * `npm ci --ignore-scripts` does not, which is how .github/workflows/release.yml
 * installs — and a gate that skipped when the file was absent would report a clean
 * zero for a sweep that read nothing.
 *
 * The cost is that this measures what is written rather than what tsup emits.
 * esbuild reprints the CSS on the way through — `rgba(0,0,0,.55)` comes out
 * `rgba(0, 0, 0, .55)`, one-liners expand — but preserves the rules and their
 * values, so the contest is the same one. If the build ever starts lowering
 * syntax, this gate and the sheet that ships through the ./react/css export could
 * disagree — look here first.
 *
 * THE COUNT STARTS AT ZERO, which is the dangerous part. No React stylesheet
 * carries an svg rule today, so `collected 0, expected 0` is what a healthy gate
 * says and also what a gate that read nothing at all says. Six assertions stand
 * between those two: the sweep found stylesheets, the kit's sheets are in the
 * document, its reset still reaches a bare icon there, preview.ts still imports
 * the kit's CSS at all, the class scanner still finds a class the kit puts on an
 * svg — returning nothing would take every class-on-svg rule out of coverage and
 * leave the count at the same healthy-looking zero — and no sizing declaration in
 * those files is one the parser threw away or one this gate never opened. Take any
 * of them out and this file goes back to being ornamental.
 *
 * WHAT THIS WILL NOT CATCH — the same weak claims as the two gates it joins, for
 * the same reasons, plus three of its own:
 *
 *  - CSS ANYWHERE UNDER react/ EXCEPT react/src. A stylesheet added beside
 *    react/.storybook/preview.ts would render in the workspace's Storybook and be
 *    outside this sweep. react/src is where the components put their CSS and what
 *    the package ships; widen the glob if that stops being true.
 *  - A CLASS COMPUTED AT RENDER TIME. The scanner reads `className="ic"` out of
 *    the source, so `className={cx(…)}` puts a class on an svg that no rule here
 *    recognises as an icon class. Same hole as the kit's `class="${…}"`, and the
 *    same consequence: rules targeting that class leave coverage in silence.
 *  - FILE ORDER. tsup emits the sheets in the order react/src/index.ts reaches
 *    the components that import them, which today puts Modal.css before
 *    DataTable.css; this mounts them in path order, which is the other way round.
 *    That decides nothing unless two rules in different files have equal
 *    specificity and set the same dimension on the same icon, in which case the
 *    two orders can disagree about which one wins.
 *  - a reset scoped to an ancestor the subject's own selector does not name;
 *  - the VALUE (the expectation is read from the declaration under test, so this
 *    asserts "the declared value is what the cascade resolves", never "the icon
 *    is 14px");
 *  - layout, and markup that no component emits;
 *  - an icon sized by a clamp. The min-/max- forms never enter `width`'s cascade,
 *    so there is no contest here to measure and no layout in jsdom to apply one
 *    in. Nothing in the React workspace clamps an icon today, and the test named
 *    `no rule in the React workspace sizes an icon with a clamp` is what keeps
 *    that true rather than merely current. The argument is in CLAMP_REFUSAL.
 *  - an icon reset by `all`. react/src/DataTable.css already writes `all: unset`,
 *    on `.rx-sort`, which is a button and not an icon. On an icon it would take
 *    `width` back to `auto` in a browser and so decide the icon by unsaying the
 *    reset; jsdom expands the shorthand into nothing, so such a rule would be
 *    neither a subject nor a refusal here.
 *  - an icon sized around `width` altogether — `zoom`, `transform: scale()`,
 *    `aspect-ratio`, `contain-intrinsic-size`. None of them enters `width`'s
 *    cascade. `aspect-ratio` is the sharp one, because it derives the height from
 *    a rule this gate reads as setting a width and nothing else.
 *
 * A rule written with `inline-size` or `block-size` IS measured, on the same terms
 * as its physical twin and named the way the file spells it; the fold and the
 * writing-mode precondition it rests on are in the header of
 * src/styles/icon-size.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import {
  CLAMP_PROPS,
  CLAMP_REFUSAL,
  DIMS,
  SIZING_PROPS,
  clampsOn,
  declRe,
  foldLogicalDims,
  isSvgSubject,
  kitSheetNames,
  kitStyleHtml,
  mount,
  resolve,
  rulesOf,
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

/* Every stylesheet the React components import, discovered rather than listed.
 * Path order, which is stable across machines in a way readdir order is not. */
const REACT_SHEETS = walk(reactSrc).filter((p) => p.endsWith('.css')).sort().map(rel);

const SHEETS = kitSheetNames(src);
const KIT = kitStyleHtml(src, SHEETS);

const OWN = REACT_SHEETS
  .map((name) => `<style data-sheet="${name}">${readFileSync(path.join(root, name), 'utf8')}</style>`)
  .join('\n');

const dom = new JSDOM(`<!doctype html><html><head>${KIT}${OWN}</head><body></body></html>`);
const { document, getComputedStyle } = dom.window;

assert.equal(document.styleSheets.length, SHEETS.length + REACT_SHEETS.length,
  'jsdom dropped a stylesheet composing the React workspace — every rule in it would silently '
  + 'leave coverage.');

/** That workspace's own sheets, after the kit's. */
const ownSheets = () => REACT_SHEETS.map((_n, j) => document.styleSheets[SHEETS.length + j]);

/* What each React sheet says, with comments taken out — a commented-out
 * `width: 20px` is not a declaration, and leaving it in would make the guard
 * below fire on a file that is perfectly fine. */
const RAW = REACT_SHEETS.map((name) => readFileSync(path.join(root, name), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' '));

/* The kit's sheets are folded here as well as in src/styles/icon-size.test.js,
 * because this document holds its own copy of them: a reset written with a
 * logical property and left unfolded would sit out the cascade entirely, and
 * every React rule would then win a contest nobody was holding. */
[...document.styleSheets].forEach((sheet, k) => {
  foldLogicalDims(sheet, k < SHEETS.length ? SHEETS[k] : REACT_SHEETS[k - SHEETS.length]);
});

// The classes that end up on an <svg>, derived from the source the way the other
// gates derive them. The kit's components are read because React renders the
// kit's glyphs; the React source is read because a component that puts a class
// straight onto an svg writes `className`, and a class nothing recognises takes
// every rule targeting it out of coverage.
const SVG_CLASSES = svgClassSet([src, reactSrc], ['.js', '.ts', '.tsx']);

const subjects = [];
REACT_SHEETS.forEach((from, j) => {
  for (const [rule] of rulesOf(ownSheets()[j], from, SVG_CLASSES)) {
    for (const raw of rule.selectorText.split(',')) {
      const sel = raw.trim().replace(/\s+/g, ' ');
      if (!isSvgSubject(sel, SVG_CLASSES)) continue;
      for (const dim of DIMS) {
        const want = rule.style.getPropertyValue(dim).trim();
        if (want) subjects.push({ sel, dim, want, from, rule, as: writtenAs(rule, dim) });
      }
    }
  }
});

test('the sweep still finds the React workspace stylesheets', () => {
  assert.ok(REACT_SHEETS.length > 0,
    'found no *.css under react/src — the sweep is broken, not the workspace. Every assertion '
    + 'below would pass on an empty sweep, including the count.');
});

test('the React workspace still renders against the kit stylesheets', () => {
  /* The premise of this whole file. If that import goes, React stories stop
   * rendering against the reset in src/styles/base.css and there is no contest
   * here to measure — at which point this gate should be rewritten or deleted,
   * not left passing over a workspace it no longer describes. */
  const preview = readFileSync(previewPath, 'utf8');
  assert.match(preview, /import\s+['"]@apliteni\/apliteni-ui\/css['"]/,
    'react/.storybook/preview.ts no longer imports the kit CSS, so the React workspace no longer '
    + 'renders against the icon reset this gate measures every React rule against. Either restore '
    + 'the import or retire this gate — do not leave it green over a contest nobody is in.');
});

test('the kit reset reaches an icon in this document', () => {
  /* Proof that the kit's sheets are not merely counted but applying. A document
   * built from empty or unreadable sheets would give every React rule a walkover
   * and report it as a win. Asserted as a ratio of the font-size, so it pins the
   * reset rather than the root font-size. */
  const box = document.createElement('div');
  box.style.fontSize = '20px';
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  box.appendChild(el);
  document.body.appendChild(box);
  const got = getComputedStyle(el).width;
  box.remove();
  assert.equal(got, '22px',
    'the kit reset does not size a bare icon in this document, so every React rule measured here '
    + 'would win by default. The kit sheets are mounted but not applying.');
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
   * which moves the subject count — and a gate whose count is 0 has nothing else
   * to notice with.
   *
   * jsdom keeps the declarations it understands and discards the rest without a
   * word: `width: fit-content(20%)` leaves the rule it was written in with no
   * width at all, so the rule reads as if it sized nothing. Every sizing and
   * clamp declaration in the raw text is therefore re-parsed on its own and asked
   * whether it survived.
   *
   * And an `@import` is a sheet this gate never opens. It reads the files under
   * react/src one by one; esbuild inlines what they import, so an imported sheet
   * that lives anywhere else ships to consumers with its rules unmeasured. */
  const droppedDecls = [];
  const unfollowed = [];
  REACT_SHEETS.forEach((from, j) => {
    for (const m of RAW[j].matchAll(/@import\s+([^;]*)/g)) {
      unfollowed.push(`${from}: @import ${m[1].trim()}`);
    }
    for (const props of [SIZING_PROPS, CLAMP_PROPS]) {
      for (const m of RAW[j].matchAll(declRe(props))) {
        const [, prop, value] = m;
        const probe = new JSDOM(`<style>a{${prop}:${value}}</style>`)
          .window.document.styleSheets[0].cssRules[0];
        if (!probe?.style.getPropertyValue(prop)) {
          droppedDecls.push(`${from}: ${prop}: ${value.trim()}`);
        }
      }
    }
  });
  assert.deepEqual(unfollowed, [],
    'a React stylesheet imports another sheet, and this gate does not follow it — it composes the '
    + 'files it finds under react/src and nothing else, so the imported rules are measured only if '
    + 'that sheet is itself under react/src. Import it from the component instead, so it is a file '
    + 'this sweep finds, or teach this gate to follow @import.');
  assert.deepEqual(droppedDecls, [],
    'a React stylesheet sizes something with a value jsdom cannot parse, so the declaration is '
    + 'gone from the CSSOM this gate measures and the rule reads as if it sized nothing. If it '
    + 'lands on an icon it is unmeasured; write the size in a form jsdom parses, or teach this '
    + 'gate to measure it somewhere layout exists.');
});

test('every icon sizing rule in the React workspace is gated', () => {
  assert.equal(subjects.length, EXPECTED_SUBJECTS,
    `collected ${subjects.length} icon sizing declarations across ${REACT_SHEETS.length} `
    + `stylesheets in react/src (${REACT_SHEETS.join(', ')}), expected ${EXPECTED_SUBJECTS}:\n`
    + subjects.map((s) => `  ${s.from}: ${s.sel} { ${s.as}: ${s.want} }`).join('\n')
    + '\nIf you added a rule, raise EXPECTED_SUBJECTS. If you removed one, lower it and say why in '
    + 'the commit — a rule that leaves coverage is otherwise indistinguishable from a pass.');
});

test('no rule in the React workspace sizes an icon with a clamp', () => {
  // Only the workspace's own sheets. The kit's are src/styles/icon-size.test.js's
  // to sweep, and this document holds a copy of them.
  const clamped = REACT_SHEETS.flatMap((from, j) => clampsOn(ownSheets()[j], from, SVG_CLASSES));
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
