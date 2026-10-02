// Where a scroll container's focus ring is PAINTED, resolved from the source CSS.
//
// stories/focus-ring.test.js triages the boxes and says which carry the ring;
// this file says which box each ring lands on, and that exactly one indicator is
// drawn per focus. The two readings are separate on purpose: a triage that reads
// "a rule answers this box" cannot tell a ring on the box from a ring on the
// container around it, and #474 showed that the difference is the whole fix.
//
// The pattern is stories/snippet-focus.test.js's, for the same reason: the kit's
// sheets are resolved with the tokens substituted and `:focus-visible` desugared
// to an attribute, so JSDOM computes a real box-shadow for a focused box.
//
// WHAT THIS GATE WILL NOT CATCH. JSDOM lays nothing out, so it cannot prove a box
// scrolls, that Chrome makes it a stop, or that a ring is or is not clipped by an
// ancestor. `--ring-gap: inherit` is not measurable either — contrast.js
// substitutes each custom property once for the whole sheet. Those are the
// Chromium captures on #531, at 390 and 1280 in both themes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { STYLE_FILES, desugar, substitute, tokensFor } from './lib/contrast.js';
import { leafRules } from './lib/motion-css.js';
import { confirm, drawer, dropdown } from '../src/index.js';
import { commandPalette } from '../src/components/command-palette.js';

const source = STYLE_FILES.map((file) => readFileSync(file, 'utf8')).join('\n');
/** No shadow at all — the reading for a box that carries none at rest. */
const quiet = (style) => ['', 'none'].includes(style.boxShadow);

/**
 * The five scroll containers #531 ringed, each with the markup that renders it and
 * the box its ring is painted on. `host` is null when the box carries its own, and
 * `inset` marks the one that draws the ring INWARD, because an outset one — on
 * either box — would be painted off-screen.
 *
 * A card around a table is written out rather than taken from a factory: `card()`
 * wraps its body, and the rule keys on a table that is the card's own child, which
 * is the shape the Table stories and the shell write by hand.
 */
const SUBJECTS = [
  {
    name: 'a table card',
    box: '.ui-card:has(> .ui-table)',
    host: null,
    why: 'the card is the scroller, its own box-shadow survives its own overflow, '
      + 'and it has the radius the ring follows',
    markup: () => '<div class="ui-card"><table class="ui-table"><tbody><tr>'
      + '<td>Nebula</td><td>42</td></tr></tbody></table></div>',
  },
  {
    name: "a dropdown's search list",
    box: '.ui-dropdown__list',
    host: '.ui-dropdown__panel',
    why: 'the list sits 6px inside a 16px corner, where its own ring would leave the panel',
    markup: () => dropdown({
      label: 'Account', search: true, open: true,
      items: [{ label: 'Nebula', value: 'nebula' }, { label: 'Vela', value: 'vela' }],
    }),
  },
  {
    name: "a drawer's body",
    box: '.ui-drawer__body',
    host: null,
    inset: true,
    why: 'the body is flush with a panel that is flush with a screen edge, so an outset '
      + 'ring on either box is painted off-screen; the 20px padding is the room for an '
      + 'inset one',
    markup: () => drawer({ id: 'd', title: 'Record', body: '<p>A line of prose.</p>' }),
  },
  {
    name: "a confirm's consequence",
    box: '.ui-confirm__body',
    host: null,
    why: 'the panel insets the paragraph by --space-5 on every side, so a square ring '
      + 'on a square scroller clips nothing',
    markup: () => confirm({ id: 'c', title: 'Delete it?', body: 'It cannot be undone.' }),
  },
  {
    name: "the command palette's list",
    box: '.ui-cmdk__list',
    host: '.ui-cmdk__panel',
    why: 'the panel clips with overflow: hidden',
    markup: () => commandPalette({
      id: 'p', groups: [{ label: 'Go', items: [{ id: 'a', label: 'Overview' }] }],
    }),
  },
];

/* The reference each subject is measured against. The outset one is a plain kit
 * control on the page; the INSET one has to stand where the box it stands in for
 * stands, because --ring-gap is inherited and the drawer's panel re-points it — a
 * reference on the page would resolve the page's gap and never match. */
const REFERENCE = `
  .fx-ref-inset:focus-visible { box-shadow: var(--ring-inset); }
`;

