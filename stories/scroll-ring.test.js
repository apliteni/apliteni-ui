// What a scroll region's focus indicator IS, resolved from the source CSS.
//
// stories/focus-ring.test.js triages the boxes and says which carry a ring; this
// file says what each one draws and that exactly one indicator is drawn per focus.
// The two readings are separate on purpose: a triage that reads "a rule answers this
// box" cannot tell the kit's outward band from the inward one a scroll region takes,
// and on #531 round r30 the difference was the whole review. Since #578 both bands are
// outlines of the same ink and width, so the OFFSET is the whole of the difference —
// which makes reading it here the only way to tell them apart at all.
//
// The pattern is stories/snippet-focus.test.js's, for the same reason: the kit's
// sheets are resolved with the tokens substituted and `:focus-visible` desugared to
// an attribute, so JSDOM computes a real outline for a focused box.
//
// WHY AN OUTLINE AND NOT A SHADOW, which is the fact every check below rests on. An
// inset box-shadow is painted under the box's OWN CHILDREN. Six of these seven have
// transparent children and would have been fine; the two with a table in them are
// not, and a card scrolled sideways at scrollLeft 300 came back in Chrome with its
// left and right sides erased by the table's own background. An outline is painted
// over the children, stays on the border box while the content scrolls under it, and
// follows the radius. `outline-offset` is what draws it inward.
//
// WHAT THIS GATE WILL NOT CATCH. JSDOM lays nothing out and paints nothing, so it
// cannot prove a box scrolls, that Chrome makes it a stop, or that the band survives
// a scroll — the measurement above is a Chromium one, re-taken on #531 at 390 and
// 1280 in both themes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { STYLE_FILES, desugar, substitute, tokensFor } from './lib/contrast.js';

import { confirm, drawer, dropdown } from '../src/index.js';
import { commandPalette } from '../src/components/command-palette.js';

const source = STYLE_FILES.map((file) => readFileSync(file, 'utf8')).join('\n');
/** No shadow at all — the reading for a box that carries none at rest. */
const quiet = (style) => ['', 'none'].includes(style.boxShadow);
/** Nothing a reader can see where an outline would be. */
const bareOutline = (style) => ['', 'none', '0px'].includes(style.outline)
  || /\btransparent\b/.test(style.outline);

const tableMarkup = () => '<table class="ui-table"><tbody>'
  + '<tr><td>Nebula</td><td>42</td></tr><tr><td>Vela</td><td>17</td></tr>'
  + '</tbody></table>';

/**
 * The six scroll regions the kit ships inside a surface, each with the markup that
 * renders it and the reason it draws the band rather than the kit's outset ring.
 * Every one of them paints its own: nothing here delegates, which is itself a
 * guarantee the checks below hold.
 *
 * A card around a table is written out rather than taken from a factory: `card()`
 * wraps its body, and the rule keys on a table that is the card's own child, which
 * is the shape the Table stories and the shell write by hand. The scrolling table
 * wrapper is written out for the same reason — the stories compose it by hand.
 */
const SUBJECTS = [
  {
    name: 'a table card',
    box: '.ui-card:has(> .ui-table)',
    why: 'the card is the scroller and has the radius the band follows; an outset ring '
      + 'here lights the whole card for a stop inside it',
    markup: () => `<div class="ui-card">${tableMarkup()}</div>`,
  },
  {
    name: 'a scrolling table wrapper',
    box: '.ui-table-scroll',
    why: 'a scroll region inside a card, like the rest, so it stops spending a halo '
      + 'across the card around it',
    markup: () => '<div class="ui-card"><div class="ui-table-scroll" role="region" '
      + `aria-label="Payouts" tabindex="0">${tableMarkup()}</div></div>`,
  },
  {
    name: "a dropdown's search list",
    box: '.ui-dropdown__list',
    why: 'the list sits 6px inside a 16px corner, where an outset ring leaves the panel '
      + 'and lights a box that is not the one that scrolls',
    markup: () => dropdown({
      label: 'Account', search: true, open: true,
      items: [{ label: 'Nebula', value: 'nebula' }, { label: 'Vela', value: 'vela' }],
    }),
  },
  {
    name: "a drawer's body",
    box: '.ui-drawer__body',
    why: 'the body is flush with a panel that is flush with a screen edge, so an outset '
      + 'ring on either box is painted off-screen; the 20px padding is the room for it',
    markup: () => drawer({ id: 'd', title: 'Record', body: '<p>A line of prose.</p>' }),
  },
  {
    name: "a confirm's consequence",
    box: '.ui-confirm__body',
    why: 'the --space-1 is the band\'s clearance from the glyphs, and the panel insets '
      + 'the paragraph by --space-5 on every side',
    markup: () => confirm({ id: 'c', title: 'Delete it?', body: 'It cannot be undone.' }),
  },
  {
    name: "the command palette's list",
    box: '.ui-cmdk__list',
    why: 'the panel clips with overflow: hidden, so an outset ring on the list is cut off',
    markup: () => commandPalette({
      id: 'p', groups: [{ label: 'Go', items: [{ id: 'a', label: 'Overview' }] }],
    }),
  },
];

