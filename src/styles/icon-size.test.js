/* Rule: a component rule that sizes an icon is the rule that decides its size.
 *
 * The kit sizes icons in two places and they compete. base.css carries a reset
 * for bare icon() calls, and two dozen component rules size the icon in their
 * own slot. For as long as both have existed the reset won every one of those
 * contests without anybody noticing, because the losing rule is still right
 * there in the file: `.ui-nav__ic svg { width: 17px }` reads as a decision,
 * rendered as 1.1em, and nothing said which.
 *
 * `svg:not([width]):not([height])` is (0,2,1) — :not() carries the specificity
 * of its argument, and two attribute selectors count as two class-level units.
 * A component rule like `.ui-btn svg` is (0,1,1). Source order never entered
 * into it, so the comment promising component rules "come later and win the
 * tie" described a tie that was never tied.
 *
 * So this gate does not read the stylesheets and reason about them. It mounts an
 * element matching each rule's selector against the kit's real stylesheets, in
 * the order src/index.css imports them, and reads getComputedStyle back.
 *
 * WHAT COUNTS AS A SUBJECT. Every rule that sets width or height on an element
 * that is an `<svg>`, which is two shapes and the second is easy to miss:
 *
 *   .ui-btn svg          — the selector ends in `svg`
 *   .ui-fbck             — a CLASS the kit puts ON an svg (the CHECK markup in
 *                          src/components/feedback.js)
 *
 * The second shape is not cosmetic. `.ui-fbck` is (0,1,0), it lost to the old
 * (0,2,1) reset exactly like the others, and it is the largest icon in the kit:
 * an 88px animated check that rendered at 15.94px. An earlier version of this
 * file collected only selectors ending in `svg` and was blind to it. The class
 * list is derived from the components rather than typed here — see svgClasses().
 *
 * PROVENANCE, NOT SELECTOR SHAPE. Each stylesheet goes in as its own <style>
 * element, so every rule knows which file it came from — which is how the reset
 * is looked for in base.css and nowhere else. Inside that file it is found by
 * what makes it the reset: it is the one rule that sizes an icon with no class
 * on it and nothing around it, and no component rule can do that. Everything
 * else base.css holds is a subject like any other, so `.ui-nav__ic svg` written
 * there is measured instead of swallowed — which it was, for as long as this
 * gate skipped the file by name. Selector shape decides none of it. "Has no
 * class in it" — the obvious shortcut — breaks the moment anyone writes a nested
 * rule, because jsdom serialises `.x { svg { … } }` as `& svg`, which has no
 * class either and would be dropped in silence as if it were the reset; the
 * question here is asked of an element instead, and a nested rule is refused by
 * name before it is asked. See resetSelectorOf().
 *
 * TWO SPELLINGS, ONE CONTEST. `inline-size` and `block-size` share a computed
 * value with `width` and `height` and cascade as one with them, so a rule
 * written `.x svg { inline-size: 40px }` at (0,1,1) beats the reset's `width` at
 * (0,0,1) and decides the icon exactly as a physical declaration would. jsdom
 * does not model that sharing: it keeps the logical declaration in a cascade of
 * its own that `width` never enters, where it wins every contest it is in,
 * including the ones a browser makes it lose. Measured as written it would be a
 * gate that cannot fail. So each logical declaration is rewritten onto its
 * physical counterpart before anything is mounted — value and `!important`
 * alike, and respecting where it sat in its own block — and what gets measured
 * below is the contest the browser holds. The subject keeps the property as the
 * file spells it, so every test name below is a string the stylesheet contains.
 *
 * That rewrite is the horizontal-writing-mode mapping, which is every icon in
 * this repo. It is asserted rather than assumed: a `writing-mode` declaration
 * anywhere in these stylesheets stops the gate, because in a vertical mode
 * `inline-size` is the other axis and folding it onto `width` would measure the
 * wrong contest and pass. See foldLogicalDims() in
 * scripts/lib/icon-cascade.js; its own cases are in
 * scripts/lib/icon-cascade.test.js.
 *
 * WHAT THIS WILL NOT CATCH, stated weakly on purpose:
 *
 *  - A RESET SCOPED TO AN ANCESTOR. Subjects are mounted with only the
 *    ancestors their own selector names, so a rule like
 *    `.ui-app svg:not([width])` — (0,2,2), beating every component rule inside
 *    any .ui-app wrapper — reintroduces this exact defect with this file fully
 *    green. The gate is specific to the contest it knows about; it is not a
 *    property-based proof that no selector anywhere can out-rank a component
 *    rule. Nothing short of rendering every real screen would be.
 *  - THE VALUE. The expectation is read from the same declaration under test, so
 *    this asserts "the declared value is what the cascade resolves", never "the
 *    icon is 17px". Editing 17px to 18px renames the test and stays green. That
 *    is the right contract for a cascade gate and the wrong one to mistake for
 *    design review.
 *  - AN ICON SIZED BY A CLAMP. The min-/max- forms never enter `width`'s
 *    cascade, so there is no contest here to measure and no layout in jsdom to
 *    apply one in. Nothing in the kit clamps an icon today, and the test named
 *    `no rule in the kit sizes an icon with a clamp` is what keeps that true
 *    rather than merely current: the first clamp to land on an icon fails this
 *    gate. The argument is in CLAMP_REFUSAL.
 *  - AN ICON RESET BY `all`. `all: unset`, `all: revert` and `all: initial` each
 *    take `width` back to `auto` in a browser, so a rule carrying one decides
 *    the icon by unsaying the reset. jsdom expands the shorthand into nothing,
 *    so the element still computes the reset's 1.1em here and the rule is
 *    neither a subject nor a refusal. Nothing stops it being a refusal: `all`
 *    itself does reach the CSSOM, exactly as a clamp does, and the clamp is
 *    refused by a test above. This one is named and not refused.
 *  - AN ICON SIZED AROUND `width` ALTOGETHER — `zoom`, `transform: scale()`,
 *    `aspect-ratio`, `contain-intrinsic-size`. None of them enters `width`'s
 *    cascade, and jsdom has no layout for any of them to act in. `aspect-ratio`
 *    is the sharp one, because `.x svg { width: 20px; aspect-ratio: 1 }` derives
 *    the height from the width: the height a browser renders is decided by a
 *    rule this gate reads as setting a width and nothing else. These are not
 *    refused either; naming them is what stops this gate's silence reading as
 *    coverage.
 *  - Layout. jsdom has none, so `width: 100%` reads back as the string `100%`.
 *    That proves the rule won, and says nothing about the pixels on screen.
 *  - Markup. A rule can apply perfectly and never meet an element, because
 *    nothing emits that class.
 *  - The size of a SLOT that holds an icon — `.ui-empty__icon` is a div, so its
 *    44px-to-32px change is a design decision no assertion here covers.
 *  - An icon carrying its own width/height ATTRIBUTES, which the reset skips on
 *    purpose. Seven svgs in src/ do: the brand logos, the success check, the
 *    empty-state illustration.
 *  - Anything outside the stylesheets src/index.css imports. index.css itself is
 *    a list of sheets and not a sheet, and a rule written into it would ship
 *    unread; the test named `src/index.css still holds nothing but @imports` is
 *    what keeps it a list. Four other places render this reset, in files this
 *    gate never opens: the landing site, the Storybook stories under stories/,
 *    the Storybook chrome under .storybook/, whose preview.js imports
 *    src/index.css into every story iframe, and the React workspace under
 *    react/src, which renders against it because react/.storybook/preview.ts
 *    imports the kit's CSS. Two of them carry icon rules today; .storybook/ and
 *    react/src carry none, and their gates are what keep that a fact rather than
 *    an assumption. The first three are gated by
 *    scripts/icon-size-surfaces.test.js and the fourth by
 *    scripts/icon-size-react.test.js. Both share this file's machinery and ask
 *    the same question of what they sweep, and each keeps a count of its own, so
 *    a rule leaving one sweep cannot be cancelled out by a rule arriving in
 *    another. What each one still cannot see is in its own header. The comment
 *    over the reset in src/styles/base.css contradicts all of that — it says two
 *    gates and calls .storybook/ a surface neither sweeps, which stopped being
 *    true when the third gate landed, and it stays wrong because src/ ships and
 *    rewording a comment there costs a version bump; this paragraph is the
 *    account to trust.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import {
  CLAMP_REFUSAL,
  DIMS,
  DROPPED_REFUSAL,
  IMPORT_REFUSAL,
  clampsOn,
  droppedDecls,
  foldLogicalDims,
  importsIn,
  isSvgSubject,
  kitSheetNames,
  kitStyleHtml,
  mount,
  resetSelectorOf,
  resolve,
  rulesOf,
  selectorParts,
  stripComments,
  svgClassSet,
  without,
  writtenAs,
} from '../../scripts/lib/icon-cascade.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '..');

// If a rule stops being collected, it stops being checked, and a shrinking
// suite looks exactly like a passing one. This is the tripwire for that: it is
// the real count, not a floor with slack in it. Raise it when you add a sizing
// rule. If you REMOVE one — which #148's Definition of Done explicitly allows,
// "or is removed because the element does not need one" — lower it in the same
// commit and say why there. The number is meant to be inconvenient.
const EXPECTED_SUBJECTS = 56;

const SHEETS = kitSheetNames(src);

assert.ok(SHEETS.length >= 20,
  `parsed ${SHEETS.length} @imports out of src/index.css — the parser in this test is broken, not the kit.`);

const styles = kitStyleHtml(src, SHEETS);

const dom = new JSDOM(`<!doctype html><html><head>${styles}</head><body></body></html>`);
const { document, getComputedStyle } = dom.window;

assert.equal(document.styleSheets.length, SHEETS.length,
  'jsdom dropped a stylesheet — every rule in it would silently leave coverage.');

// A rule written with a logical property is rewritten onto the physical one it
// shares a computed value with, here, before anything is measured — see
// foldLogicalDims().
SHEETS.forEach((name, i) => foldLogicalDims(document.styleSheets[i], name));

// The classes the kit puts on an <svg>, read out of the components rather than
// listed here, so a new one joins coverage by existing — see svgClassSet().
const SVG_CLASSES = svgClassSet([src]);

test('the kit still puts classes directly on svg elements', () => {
  // If this derivation ever returns nothing, every class-on-svg rule silently
  // leaves coverage — which is how .ui-fbck was missed the first time.
  assert.ok(SVG_CLASSES.size > 0, 'found no class applied to an <svg> in src/**; the scanner is broken');
});

/* The one rule that is not a subject, because it is what every subject is
 * measured against. It is found rather than assumed — see resetSelectorOf(),
 * and the hole that closes. Everything else in base.css is swept like any other
 * sheet's rules. */