function stage(css, theme, accent) {
  const resolved = desugar(substitute(css + REFERENCE, tokensFor(theme, accent)))
    .replace(/calc\(([-\d.]+)px \+ ([-\d.]+)px\)/g, (_, a, b) => `${Number(a) + Number(b)}px`);
  const html = `<style>${resolved}</style>${SUBJECTS.map((s) => s.markup()).join('')}`
    + '<button class="ui-focusable">Reference</button>';
  const win = new JSDOM(html).window;
  for (const { box, inset } of SUBJECTS) {
    if (!inset) continue;
    const el = win.document.querySelector(box);
    assert.ok(el, `nothing rendered ${box}`);
    el.parentElement.insertAdjacentHTML('beforeend', '<span class="fx-ref-inset"></span>');
  }
  return win;
}

function check(css, theme, accent) {
  const win = stage(css, theme, accent);
  const ringOf = (selector) => {
    const reference = win.document.querySelector(selector);
    assert.ok(reference, `no ${selector} to read the reference ring from`);
    reference.setAttribute('data-ui-state', 'focus-visible');
    const style = win.getComputedStyle(reference);
    assert.ok(style.boxShadow && style.boxShadow !== 'none', `${selector} resolved no ring`);
    return style.boxShadow;
  };
  const outset = ringOf('.ui-focusable');
  const insetRing = ringOf('.fx-ref-inset');
  assert.notEqual(outset, insetRing, 'the inset ring has to differ from the outset one');

  for (const { name, box, host, why, inset } of SUBJECTS) {
    const expected = inset ? insetRing : outset;
    const el = win.document.querySelector(box);
    assert.ok(el, `${name}: nothing rendered ${box}`);
    const painter = host ? el.closest(host) : el;
    assert.ok(painter, `${name}: ${box} is not inside ${host}`);
    // Carries the ring, rather than carries nothing: a card and the three panels
    // all cast an elevation shadow at rest, and the ring is composed in front of
    // it because a box-shadow list replaces the whole list.
    const rings = (el2) => win.getComputedStyle(el2).boxShadow.includes(expected);
    assert.ok(!rings(el) && !rings(painter), `${name}: the ring is keyboard-focus only`);

    el.setAttribute('data-ui-state', 'focus-visible');
    assert.ok(rings(painter),
      `${name}: ${host || box} does not carry the shared ring (${why})`);
    assert.match(win.getComputedStyle(painter).outline, /transparent/,
      `${name}: ${host || box} keeps no outline for forced colors`);
    if (host) {
      assert.ok(!rings(el),
        `${name}: ${box} paints a ring of its own as well as ${host}'s`);
      assert.match(win.getComputedStyle(el).outline, /transparent|none/,
        `${name}: ${box} does not suppress the browser's outline`);
    } else {
      assert.ok(quiet(win.getComputedStyle(el)) || rings(el),
        `${name}: ${box} carries its own ring`);
    }
    el.removeAttribute('data-ui-state');
    assert.ok(!rings(painter), `${name}: the ring outlives the focus`);
  }

  // Anti-vacuity: the subjects are five, one of them inset, and the reading above ran
  // on each.
  assert.equal(SUBJECTS.length, 5, 'the kit rings five scroll containers that had none on #531');
  assert.equal(SUBJECTS.filter((s) => s.inset).length, 1, 'only the drawer body draws inward');
  assert.equal(SUBJECTS.filter((s) => s.host).length, 2, 'two of the five hand their ring to a container');
  win.close();
}

for (const theme of ['light', 'dark']) for (const accent of ['default', 'ocean']) {
  test(`a scroll container's ring lands on the box that can draw it: ${theme}/${accent}`,
    () => check(source, theme, accent));
}

// Each mutation takes out one declaration the fix rests on, so an edit that drops
// it fails here rather than in a capture nobody re-takes. One per subject, so no
// subject is proved only by its neighbours.
for (const [name, mutate, expected] of [
  ['the card\'s own ring',
    (css) => css.replace(/\.ui-card:has\(> \.ui-table\):focus-visible \{[^}]*\}/, ''),
    /a table card: \.ui-card/],
  ['the panel\'s ring for the search list',
    (css) => css.replace(/\.ui-dropdown__panel:has\(\.ui-dropdown__list:focus-visible\) \{[^}]*\}/, ''),
    /search list: \.ui-dropdown__panel does not carry/],
  ['the inset ring on the drawer body',
    (css) => css.replace(/\.ui-drawer__body:focus-visible \{[^}]*\}/, ''),
    /drawer's body: \.ui-drawer__body does not carry/],
  ['the ring on the consequence',
    (css) => css.replace(/\.ui-confirm__body:focus-visible \{[^}]*\}/, ''),
    /consequence: \.ui-confirm__body does not carry/],
  ['the panel\'s ring for the palette list',
    (css) => css.replace(/\.ui-cmdk__panel:has\(\.ui-cmdk__list:focus-visible\) \{[^}]*\}/, ''),
    /palette's list: \.ui-cmdk__panel does not carry/],
  ['the transparent outline on a delegating box',
    (css) => css.replace('.ui-cmdk__list:focus-visible { outline: 2px solid transparent; }', ''),
    /does not suppress the browser's outline/],
]) {
  test(`rejects removing ${name}`, () => {
    const mutated = mutate(source);
    assert.notEqual(mutated, source, 'the mutation found its declaration');
    assert.throws(() => check(mutated, 'light', 'default'), expected);
  });
}