/* The two references every subject is read against: a plain kit control on the page,
 * which draws the outset ring, and a bare box taking the scroll ring. Both are on the
 * page rather than inside a panel, which they could not have been before r30: the
 * band reads neither --ring-gap nor any token a surface re-points, so it resolves the
 * same wherever it stands. That is the whole reason it needs no per-surface
 * recomposition, and a reference that had to be re-homed would be the first sign it
 * had started reading one. */
const REFERENCE = `
  .fx-ref-scroll:focus-visible { outline: var(--ring-scroll); outline-offset: var(--ring-scroll-offset); }
`;

function stage(css, theme, accent) {
  const resolved = desugar(substitute(css + REFERENCE, tokensFor(theme, accent)))
    .replace(/calc\(([-\d.]+)px \+ ([-\d.]+)px\)/g, (_, a, b) => `${Number(a) + Number(b)}px`);
  const html = `<style>${resolved}</style>${SUBJECTS.map((s) => s.markup()).join('')}`
    + '<button class="ui-focusable">Reference</button><span class="fx-ref-scroll"></span>';
  return new JSDOM(html).window;
}

/** The band's two numbers, as a reader would measure them off the box. */
function bandOf(win, el) {
  const style = win.getComputedStyle(el);
  return { outline: style.outline, offset: style.outlineOffset };
}

function check(css, theme, accent) {
  const win = stage(css, theme, accent);
  const focus = (el) => el.setAttribute('data-ui-state', 'focus-visible');
  const ringOf = (selector) => {
    const reference = win.document.querySelector(selector);
    assert.ok(reference, `no ${selector} to read the reference from`);
    focus(reference);
    return reference;
  };
  const outward = win.getComputedStyle(ringOf('.ui-focusable'));
  assert.ok(outward.outline && !/transparent|none/.test(outward.outline),
    'the outward band resolved nothing');
  assert.ok(Number.parseFloat(outward.outlineOffset) > 0,
    'the outward band is no longer drawn outside the border box, so the two are not '
    + 'distinguishable by their offsets and the reading below proves nothing');
  const band = bandOf(win, ringOf('.fx-ref-scroll'));
  assert.ok(band.outline && !/transparent|none/.test(band.outline),
    'the scroll ring resolved no visible outline');

  // The band is where --ring's band is, mirrored inward: --ring-width of ink, its
  // inner edge --ring-gap-width + --ring-width from the box's own edge. Read off the
  // tokens rather than retyped, so retuning the ring moves this with it.
  const tokens = tokensFor(theme, accent);
  const px = (name) => Number.parseFloat(tokens.get(name));
  assert.ok(band.outline.startsWith(`${px('--ring-width')}px solid `),
    `the band is no longer --ring-width of solid ink: ${band.outline}`);
  assert.equal(band.offset, `${-(px('--ring-gap-width') + px('--ring-width'))}px`,
    'the band no longer leaves --ring-gap-width of the surface outside it');

  for (const { name, box, why } of SUBJECTS) {
    const el = win.document.querySelector(box);
    assert.ok(el, `${name}: nothing rendered ${box}`);
    assert.ok(bareOutline(win.getComputedStyle(el)),
      `${name}: ${box} draws a band before anything has focused it`);
    // What every box around it paints at rest, so the reading below is what FOCUS
    // changed rather than what the surface already casts: a card and the three panels
    // all carry an elevation shadow whether or not anything has focus.
    const hosts = [];
    for (let host = el.parentElement; host; host = host.parentElement) {
      const style = win.getComputedStyle(host);
      hosts.push({ host, atRest: { shadow: style.boxShadow, outline: style.outline } });
    }

    focus(el);
    assert.deepEqual(bandOf(win, el), band,
      `${name}: ${box} does not draw the shared band (${why})`);
    // One indicator, not two. Nothing delegates after r30, so no box around this one
    // may answer its focus — the defect #474 found, read from the other end.
    for (const { host, atRest } of hosts) {
      const style = win.getComputedStyle(host);
      assert.deepEqual({ shadow: style.boxShadow, outline: style.outline }, atRest,
        `${name}: ${host.className || host.tagName} draws a second indicator for ${box}`);
    }
    el.removeAttribute('data-ui-state');
    assert.ok(bareOutline(win.getComputedStyle(el)), `${name}: the band outlives the focus`);
  }

  // Anti-vacuity: the subjects are six and the reading above ran on each.
  assert.equal(SUBJECTS.length, 6,
    'the kit draws the inward band on six scroll regions; React\'s modal body is the seventh, '
    + 'in react/src/focus-ring.test.tsx');
  win.close();
}