const BASE = 'styles/base.css';
const RESET = resetSelectorOf(document.styleSheets[SHEETS.indexOf(BASE)], BASE, SVG_CLASSES);

const subjects = [];
for (const [i, name] of SHEETS.entries()) {
  for (const [rule] of rulesOf(document.styleSheets[i], name, SVG_CLASSES)) {
    for (const raw of selectorParts(rule.selectorText)) {
      const sel = raw.replace(/\s+/g, ' ');
      if (name === BASE && sel === RESET) continue;
      if (!isSvgSubject(sel, SVG_CLASSES)) continue;
      for (const dim of DIMS) {
        const want = rule.style.getPropertyValue(dim).trim();
        if (want) subjects.push({ sel, dim, want, sheet: name, rule, as: writtenAs(rule, dim) });
      }
    }
  }
}

test('every icon sizing rule in the kit is still gated', () => {
  assert.equal(subjects.length, EXPECTED_SUBJECTS,
    `collected ${subjects.length} icon sizing declarations, expected ${EXPECTED_SUBJECTS}. `
    + 'If you added a rule, raise EXPECTED_SUBJECTS. If you removed one, lower it and say why '
    + 'in the commit — a rule that leaves coverage is otherwise indistinguishable from a pass.');
});

test('the reset is not measured against itself', () => {
  /* It is the rule every subject above is compared with, so collecting it as a
   * subject would compare it with itself: the declaration under test and the
   * expectation would be the same declaration, and taking it away would change
   * both — so the non-vacuity check would call the one rule this file cannot do
   * without redundant. That is why the reset is left out, and why it is the only
   * rule in base.css that is. */
  assert.deepEqual(subjects.filter(({ sheet, sel }) => sheet === BASE && sel === RESET), [],
    'the reset is a subject, so the gate is measuring it against itself');
});