// ---- forced colors --------------------------------------------------------
//
// That mode drops every box-shadow and applies the `(forced-colors: active)`
// blocks. JSDOM evaluates no media query, so the blocks are flattened in by hand
// after the shadows are stripped — which is also the proof they are reachable.
// What the system repaints a declared outline AS is its business; what matters
// here is how many boxes declare one, because that is how many indicators appear.
const FORCED = /forced-colors\s*:\s*active/;

function emulateForcedColors(css) {
  const flattened = leafRules(css)
    .filter((rule) => rule.at.some((prelude) => FORCED.test(prelude)))
    .map((rule) => `${rule.selector} { ${rule.decls.map((d) => `${d.prop}: ${d.value}`).join('; ')} }`);
  // Two delegating boxes in the kit — the dropdown's list and the palette's — plus
  // the snippet's code region, which #474 wrote the pattern for. The drawer's body
  // has none: it draws its own ring and keeps its own outline.
  assert.equal(flattened.length, 3, 'the forced-colors blocks for the delegating boxes moved');
  return [css.replace(/box-shadow\s*:[^;}]+/g, 'box-shadow: none'), ...flattened].join('\n');
}

function checkForcedColors(css, theme) {
  const win = stage(emulateForcedColors(css), theme, 'default');
  const declares = (el) => !['', 'none'].includes(win.getComputedStyle(el).outline);
  for (const { name, box, host } of SUBJECTS.filter((s) => s.host)) {
    const el = win.document.querySelector(box);
    const painter = el.closest(host);
    el.setAttribute('data-ui-state', 'focus-visible');
    assert.ok(quiet(win.getComputedStyle(el)) && quiet(win.getComputedStyle(painter)),
      `${name}: forced colors leaves no box-shadow at all, so an outline is the only signal left`);
    assert.equal(win.getComputedStyle(el).outline, 'none',
      `${name}: ${box} declares no outline in forced colors`);
    assert.match(win.getComputedStyle(painter).outline, /(?:^|\s)2px(?:\s|$)/,
      `${name}: ${host} declares the outline that replaces it`);
    assert.equal([el, painter].filter(declares).length, 1,
      `${name}: one focused region draws one indicator, not two`);
    el.removeAttribute('data-ui-state');
  }
  win.close();
}

for (const theme of ['light', 'dark']) {
  test(`a delegated ring draws one indicator in forced colors: ${theme}`,
    () => checkForcedColors(source, theme));
}

// The defect the forced-colors blocks exist for, restored: leave the inner box's
// transparent outline standing and the system repaints it inside the container's.
test('rejects letting a delegating box keep an outline in forced colors', () => {
  const mutated = source.replace(
    '  .ui-dropdown__list:focus-visible { outline: none; }',
    '  .ui-dropdown__list:focus-visible { outline: 2px solid transparent; }');
  assert.notEqual(mutated, source, 'the mutation found the rule');
  assert.throws(() => checkForcedColors(mutated, 'light'),
    /search list: \.ui-dropdown__list declares no outline in forced colors/);
});

// The defect finding 1 of #557's review measured: an outset ring on a box that is
// flush with a panel flush with the screen is painted off-screen. JSDOM lays nothing
// out, so what this can prove is that the drawer's ring is the INWARD one — the
// 390px frames on #531 are what show it reaching a reader.
test('the drawer body draws the ring inward, not outward', () => {
  const win = stage(source, 'light', 'default');
  const body = win.document.querySelector('.ui-drawer__body');
  const panel = win.document.querySelector('.ui-drawer__panel');
  const panelAtRest = win.getComputedStyle(panel).boxShadow;
  body.setAttribute('data-ui-state', 'focus-visible');
  const painted = win.getComputedStyle(body).boxShadow;
  assert.equal((painted.match(/inset/g) || []).length, 3,
    'all three layers are drawn inward, or part of the ring is off-screen again');
  assert.equal(win.getComputedStyle(panel).boxShadow, panelAtRest,
    'the panel draws nothing new for a focused body — it cannot, it is flush with the screen');
  win.close();
});
