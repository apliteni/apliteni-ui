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
 * element, so every rule knows which file it came from. That is how the reset
 * is told apart from a component rule. Guessing by "has no class in it" — the
 * obvious shortcut — breaks the moment anyone writes a nested rule, because
 * jsdom serialises `.x { svg { … } }` as `& svg`, which has no class either and
 * would be silently dropped as if it were the reset.
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
 *  - ANY DIMENSION OTHER THAN width/height. DIMS in
 *    scripts/lib/icon-cascade.js is those two and nothing else, so a rule
 *    sizing an icon with `inline-size`, `block-size` or a min-/max- form
 *    contributes no subject and loses no contest here — and the two forms then
 *    go wrong differently in a real browser. `inline-size` and `block-size`
 *    cascade as one with their physical counterparts, so `.x svg { inline-size:
 *    40px }` at (0,1,1) out-specifies the reset's `width` at (0,0,1) and takes
 *    the contest. `min-width` / `max-width` / `min-height` / `max-height` never
 *    enter `width`'s cascade at all: the reset still wins `width`, and the
 *    min-/max- value clamps the used value afterwards, which changes nothing
 *    unless the clamp binds. Nothing on an svg subject uses either form today.
 *  - Layout. jsdom has none, so `width: 100%` reads back as the string `100%`.
 *    That proves the rule won, and says nothing about the pixels on screen.
 *  - Markup. A rule can apply perfectly and never meet an element, because
 *    nothing emits that class.
 *  - The size of a SLOT that holds an icon — `.ui-empty__icon` is a div, so its
 *    44px-to-32px change is a design decision no assertion here covers.
 *  - An icon carrying its own width/height ATTRIBUTES, which the reset skips on
 *    purpose. Seven svgs in src/ do: the brand logos, the success check, the
 *    empty-state illustration.
 *  - Anything outside the stylesheets src/index.css imports. The landing site
 *    and the Storybook stories carry icon rules of their own, in files this gate
 *    never opens. Those are gated by scripts/icon-size-surfaces.test.js, which
 *    shares this file's machinery and asks the same question of them; between
 *    the two, every icon-sizing rule the kit renders is measured.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import {
  DIMS,
  isSvgSubject,
  kitSheetNames,
  kitStyleHtml,
  mount,
  resolve,
  rulesOf,
  svgClassSet,
  without,
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

// The classes the kit puts on an <svg>, read out of the components rather than
// listed here, so a new one joins coverage by existing — see svgClassSet().
const SVG_CLASSES = svgClassSet([src]);

test('the kit still puts classes directly on svg elements', () => {
  // If this derivation ever returns nothing, every class-on-svg rule silently
  // leaves coverage — which is how .ui-fbck was missed the first time.
  assert.ok(SVG_CLASSES.size > 0, 'found no class applied to an <svg> in src/**; the scanner is broken');
});

const subjects = [];
for (const [i, name] of SHEETS.entries()) {
  for (const [rule] of rulesOf(document.styleSheets[i], name, SVG_CLASSES)) {
    // base.css owns the reset. It is excluded by which file it lives in, not by
    // what its selector looks like.
    if (name === 'styles/base.css') continue;
    for (const raw of rule.selectorText.split(',')) {
      const sel = raw.trim().replace(/\s+/g, ' ');
      if (!isSvgSubject(sel, SVG_CLASSES)) continue;
      for (const dim of DIMS) {
        const want = rule.style.getPropertyValue(dim).trim();
        if (want) subjects.push({ sel, dim, want, sheet: name, rule });
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

for (const { sel, dim, want, sheet, rule } of subjects) {
  test(`${sel} { ${dim}: ${want} } decides the icon's ${dim}`, () => {
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
        `${sheet} asks for ${dim}: ${want} (resolves to ${expected}) and the cascade gives ${got}. `
        + 'Something upstream out-specifies it — see the header of this file.');
      // And prove that comparison could have failed — see without().
      const gone = without(getComputedStyle, el, rule, dim);
      assert.notEqual(gone, expected,
        `taking "${dim}: ${want}" out of ${sheet} changes nothing — the element still computes `
        + `${gone}. So the assertion above passes whether this rule wins or loses, and gates `
        + 'nothing. Either the rule is redundant and should go, or this subject needs a basis '
        + 'that pulls it apart from whatever else is setting the same value.');
    } finally {
      top.remove();
    }
  });
}

test('the reset still sizes a bare icon that no component rule claims', () => {
  // The cheapest way to stop the reset winning is to delete it, which would
  // leave every bare icon() call at the browser default. This is the half of
  // base.css that has to survive. Asserted as a ratio, not a px string, so it
  // pins the rule and not the root font-size.
  const box = document.createElement('div');
  box.style.fontSize = '20px';
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  box.appendChild(el);
  document.body.appendChild(box);
  const got = getComputedStyle(el).width;
  box.remove();
  assert.equal(got, '22px', 'a bare icon should still be sized 1.1em by the reset');
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