test('src/index.css still holds nothing but @imports', () => {
  /* The specifiers in this file are the whole of what this gate opens, so a rule
   * written into index.css itself is a rule no gate reads — and `files` in
   * package.json ships it, so it reaches a consumer's browser and competes with
   * the reset like every rule that is measured. Nothing holds one today. This is
   * what keeps that a fact rather than a habit. */
  /* The keyword is taken out in any case, the way kitSheetNames() reads it. An
   * at-rule keyword folds case, so `@IMPORT "./styles/nav.css";` names a sheet
   * this gate opens like any other — left standing in the residue it reads as
   * CSS of index.css's own, which is a red on a file that is fine and advice
   * that would have the reader move a stylesheet that never left. */
  const left = stripComments(readFileSync(path.join(src, 'index.css'), 'utf8'))
    .replace(/@import\s+[^;]*;/gi, '')
    .trim();
  assert.equal(left, '', 'src/index.css carries CSS of its own, and this gate reads it as nothing '
    + 'but a list of sheets to open — so whatever is written here ships unmeasured. Move the rule '
    + 'into the component stylesheet it belongs to, where the sweep finds it, or teach this gate '
    + 'to read index.css as a sheet as well as a list.');
});

test('no kit stylesheet imports a sheet this gate never opens', () => {
  /* src/index.css is nothing but @imports and is the one sheet whose imports
   * ARE followed — SHEETS is derived from them. A component stylesheet is the
   * other case: an @import there names a sheet nothing composes, and `files` in
   * package.json ships everything under src/, so its rules reach consumers with
   * no gate over them and no complaint here. */
  const unfollowed = SHEETS.flatMap((name) => importsIn(readFileSync(path.join(src, name), 'utf8'))
    .map((spec) => `${name}: @import ${spec}`));
  assert.deepEqual(unfollowed, [], IMPORT_REFUSAL);
});

