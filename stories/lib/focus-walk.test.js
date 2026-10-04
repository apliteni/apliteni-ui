/* Unit tests for the focus walk's selector reading.
 *
 * The gate that consumes this module is stories/focus-ring.test.js. It judges
 * real surfaces; this file judges the reading, on the selector shapes the kit's
 * sheets actually contain — a state inside :is(), a negated state, a ring painted
 * on a sibling, a ring painted on an ancestor, and a selector list whose commas
 * are inside parentheses.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  focusRules, focusSubject, judgeStops, keyboardStops, paintsOf, ringRulesFor,
  selectorList,
} from './focus-walk.js';

const subject = (selector) => focusSubject(selector);

test('a selector list splits on its own commas, never on one inside a function', () => {
  assert.deepEqual(selectorList('.a, .b'), ['.a', '.b']);
  assert.deepEqual(
    selectorList('.a:is(:hover, :focus-visible) > .l, .b:focus-visible'),
    ['.a:is(:hover, :focus-visible) > .l', '.b:focus-visible'],
  );
  assert.deepEqual(selectorList('[data-x="a,b"], .c'), ['[data-x="a,b"]', '.c']);
});

test('the subject is the compound that carries the state, with the state removed', () => {
  assert.deepEqual(subject('.ui-btn:focus-visible'),
    { subject: '.ui-btn', within: false, self: true });
  assert.deepEqual(subject('.ui-nav__item.is-active:focus-visible'),
    { subject: '.ui-nav__item.is-active', within: false, self: true });
  assert.deepEqual(subject('a.ui-nav__crumb:focus-visible'),
    { subject: 'a.ui-nav__crumb', within: false, self: true });
});

test('a ring painted on a sibling still belongs to the element that takes focus', () => {
  // `self` is false: the stop is the input, the paint lands on the track. The
  // presence reading still credits the stop; the cascade resolver leaves that
  // declaration to the track's own cascade.
  assert.deepEqual(subject('.ui-switch input:focus-visible + .ui-switch__track'),
    { subject: '.ui-switch input', within: false, self: false });
});

test('a state inside :is() goes out whole, so the base is a selector the DOM matches', () => {
  assert.deepEqual(
    subject(':where(.ui-app.is-collapsed) .ui-app__rail .ui-nav__item:is(:hover, :focus-visible) > .ui-nav__label'),
    { subject: ':where(.ui-app.is-collapsed) .ui-app__rail .ui-nav__item', within: false, self: false },
  );
});

test('a state mentioned only inside :not() is not a focus rule', () => {
  assert.equal(subject('.ui-nav--side .ui-nav__item--sub.is-active:not(:focus-visible)'), null);
  assert.equal(subject('.ui-btn:hover'), null);
  assert.equal(subject('.ui-card'), null);
});

test(':focus-within names an ancestor of the stop, and says so', () => {
  assert.deepEqual(subject('.ui-file:focus-within'),
    { subject: '.ui-file', within: true, self: false });
});

test('a pseudo-element is not part of the base selector', () => {
  // `self` is false for the same reason as a sibling: `::before` is its own box.
  assert.deepEqual(subject('.ui-check input:focus-visible::before'),
    { subject: '.ui-check input', within: false, self: false });
});

test('what a rule paints: the ring, a visible outline, another shadow, or nothing', () => {
  assert.deepEqual(paintsOf('outline: 2px solid transparent; box-shadow: var(--ring);'),
    { ring: true, outline: null, shadow: null });
  assert.deepEqual(paintsOf('outline: 2px solid var(--accent); outline-offset: 2px;'),
    { ring: false, outline: '2px solid var(--accent)', shadow: null });
  assert.deepEqual(paintsOf('outline: none; box-shadow: 0 0 0 2px blue;'),
    { ring: false, outline: null, shadow: '0 0 0 2px blue' });
  assert.deepEqual(paintsOf('color: red;'), { ring: false, outline: null, shadow: null });
  // The composed forms the kit ships: the ring first in a longer list, and a
  // !important a net would need.
  assert.equal(paintsOf('box-shadow: var(--ring), var(--elev-drop);').ring, true);
  assert.equal(paintsOf('box-shadow: var(--ring) !important;').ring, true);
  assert.equal(paintsOf('box-shadow: none;').shadow, null);
  // #531: a scroll region draws the same gap and band inward, as an OUTLINE, so the
  // region's own children cannot paint over it. It is the ring AND a real outline, and
  // a reading that saw only one of those would call the region unringed or call it
  // owing a transparent outline it has no room for.
  assert.deepEqual(paintsOf('outline: var(--ring-scroll); outline-offset: var(--ring-scroll-offset);'),
    { ring: true, outline: null, shadow: null });
  // And not any outline: a muted one of a control's own is what the rule forbids.
  assert.equal(paintsOf('outline: 1px solid var(--control-edge);').ring, false);
});

const dom = (html) => new JSDOM(`<!doctype html><html><body>${html}</body></html>`).window.document.body;

test('a keyboard stop is one the keyboard reaches, not every focusable node', () => {
  const body = dom(`
    <a href="#a">link</a>
    <a>no href</a>
    <button>go</button>
    <button disabled>off</button>
    <button aria-disabled="true">off too</button>
    <input type="hidden">
    <div tabindex="0">panel</div>
    <div role="tab" tabindex="-1">unselected tab</div>
    <div role="option" tabindex="-1">a listbox row</div>
    <div tabindex="-1">a dialog panel</div>
    <div hidden><button>in a closed panel</button></div>`);
  // `a listbox row` joined the list when #487's re-review added `option` to
  // ROVING_ROLES: the version switcher's rows carry that role and the kit's
  // arrow keys focus them. `a dialog panel` stays out — a bare tabindex="-1"
  // with no roving role is programmatic focus, not a keyboard stop.
  assert.deepEqual(
    keyboardStops(body).map((el) => (el.textContent || '').trim()),
    ['link', 'go', 'panel', 'unselected tab', 'a listbox row', 'in a closed panel'],
  );
});

test('the verdict names what the reader would see', () => {
  const body = dom('<button class="t">Go</button>');
  const judge = (css) => judgeStops(body, focusRules(css, 'fixture')).stops[0];
  assert.equal(judge('.t{color:red}').status, 'native');
  assert.equal(judge('.t:focus-visible{outline:2px solid var(--accent)}').status, 'outline');
  assert.equal(judge('.t:focus-visible{outline:2px solid transparent;box-shadow:var(--ring)}').status, 'ring');
  // The ring can come from a rule inside a media block; the at-rule is not a rule.
  assert.equal(
    judge('@media (min-width: 1px){.t:focus-visible{outline:2px solid transparent;box-shadow:var(--ring)}}').status,
    'ring',
  );
});

test('a selector this reading cannot match is reported, not silently dropped', () => {
  const body = dom('<button class="t">Go</button>');
  const { unmatchable } = judgeStops(body, [{
    origin: 'fixture', selector: '.t:focus-visible', subject: '.t:::broken', within: false,
    paints: { ring: true, outline: null, shadow: null },
  }]);
  assert.equal(unmatchable.length, 1, 'an unparsable subject has to surface');
});

// #531's reading: which rules answer one box's focus. Both shapes the sheets use,
// and the cases that must NOT match, because a reader that over-matches calls a
// bare scroller ringed.
test('a box\'s ring is found on itself and on the box a :has() rule delegates it to', () => {
  const rules = focusRules(`
    .ui-table-scroll:focus-visible { outline: 2px solid transparent; box-shadow: var(--ring); }
    .ui-snippet :focus-visible { outline: 2px solid transparent; box-shadow: var(--ring); }
    .ui-snippet:has(pre:focus-visible) { outline: 2px solid transparent; box-shadow: var(--ring); }
    .ui-cmdk__panel:has(.ui-cmdk__list:focus-visible) { outline: 2px solid transparent; box-shadow: var(--ring), var(--elev-drop); }
    .ui-table-scroll:focus-visible { outline: var(--ring-scroll); outline-offset: var(--ring-scroll-offset); }
    .ui-card:has(> .ui-table):focus-visible { outline: var(--ring-scroll); outline-offset: var(--ring-scroll-offset); }
    .ui-seg--underline button:focus-visible { outline: 2px solid transparent; box-shadow: var(--ring); }
    .ui-dropdown__item.is-active { box-shadow: inset 2px 0 0 var(--accent); }
  `, 'fixture');
  const answering = (selector) => ringRulesFor(selector, rules).map((r) => r.selector).sort();

  // Its own rule, and the scroll ring counts as one: it is the shared ring drawn
  // inward. Two rules reach this box in the fixture, which is also the case the
  // reader has to return in full rather than first-match.
  assert.deepEqual(answering('.ui-table-scroll'),
    ['.ui-table-scroll:focus-visible', '.ui-table-scroll:focus-visible']);
  // A subject that is an ancestor, and the ancestor the ring is delegated to.
  assert.deepEqual(answering('.ui-snippet pre'),
    ['.ui-snippet :focus-visible', '.ui-snippet:has(pre:focus-visible)']);
  // Delegation by class. The kit's one delegation is by element (#474's snippet); this
  // shape is read too, because a rule may key on either.
  assert.deepEqual(answering('.ui-cmdk__list'),
    ['.ui-cmdk__panel:has(.ui-cmdk__list:focus-visible)']);
  // A `:has()` that is part of the SUBJECT rather than the delegation: the focus
  // pseudo is outside it, so the rule paints on the box that scrolls — which is how
  // #531 writes the card around a table.
  assert.deepEqual(answering('.ui-card:has(> .ui-table)'),
    ['.ui-card:has(> .ui-table):focus-visible']);
  // The strip is not ringed by its buttons' rule, and a box nothing reaches has
  // no answer at all.
  assert.deepEqual(answering('.ui-seg--underline'), []);
  assert.deepEqual(answering('.ui-drawer__body'), []);
});
