/* Rule: a component rule that sizes an icon is the rule that decides its size.
 *
 * The kit sizes icons in two places and they compete. base.css carries a reset
 * for bare icon() calls, and twenty-odd component rules size the icon in their
 * own slot. For two years the reset won every one of those contests without
 * anybody noticing, because the losing rule is still right there in the file:
 * `.ui-nav__ic svg { width: 17px }` reads as a decision, renders as 1.1em, and
 * nothing says which.
 *
 * `svg:not([width]):not([height])` is (0,2,1) — :not() carries the specificity
 * of its argument, and two attribute selectors count as two class-level units.
 * A component rule like `.ui-btn svg` is (0,1,1). Source order never enters
 * into it, so the comment promising component rules "come later and win the
 * tie" described a tie that was never tied.
 *
 * So this gate does not read the stylesheets and reason about them. It mounts
 * an element matching each rule's selector against the kit's real stylesheets,
 * in the order src/index.css imports them, and reads getComputedStyle back. A
 * rule that stops applying goes red here rather than being noticed one day by
 * someone squinting at a screen.
 *
 * THE SUBJECT is every rule whose selector ends in `svg`, declares a width or a
 * height, and carries at least one class. That last clause is what separates a
 * component rule from the reset, which carries none. A bare `svg { width: … }`
 * added to a component sheet would therefore not be gated — say so rather than
 * let the omission read as coverage.
 *
 * WHAT THIS WILL NOT CATCH:
 *
 *  - Percentages, beyond the fact that the rule won. JSDOM has no layout, so
 *    `width: 100%` reads back as the string `100%`, not as the parent's px.
 *    That is enough to prove the cascade, which is what this file is about, and
 *    it is not a claim that the icon fills its slot on screen.
 *  - Anything a real browser decides that JSDOM does not: layout, painting,
 *    what an SVG's own viewBox does inside a box of the wrong aspect ratio.
 *  - Markup. A rule can apply perfectly and still never meet an element,
 *    because nothing emits that class. This gate reads the stylesheets, not the
 *    components.
 *  - An icon carrying its own width/height ATTRIBUTES, which the reset
 *    deliberately skips. Seven svgs in src/ do — the brand logos, the success
 *    check, the empty-state illustration. They are sized by the attribute and
 *    are not part of this contest.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '..');

// The load order is src/index.css's @import list, not the order the files sit
// in on disk. Source order breaks specificity ties, so reading them
// alphabetically would report the wrong winner for exactly the rules most at
// risk — the ones that tie.
const SHEETS = [...readFileSync(path.join(src, 'index.css'), 'utf8')
  .matchAll(/@import\s+"\.\/([^"]+)"/g)].map((m) => m[1]);

const css = SHEETS.map((rel) => readFileSync(path.join(src, rel), 'utf8')).join('\n');

const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body></body></html>`);
const { document, getComputedStyle } = dom.window;

// Walk the parsed CSSOM rather than the text: it splits selector lists, ignores
// comments, and descends into @media correctly if a sizing rule ever moves
// inside one. None does today.
// A CSSStyleRule carries an empty `cssRules` of its own under CSS nesting, so
// testing that property first swallows every style rule in the sheet. Yield the
// rule, THEN descend.
function* styleRules(rules) {
  for (const rule of rules) {
    if (rule.selectorText) yield rule;
    if (rule.cssRules?.length) yield* styleRules(rule.cssRules);
  }
}

const DIMS = ['width', 'height'];
const subjects = [];
for (const rule of styleRules(document.styleSheets[0].cssRules)) {
  for (const raw of rule.selectorText.split(',')) {
    const sel = raw.trim().replace(/\s+/g, ' ');
    if (!sel.endsWith('svg')) continue;
    if (!sel.includes('.')) continue; // the reset, not a component rule
    for (const dim of DIMS) {
      const want = rule.style.getPropertyValue(dim).trim();
      if (want) subjects.push({ sel, dim, want });
    }
  }
}

// The smallest DOM that satisfies a descendant selector such as
// `.ui-nav--side.is-collapsed .ui-nav__ic svg`. Every selector the kit uses for
// an icon is a descendant chain of compound class/element parts; anything more
// exotic would throw here rather than quietly measure the wrong element.
function mount(sel) {
  const parts = sel.split(' ').filter(Boolean);
  let parent = document.body;
  let el = null;
  for (const part of parts) {
    if (/[>+~[:]/.test(part)) throw new Error(`unsupported selector part: ${part} (in ${sel})`);
    const tag = part.startsWith('.') ? 'div' : part.replace(/\..*$/, '');
    el = tag === 'svg'
      ? document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      : document.createElement(tag);
    for (const cls of part.split('.').slice(1)) el.classList.add(cls);
    parent.appendChild(el);
    parent = el;
  }
  return { el, top: document.body.lastElementChild };
}

test('the kit has icon sizing rules to gate', () => {
  // A parser that silently matched nothing would make every test below vacuous
  // and the file would sit green over a kit with no sizing rules at all.
  assert.ok(subjects.length >= 20, `expected 20+ svg sizing declarations, found ${subjects.length}`);
});

for (const { sel, dim, want } of subjects) {
  test(`${sel} { ${dim}: ${want} } decides the icon's ${dim}`, () => {
    const { el, top } = mount(sel);
    const got = getComputedStyle(el).getPropertyValue(dim);
    top.remove();
    assert.equal(got, want,
      `${sel} asks for ${dim}: ${want} and the cascade resolves ${got}. `
      + 'Something upstream out-specifies it — see the header of this file.');
  });
}

test('the reset still sizes a bare icon that no component rule claims', () => {
  // The fix for the above is to stop the reset winning, and the cheapest way to
  // do that is to delete it — which would leave every bare icon() call at the
  // browser default. This is the half of base.css:106 that has to survive.
  // Asserted as a ratio, not as a px string: getComputedStyle resolves the em
  // against the inherited font-size, so a literal expectation would pin the
  // root font-size rather than the rule.
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
  // src/assets/illustrations.js, success.js and the brand logos size themselves
  // this way. The reset skips them on purpose, and that is why it is written
  // with :not() at all.
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('width', '132');
  document.body.appendChild(el);
  const got = getComputedStyle(el).width;
  el.remove();
  assert.equal(got, 'auto', 'no CSS width should apply; the attribute sizes it');
});