test('no icon in the kit is sized by a value this gate cannot read', () => {
  /* A value jsdom cannot parse takes the whole declaration out of the CSSOM, and
   * the count above cannot notice: a rule that never reached the CSSOM
   * contributes no subject, so adding one leaves the number where it was. The
   * rule still applies in a browser. base.css is asked too — the reset is the
   * rule every subject is measured against, and a reset that quietly stopped
   * being parsed would hand every contest to the component rule.
   *
   * Asked of the rules that decide an icon, which is why the class set is handed
   * over. What jsdom drops is ordinary CSS elsewhere in these sheets — a bare
   * `env()`, an uppercase `CALC()` — and refusing it on a rule with no icon in it
   * is a red nobody here can act on. droppedDecls() says which shapes stay loud
   * anyway. */
  const dropped = SHEETS.flatMap((name) => droppedDecls(
    name, readFileSync(path.join(src, name), 'utf8'), SVG_CLASSES));
  assert.deepEqual(dropped, [], DROPPED_REFUSAL);
});

test('no rule in the kit sizes an icon with a clamp', () => {
  // base.css is swept too. The reset is excluded from the subjects above
  // because it is the rule they are measured against, but a clamp on it would
  // be no more measurable than a clamp anywhere else.
  const clamped = SHEETS.flatMap((name, i) => clampsOn(document.styleSheets[i], name, SVG_CLASSES));
  assert.deepEqual(clamped, [], CLAMP_REFUSAL);
});

for (const { sel, dim, want, sheet, rule, as } of subjects) {
  test(`${sel} { ${as}: ${want} } decides the icon's ${dim}`, () => {
    const { el, top } = mount(document, sel, SVG_CLASSES);
    try {
      assert.ok(el.matches(sel),
        `mounted an element that does not match "${sel}" — the measurement would be of the wrong thing`);
      /* Forced so the two candidates cannot agree by arithmetic. The reset is
       * 1.1em, so on any element whose font-size happens to make 1.1em equal
       * the declared px the comparison below passes whichever rule won. At
       * 100px the reset reads 110px and nothing else does. It changes no
       * selector, so it changes nothing about which rules match; `resolve`
       * clones this element, inline style included, so the expectation is
       * computed on the same basis. */
      el.style.fontSize = '100px';
      const got = getComputedStyle(el).getPropertyValue(dim);
      const expected = resolve(getComputedStyle, el, dim, want);
      assert.equal(got, expected,
        `${sheet} asks for ${as}: ${want} (resolves to ${expected}) and the cascade gives ${got}. `
        + 'Something upstream out-specifies it — see the header of this file.');
      // And prove that comparison could have failed — see without().
      const gone = without(getComputedStyle, el, rule, dim);
      assert.notEqual(gone, expected,
        `taking "${as}: ${want}" out of ${sheet} changes nothing — the element still computes `
        + `${gone}. So the assertion above passes whether this rule wins or loses, and gates `
        + 'nothing. Either the rule is redundant and should go, or this subject needs a basis '
        + 'that pulls it apart from whatever else is setting the same value.');
    } finally {
      top.remove();
    }
  });
}

test('the reset still sizes a bare icon that no component rule claims', () => {
  /* The cheapest way to stop the reset winning is to delete it, which would
   * leave every bare icon() call at the browser default. This is the half of
   * base.css that has to survive. Asserted as a ratio, not a px string, so it
   * pins the rule and not the root font-size.
   *
   * Both axes, because the reset declares both and half of it is not a reset.
   * Reading `width` alone left `height: 1.1em` deletable with all three gates
   * green: a browser then renders every bare icon at its intrinsic height, and
   * the one assertion standing between that and a release said nothing. */
  const box = document.createElement('div');
  box.style.fontSize = '20px';
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  box.appendChild(el);
  document.body.appendChild(box);
  const style = getComputedStyle(el);
  const got = { width: style.width, height: style.height };
  box.remove();
  assert.deepEqual(got, { width: '22px', height: '22px' },
    'a bare icon should still be sized 1.1em by the reset, on both axes');
});

test('an icon carrying its own width attribute is left alone by the reset', () => {
  // illustrations.js, success.js and the brand logos size themselves this way.
  // The reset skips them on purpose — that is why it is written with :not().
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('width', '132');
  document.body.appendChild(el);
  const got = getComputedStyle(el).width;
  el.remove();
  assert.equal(got, 'auto', 'no CSS width should apply; the attribute sizes it');
});
