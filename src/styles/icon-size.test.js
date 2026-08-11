/* Rule: a component rule that sizes an icon is the rule that decides its size.
 *
 * why: docs/adr/0003-an-icons-size-is-measured-not-reasoned-about.md */
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