for (const theme of ['light', 'dark']) for (const accent of ['default', 'ocean']) {
  test(`a scroll region draws the kit's band inward, and only it: ${theme}/${accent}`,
    () => check(source, theme, accent));
}

// Each mutation takes out one declaration the fix rests on, so an edit that drops it
// fails here rather than in a capture nobody re-takes. One per subject, so no subject
// is proved only by its neighbours.
const DROP = (selector) => (css) => css.replace(
  new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:focus-visible \\{[^}]*\\}`), '');

for (const [name, mutate, expected] of [
  ...SUBJECTS.map(({ name, box }) => [
    `the band on ${name}`, DROP(box),
    new RegExp(`${box.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} does not draw the shared band`),
  ]),
  // The one that is not a missing rule: the offset is what draws the band INWARD, and
  // a rule that keeps the outline and loses it paints the band outside the box. The
  // reference keeps its offset — it is appended to the sheets rather than part of them
  // — so the subjects are read against a band that is still in the right place.
  ['the offset that draws the band inward',
    (css) => css.replace(/ outline-offset: var\(--ring-scroll-offset\);/g, ''),
    /does not draw the shared band/],
]) {
  test(`rejects removing ${name}`, () => {
    const mutated = mutate(source);
    assert.notEqual(mutated, source, 'the mutation found its declaration');
    assert.throws(() => check(mutated, 'light', 'default'), expected);
  });
}

// ---- forced colours -------------------------------------------------------
//
// Forced colours drops every box-shadow and repaints the outlines it is left. Until #578
// that was the reason every outward-ring consumer carried `outline: 2px solid
// transparent`: with the shadow gone, the stand-in was the only thing left to repaint,
// and a scroll region owed none because its band already was a real outline. The band is
// an outline everywhere now, so no consumer owes a stand-in and no block corrects one.
//
// What is left to hold is that nothing brings either back — a region given a stand-in and
// a shadow is a region forced colours cannot draw, which is the defect this reading is for
// and which the band check above now catches on its own.
test('nothing is left for forced colours to correct', () => {
  const standIns = [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , body]) => /outline\s*:\s*2px solid transparent/.test(body))
    .map(([, selector]) => selector.trim().replace(/\s+/g, ' '));
  assert.deepEqual(standIns, [],
    'a transparent stand-in outline is back; with the band on the same property it is '
    + 'either silencing the band or waiting to be repainted beside it');
  // One forced-colors block is left in the kit and it is not about focus: #527's
  // underline strip restates its CHOSEN TAB's accent bar in `Highlight`, because the
  // mode repaints an author colour and would otherwise leave that bar in the labels'
  // own ink. A block that declares `outline` or `box-shadow` would be correcting the
  // band instead, which is the thing #578 removed the need for.
  const forced = [...source.replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/@media\s*\(forced-colors:\s*active\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)]
    .map(([, body]) => body);
  assert.equal(forced.length, 1,
    'a forced-colors block was added or removed. The band is a real outline now, so a '
    + 'new block is either a second indicator or a correction for one');
  assert.doesNotMatch(forced[0], /(?:^|[;{\s])(?:outline|box-shadow)\s*:/,
    'the kit\'s one forced-colors block has started correcting a focus indicator; the '
    + 'band is a real outline and the mode repaints it without help');
});

test('rejects a scroll region put back on the retired box-shadow form', () => {
  const mutated = source.replace(
    '.ui-drawer__body:focus-visible { outline: var(--ring-scroll); outline-offset: var(--ring-scroll-offset); }',
    '.ui-drawer__body:focus-visible { outline: 2px solid transparent; box-shadow: var(--ring); }');
  assert.notEqual(mutated, source, 'the mutation found the rule');
  assert.throws(() => check(mutated, 'light', 'default'),
    /\.ui-drawer__body does not draw the shared band/);
});
