/* Rule: on a phone a pinned identity cell is one line of identity wide — never a
 * wrapped sliver, never wider than its cap, never narrower than a name.
 * why: docs/components.md#dense-financial-tables, #500 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { substitute, tokensFor } from '../../stories/lib/contrast.js';
import { blockRules, decomment, lengthPx, sheetAt } from '../../stories/lib/css-at-width.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}
const { rowIdentity } = await import('../components/table-values.js');

const CSS = read('src/styles/table.css');

/** Every rule the phone block writes. Which of them are a pinned identity's business
 *  is decided below by what each one REACHES: a rule written on any other class —
 *  `.ui-table__code` is one the kit itself ships — lands inside the cell just the
 *  same, and a name match never sees it. */
function phoneRules() {
  const out = blockRules(CSS, '@media (max-width: 720px)');
  const written = out.reduce((n, rule) => n + rule.declarations.length, 0);
  assert.ok(written >= 18, `the phone block is down to ${written} declarations; what is no longer written is no longer measured`);
  return out;
}

/**
 * The shapes a pinned identity cell is built in, mounted under one stylesheet flattened
 * for ONE viewport width: the kit's `rowIdentity()`, marked `.ui-table__linked` — the shape
 * the column and the cell fill meet on — a marked cell holding a BARE link, the other shape
 * the fill is written for, a two-word plain cell, a sub-line as bare text, the same in a
 * `<span>`, one around a link, a sortable header, and two kit anchors keeping their own box,
 * a `.ui-btn` of words alone and a `.ui-nav__item` holding artwork. `extra` composes another
 * modifier onto the same shapes, and `css` mounts the mutations below as the stylesheet is.
 * Limit: JSDOM models no layout, so every outcome below is read from the cascade and not
 * from a drawn box. Chromium measured the boxes for #500 — a 195px cap cut at its edge, a
 * sub-line of two lines at 45.4px, a focused link's ring whole.
 */
function mountAt(width, extra = '', css = CSS) {
  const document = dom.window.document;
  // The cap is the one length here that a viewport evaluates, and JSDOM reports
  // `min(320px, 50vw)` as `320px` at every width. So it is worked out for this width and
  // written into the sheet before it is mounted: what the cascade then leaves on a cell
  // is the cap a phone of this width gets, whichever rule wins it — or nothing, if no
  // rule writes it any more.
  const declared = /--ui-table-identity-max:\s*([^;}]+)/.exec(substitute(decomment(css), tokensFor('light', 'default')));
  assert.ok(declared, 'the identity cap property is gone, so a consumer has nothing to retune');
  const cap = lengthPx(declared[1].trim(), width);
  document.head.innerHTML = `<style>${sheetAt(css, width).replaceAll(declared[1].trim(), `${cap}px`)}</style>`;
  document.body.innerHTML = `<table class="ui-table ui-table--compact ui-table--sticky ui-table--pinned ${extra}">
    <thead>
      <tr><th class="ui-table__identity" id="head" scope="col"><button type="button" class="rx-sort" id="sort">Company and registered trading name<svg class="rx-caret" id="caret"></svg></button></th><th class="ui-table__num">Price</th></tr>
    </thead>
    <tbody>
      <tr><td class="ui-table__identity ui-table__linked" id="kit">${rowIdentity({ symbol: 'NORT', name: 'Northstar Analytics Incorporated', href: '#company' })}</td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity ui-table__linked" id="bare"><a href="#company">Cedar Infrastructure Holdings International</a></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="plain">North region</td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="sub"><div>North region</div><div class="ui-table__code" id="subline">EU-NORTH-1 district office</div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="subel"><div>South region</div><div class="ui-table__code" id="sublineel"><span>EU-SOUTH-2 district office</span></div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="sublink"><div>West region</div><div class="ui-table__code" id="sublinelink"><a href="#office">EU-WEST-3 district office</a></div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="btn"><a class="ui-btn ui-btn--sm" href="#company" id="btnlink">Open the registered trading name</a></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="nav"><a class="ui-nav__item" href="#company" id="navlink"><svg class="ui-nav__ic"></svg>Open the registered trading name</a></td><td class="ui-table__num">1.00</td></tr>
    </tbody></table>`;
  const cells = ['#head', '#kit', '#bare', '#plain', '#sub', '#subel', '#sublink', '#btn', '#nav'];
  const style = (sel) => dom.window.getComputedStyle(typeof sel === 'string' ? document.querySelector(sel) : sel);
  return { document, cells, style, cap };
}

/** A control: its caret, or its ring, sits past the box the cap leaves it, so a clip
 *  removes the mark rather than shortening the words. A box merely HOLDING one is not
 *  on this list — it cuts, and the cut's 16px margin keeps the ring it holds. A bare
 *  link is not on it either: the fill draws its ring INWARD, so it has nothing standing
 *  past its box, and left on the list it came out cut mid-word over the next column. #513 */
const MARKS = '.ui-identity, button, input, select, textarea, svg';
/** What this element is, as far as the outcomes below are concerned. */
const contextOf = (el, cap) => ({
  cap,
  cell: el.classList.contains('ui-table__identity'),
  decorative: el.classList.contains('ui-identity__logo'),
  marks: el.matches(MARKS),
  // An anchor the kit styles keeps its own box in the cell, and it is the focusable
  // itself: nothing but its own ring stands outside it, and a ring is drawn outside its
  // own clip. So it needs none of the 16px the boxes around it keep. #513
  ownBox: el.matches('a[class]:not(.ui-identity)'),
});

/**
 * What a declaration has to come to on the element it reaches. Keyed by property and
 * judged on the winning value, so a rule added to the block is held to the same
 * outcome as the rule beside it — and a property nothing here judges fails the sweep.
 */
const OUTCOME = {
  // The column takes its content, never a share of a table wider than the screen.
  width: (v) => (/^\d+(?:\.\d+)?%$/.test(v) && parseFloat(v) <= 1 ? null
    : `a column sized ${v} no longer takes its content`),
  'max-width': (v, { cell, cap }) => {
    const px = lengthPx(v, 390);
    if (cell) return px === cap ? null
      : `the cell is capped at ${v}, which is not the ${cap}px --ui-table-identity-max leaves it`;
    return v.trim() === '100%' || (px !== null && px >= cap) ? null
      : `${v} caps this away from the cell it sits in, so a name loses room the cell has`;
  },
  // A floor wider than the ceiling is the sliver again: the column outgrows its
  // region, and what is inside it can no longer shrink far enough to show an ellipsis.
  'min-width': (v, { cell, cap }) => {
    const px = lengthPx(v, 390);
    // Inside the cell a percentage floor is bounded by the cell; on the cell itself it
    // measures against a table that is wider than the screen on purpose.
    if (px === null) return cell && parseFloat(v) > 0
      ? `a floor of ${v} on the cell measures against the table, which is wider than the screen`
      : null;
    return px <= cap ? null : `a floor of ${v} forces a pinned identity past its ${cap}px cap`;
  },
  'white-space': (v) => (v === 'nowrap' ? null : `${v} wraps, which is the sliver #500 reported`),
  // The cell itself always cuts — that is the cap. Inside it, a box carrying a mark
  // must not, because a clip removes the mark rather than shortening it.
  overflow: (v, { cell, marks }) => (marks && !cell
    ? (v === 'visible' ? null : `${v} cuts a box carrying a mark, which takes the mark`)
    : (['clip', 'hidden'].includes(v) ? null : `${v} lets text run past the cap`)),
  // A kit anchor's own cut is flush with its border. The zero is held to a UNIT, because
  // Chromium drops a unitless one for this property and leaves the 16px standing: measured
  // in Chromium for #513, where the declaration read `0` and the box still cut at 16px.
  'overflow-clip-margin': (v, { ownBox }) => (ownBox
    ? (v.trim() === '0px' ? null
      : `a kit anchor cut ${v} from its own border paints its last glyphs over the column beside it`)
    : (lengthPx(v, 390) >= 12 ? null
      : `a cut ${v} from the box leaves a focused control no room for its ring`)),
  'text-overflow': (v, { cell, marks }) => (marks && !cell
    ? (v === 'clip' ? null : `${v} promises a cut that a box overflowing in the open never draws`)
    : (v === 'ellipsis' ? null : `${v} cuts text without saying so`)),
  // Only the decorative logo is dropped; the column itself has to be drawn.
  display: (v, { decorative }) => (decorative
    ? (v === 'none' ? null : `the logo is back in the narrow column as ${v}`)
    : (v !== 'none' ? null : 'the pinned identity column is not drawn at all')),
  // A block box is what carries the cut: `text-overflow` is a block container's
  // property, and the fill's flex box holds its text in an anonymous item no ellipsis
  // reaches. Measured in Chromium: flex cut "…Holdings Inte" with no ellipsis. #513
  'align-content': (v) => (v === 'center' ? null
    : `${v} drops the filled link's line to the top of a row taller than one line`),
  // The two ways #500 hid the name: out of flow, or clipped to nothing.
  position: (v) => (['static', 'relative', 'sticky'].includes(v) ? null
    : `${v} takes this out of the row, which is how the name was hidden before #500`),
  'clip-path': (v) => (['', 'none'].includes(v) ? null : `${v} clips this out of view`),
};

test('at 390 every rule that reaches a pinned identity comes to the outcome it is written for', () => {
  const { document, style, cap } = mountAt(390);
  let judged = 0;
  for (const { selector, declarations } of phoneRules()) {
    // Reach, not spelling: everything the rule matches that lives in a pinned
    // identity cell, the cell itself included.
    const reached = [...document.querySelectorAll(selector)].filter((el) => el.closest('.ui-table__identity'));
    if (!reached.length) {
      assert.ok(!selector.includes('identity'),
        `${selector} names the pinned identity and reaches nothing among the shapes mounted here`);
      continue;
    }
    for (const { property, value } of declarations) {
      const outcome = OUTCOME[property];
      assert.ok(outcome, `nothing here judges what ${property} does to a pinned identity`);
      for (const el of reached) {
        const problem = outcome(style(el).getPropertyValue(property), contextOf(el, cap));
        assert.equal(problem, null, `${selector} { ${property}: ${value} } on <${el.tagName.toLowerCase()}${el.id ? ` id=${el.id}` : ''}>: ${problem}`);
        judged++;
      }
    }
  }
  assert.ok(judged >= 18, `only ${judged} declarations were judged; the sweep stopped finding its subjects`);
});

/** The phone widths #500 was reported and measured at: the step itself, and the
 *  narrowest screen the kit draws for. */
const PHONE_WIDTHS = [390, 320];
/** The shapes `mountAt` builds a pinned identity cell in, header included. */
const SHAPES = 9;

/**
 * The cap the column is held to at one width, and the cells held to it — read from the
 * cascade rather than from the declaration that writes it, because the sweep above can
 * only judge declarations that are still written. A pure function of the stylesheet, so
 * the mutations at the foot of this file go through exactly this check.
 * why: #500, and the review that deleted the cap and lost nothing
 */
function capProblems(css, width) {
  const { document, style, cap } = mountAt(width, '', css);
  const problems = [];
  // Fits: at most half the viewport, so the columns beside it keep a share worth
  // reading. Usable: a 13px line of symbol and name needs the rest of it — a 10vw cap
  // renders a 39px column with no name in it, which is #500 again.
  if (!Number.isFinite(cap)) problems.push(`the cap comes to ${cap} at ${width}, which is no ceiling at all`);
  else if (cap > width / 2) problems.push(`the cap leaves the columns beside it no room: ${cap}px of ${width}`);
  else if (cap < 156) problems.push(`the cap is too narrow to hold a line of identity: ${cap}px of ${width}`);

  // Discovered rather than listed, and counted: a mount that stops producing the shapes
  // would otherwise measure an empty document and report nothing.
  const found = [...document.querySelectorAll('.ui-table__identity')];
  if (found.length < SHAPES) problems.push(`only ${found.length} of ${SHAPES} pinned identity cells were measured at ${width}`);
  // Limit: JSDOM draws no boxes, so this is the ceiling the cascade leaves the cell, not
  // a drawn width. Chromium draws the capped cell at 195px at 390 and 160px at 320, and
  // at 309px with the cap taken off it.
  for (const cell of found) {
    const held = style(cell).maxWidth.trim();
    if (lengthPx(held, width) !== cap) {
      problems.push(`#${cell.id || cell.tagName.toLowerCase()} is held to ${held || 'no cap'} at ${width}, not the ${cap}px the column has`);
    }
  }
  return problems;
}

test('every pinned identity cell is held to the column\'s cap at both phone widths', () => {
  for (const width of PHONE_WIDTHS) assert.deepStrictEqual(capProblems(CSS, width), [], `at ${width}`);
});

test('at 390 the column fits its region, shows a name and is drawn', () => {
  const { document, style, cells, cap } = mountAt(390);

  // The cap's own size, and the cells it has to hold, are required above at both phone
  // widths. What this test adds is that nothing inside the column defeats it.
  // The cell AND everything living in it: a rule written on a sub-line's own class
  // hides, unwraps or widens the column just as surely as one written on the cell.
  for (const cell of cells) {
    for (const el of [document.querySelector(cell), ...document.querySelectorAll(`${cell} *`)]) {
      const where = `${cell} <${el.tagName.toLowerCase()}${el.id ? ` id=${el.id}` : ''}>`;
      // JSDOM resolves no inheritance, so an empty value is a property this
      // stylesheet leaves to the cell above — only a value written here can be wrong.
      const box = style(el);
      assert.ok(['', 'nowrap'].includes(box.whiteSpace), `${where} wraps at ${box.whiteSpace}`);
      assert.ok((lengthPx(box.minWidth, 390) ?? 0) <= cap, `${where} has a floor past the cap: ${box.minWidth}`);
      assert.notEqual(box.visibility, 'hidden', `${where} is drawn invisible`);
      assert.ok(['', 'static', 'relative', 'sticky'].includes(box.position), `${where} is out of the row at ${box.position}`);
      assert.ok(['', 'none'].includes(box.clipPath), `${where} is clipped out of view`);
      // The decorative logo is the one thing the narrow column drops.
      if (!el.classList.contains('ui-identity__logo') && !el.closest('.ui-identity__logo')) {
        assert.notEqual(box.display, 'none', `${where} is not drawn`);
      }
    }
  }

  // The name: drawn, given the whole cell, and cut with an ellipsis when it passes it.
  const name = style('#kit .ui-identity__name');
  assert.equal(name.whiteSpace, 'nowrap', 'the name wraps inside the cell');
  assert.equal(name.textOverflow, 'ellipsis', 'a long name is cut without saying so');
  assert.equal(name.maxWidth.trim(), '100%', 'the name is capped away from the link it sits in');
  assert.ok((lengthPx(name.minWidth, 390) ?? 0) <= cap, `the name has a floor past the cap, so it can never reach an ellipsis: ${name.minWidth}`);
  assert.notEqual(name.position, 'absolute', 'the name is hidden again rather than shown on one line');
  assert.ok(['', 'none'].includes(name.clipPath), 'the name is clipped out of view rather than shown');
  assert.notEqual(name.display, 'none', 'the name is not drawn');

  // The link holding it takes the whole cell, and the logo stays out of the column.
  assert.equal(style('#kit .ui-identity').maxWidth.trim(), '100%', 'the identity link is capped away from the cell it sits in');
  assert.equal(style('#kit .ui-identity__logo').display, 'none', 'the logo is back in the narrow column');

  // A sub-line cuts itself with an ellipsis whatever holds its text — bare, in a
  // `<span>`, or around a link, which keeps its ring through the cut's 16px margin.
  // Only a control itself keeps its own layout, because its marks sit past its box.
  for (const subLine of ['#subline', '#sublineel', '#sublinelink']) {
    assert.equal(style(subLine).textOverflow, 'ellipsis', `${subLine} is cut without saying so`);
    assert.ok(['clip', 'hidden'].includes(style(subLine).overflow), `${subLine} runs past the cap`);
  }
  const sort = style('#sort');
  assert.equal(sort.maxWidth.trim(), '100%', 'a sort button is not held to the cell it sits in');
  assert.ok(['', 'visible'].includes(sort.overflow), `a sort button is clipped, which takes its caret: ${sort.overflow}`);
});

test('at 1280 the phone rules are off and the desktop identity is what it was', () => {
  const { style, cells } = mountAt(1280);
  for (const cell of cells) {
    assert.equal(style(cell).maxWidth.trim(), 'none', `${cell} took the phone cap to the desktop`);
    assert.ok(['', 'clip'].includes(style(cell).textOverflow), `${cell} cuts its text on the desktop`);
  }
  // The desktop composition, unchanged by #500: the name wraps inside its own cap and
  // the logo is drawn.
  assert.equal(style('#kit .ui-identity__name').whiteSpace, 'normal', 'the desktop name stopped wrapping');
  assert.notEqual(style('#kit .ui-identity__logo').display, 'none', 'the desktop lost the identity logo');
});

/**
 * What the same declaration has to come to once the row is a card (#499). The cap and
 * its cut exist because the pinned column is narrow; a card is as wide as the row, so
 * every one of them has to be off. Two properties are judged as no-ops, each for a
 * stated reason rather than because nothing was written for them.
 */
const STACKED_OUTCOME = {
  'white-space': (v) => (['', 'normal'].includes(v) ? null
    : `${v} holds a card's heading to one line, so a long name leaves the card`),
  'max-width': (v) => (['', 'none', '100%'].includes(v.trim()) ? null
    : `${v} caps a heading that has the whole card to sit in`),
  'min-width': (v) => ((lengthPx(v, 390) ?? 0) === 0 ? null
    : `a floor of ${v} is the pinned column's, and there is no column left`),
  width: (v) => (['', 'auto'].includes(v) ? null
    : `${v} sizes a cell that is now one line of the card`),
  overflow: (v) => (['', 'visible'].includes(v) ? null
    : `${v} puts a clip box around a heading with nothing to clip, and it reaches the ring`),
  'text-overflow': (v) => (['', 'clip'].includes(v) ? null
    : `${v} promises a cut that a wrapping card never draws`),
  // Inert once nothing clips, and left written so the narrow column keeps its 16px.
  'overflow-clip-margin': () => null,
  // Inert in a card: the link's height is its own line there, so there is no box to
  // centre a line in. Left written for the column, which has one.
  'align-content': () => null,
  // The decorative logo stays out of a stacked card too. That is #499's call about the
  // card, not #500's about the column, so this sweep does not reopen it.
  display: () => null,
};

test('at 390 a stacked row takes the pinned column\'s one-line rules back off', () => {
  const { document, style } = mountAt(390, 'ui-table--stack');
  // The header row is clipped out of the card and kept only for the accessibility
  // tree, so what the phone block leaves on a 1px box cannot be read or drawn. The
  // exclusion is earned here rather than assumed: a header that comes back into the
  // card fails this, and every shape in it is swept again.
  const head = style(document.querySelector('thead'));
  assert.equal(head.clipPath, 'inset(50%)', `a stacked thead is drawn in the card at ${head.clipPath}`);
  assert.equal(head.position, 'absolute', `a stacked thead is in the card's flow at ${head.position}`);

  let judged = 0;
  for (const { selector, declarations } of phoneRules()) {
    const reached = [...document.querySelectorAll(selector)]
      .filter((el) => el.closest('.ui-table__identity') && !el.closest('thead'));
    if (!reached.length) continue;
    for (const { property, value } of declarations) {
      const outcome = STACKED_OUTCOME[property];
      assert.ok(outcome, `nothing here judges what ${property} does to a stacked row's heading`);
      for (const el of reached) {
        const problem = outcome(style(el).getPropertyValue(property));
        assert.equal(problem, null, `${selector} { ${property}: ${value} } still reaches a stacked row on <${el.tagName.toLowerCase()}${el.id ? ` id=${el.id}` : ''}>: ${problem}`);
        judged++;
      }
    }
  }
  // The same floor the narrow sweep carries: a reset that stops reaching these shapes
  // leaves the rules above it unmeasured rather than passing.
  assert.ok(judged >= 18, `only ${judged} declarations were judged against a stacked row`);

  // The one a reader of #499 would look for: the name is what the card is about.
  const name = style('#kit .ui-identity__name');
  assert.ok(['', 'normal'].includes(name.whiteSpace), `a stacked card's name is held at ${name.whiteSpace}`);
  assert.equal(name.maxWidth.trim(), 'none', 'a stacked card\'s name keeps the narrow column\'s cap');
});

/* -- The linked identity, which the column and the cell fill meet on --------- */

/**
 * `#kit` is marked `.ui-table__linked`, so its link is the row's handle: below the fold the
 * cell hands its padding over and the link's box is the cell's, and in a stacked card there
 * is no column left to fill, so the fill comes back off.
 * why: docs/components.md#dense-financial-tables, #500
 *
 * Limits: JSDOM draws no boxes, so these are the values the cascade leaves; Chromium
 * measured the card for #500. Which ring each shape takes is read in
 * src/styles/table-focus.test.js, because `:focus-visible` matches nothing here.
 */
const SIDES = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];
const padding = (box) => SIDES.map((side) => box[side]).join(' ');

/** Every way the fill reaches the linked identity wrongly, at the phone width. A pure
 *  function of the stylesheet, so the mutations below go through exactly this check. */
function fillProblems(css) {
  const problems = [];

  const narrow = mountAt(390, '', css);
  const cell = narrow.style('#kit');
  const link = narrow.style('#kit .ui-identity');
  if (padding(cell) !== '0px 0px 0px 0px') {
    problems.push(`the narrow cell keeps ${padding(cell)} while its link takes a padding too, so the two stack`);
  }
  if (cell.height !== '1px') {
    problems.push(`the narrow cell states a height of ${cell.height || 'its own content'}, which leaves the link short of a row a taller sibling grew`);
  }
  if (link.display !== 'flex' || link.width !== '100%' || link.height !== '100%') {
    problems.push(`the narrow link is ${link.display} at ${link.width} by ${link.height}, so its box stops at its text`);
  }
  // Moved rather than replaced: the sides the link takes are the sides an unmarked cell of
  // the same density, at the same position in the row, is drawn with.
  if (padding(link) !== padding(narrow.style('#plain'))) {
    problems.push(`the link is padded ${padding(link)} where an unmarked cell is ${padding(narrow.style('#plain'))}, so the name has moved`);
  }

  // The BARE link, whose words the cell's own ellipsis can never reach: the cell
  // overflows by the link's box, not by a line of its own, so the cut has to be the
  // link's. It takes the same box as the identity link above and cuts inside it. #513
  const bare = narrow.style('#bare a');
  if (bare.width !== '100%' || bare.height !== '100%') {
    problems.push(`the bare link is ${bare.width} by ${bare.height}, so its ring stops at its text rather than outlining the cell`);
  }
  if (padding(bare) !== padding(narrow.style('#plain'))) {
    problems.push(`the bare link is padded ${padding(bare)} where an unmarked cell is ${padding(narrow.style('#plain'))}, so the name has moved`);
  }
  if (!['clip', 'hidden'].includes(bare.overflow)) {
    problems.push(`the bare link overflows in the open at ${bare.overflow}, so a long name paints past the pinned column`);
  }
  if (bare.textOverflow !== 'ellipsis') {
    problems.push(`the bare link is cut at ${bare.textOverflow || 'the cell edge'} rather than ellipsised, so a name ends mid-word`);
  }
  // Chromium draws no ellipsis for a flex box: its text is an anonymous item, and
  // `text-overflow` is a block container's property. Measured for #513.
  if (bare.display !== 'block') {
    problems.push(`the bare link is ${bare.display}, and only a block container draws the ellipsis it is promised`);
  }
  if (bare.alignContent !== 'center') {
    problems.push(`the bare link aligns its line ${bare.alignContent || 'at the top'}, which the flex box it replaces centred`);
  }

  const card = mountAt(390, 'ui-table--stack', css);
  const cardCell = card.style('#kit');
  const cardLink = card.style('#kit .ui-identity');
  if (padding(cardLink) !== '0px 0px 0px 0px') {
    problems.push(`in a card the link keeps ${padding(cardLink)} of the fill, which stands its name off the card's own text edge`);
  }
  if (cardCell.height === '1px') {
    problems.push('in a card the marked cell is still held to one pixel, which a block cell takes as a height');
  }
  if (cardLink.width === '100%') {
    problems.push('in a card the link is still told to fill a column that is no longer there');
  }
  const cardBare = card.style('#bare a');
  if (padding(cardBare) !== '0px 0px 0px 0px' || cardBare.width === '100%') {
    problems.push(`in a card the bare link keeps ${padding(cardBare)} at ${cardBare.width} of the fill, which stands its name off the card's own text edge`);
  }
  if (!['', 'visible'].includes(cardBare.overflow)) {
    problems.push(`in a card the bare link still clips at ${cardBare.overflow}, where the name has the whole card to wrap in`);
  }
  return problems;
}

test('a marked identity link takes the whole cell below the fold and gives it back in a card', () => {
  assert.deepStrictEqual(fillProblems(CSS), []);
});

/** The card's undo, and the handover it undoes, each taken away on its own. The first two
 *  are the defect the review of #500 measured: a linked identity in a stacked card stood a
 *  step right of the other cells' text edge, and its row changed height. */
const FILL_MUTATIONS = [
  ["the card's undo of the fill deleted, so the link keeps the padding the cell gave up",
    (css) => css.replace(`  .ui-table.ui-table--stack > tbody > tr > td.ui-table__linked > :is(a:not([class]), a.ui-identity):only-child {
    width: auto; height: auto; padding: 0;
  }
`, '')],
  ["the card's undo of the cell's stated height deleted, so a block cell is one pixel tall",
    (css) => css.replace('  .ui-table.ui-table--stack > tbody > tr > td.ui-table__linked'
      + ':has(> :is(a:not([class]), a.ui-identity):only-child) { height: auto; }\n', '')],
  ['the handover deleted, so the cell and the link both draw a padding',
    (css) => css.replace('.ui-table td.ui-table__linked'
      + ':has(> :is(a:not([class]), a.ui-identity):only-child) { padding: 0; height: 1px; }\n', '')],
  // #513's defect, and the two rules that answer it, each taken away on its own.
  ['the bare link put back on the carve-out list, so the cap never cuts its words',
    (css) => css.replace('.ui-table--pinned .ui-table__identity > :is(.ui-identity, button, input, select, textarea, svg) {',
      '.ui-table--pinned .ui-table__identity > :is(.ui-identity, a, button, input, select, textarea, svg) {')],
  ['the filled bare link left a flex box, whose text no ellipsis shortens',
    (css) => css.replace('    display: block;\n    align-content: center;\n', '')],
  ['the block box kept and its line left at the top of the row',
    (css) => css.replace('    align-content: center;\n', '')],
  ['the fill padded with a step the cell never had',
    (css) => css.replace('.ui-table--compact td.ui-table__linked > :is(a:not([class]), a.ui-identity):only-child '
      + '{ padding: var(--space-1) var(--space-3); }',
    '.ui-table--compact td.ui-table__linked > :is(a:not([class]), a.ui-identity):only-child '
      + '{ padding: var(--space-2) var(--space-3); }')],
];

test('the gate rejects every way the fill reaches a linked identity wrongly', () => {
  const survived = [];
  for (const [what, mutate] of FILL_MUTATIONS) {
    const mutated = mutate(CSS);
    assert.notEqual(mutated, CSS, `the mutation "${what}" no longer matches table.css, so it proves nothing`);
    if (fillProblems(mutated).length === 0) survived.push(what);
  }
  assert.deepStrictEqual(survived, [], 'a mutation passed this gate unnoticed');
});

/* -- The anchors that keep their own box in the cell ------------------------ */

/**
 * `.ui-btn`, `.ui-nav__item`, a dropdown row and a crumb keep the box their own component
 * sets, and each is a flex box the cell's cut reaches no words of: `text-overflow` is a
 * block container's property. What each has to come to is the cut inside its own border,
 * and the ellipsis where it holds nothing but words. A pure function of the stylesheet, so
 * the mutations below go through exactly this check.
 * Limits: this mount carries table.css alone, so the flex box button.css and nav.css give
 * these anchors is invisible here. Chromium measured both at 390 in a 195px column for
 * #513: `a.ui-btn` cut at both ends, `a.ui-nav__item` cut with no mark, each 16px outside
 * its own border.
 */
function ownBoxProblems(css) {
  const { style } = mountAt(390, '', css);
  const problems = [];
  // The one fact read from the source rather than from the cascade: whether the zero
  // carries a unit. JSDOM normalises `0` to `0px` and Chromium does the opposite — it
  // drops the declaration and leaves the cell's 16px standing, which is what #513 is.
  const written = /a\[class\]:not\(\.ui-identity\)\s*\{[^}]*overflow-clip-margin:\s*([^;}]+)/
    .exec(decomment(css));
  if (!written) problems.push('nothing takes the cell\u2019s 16px off a kit anchor, so its cut reaches past its own border');
  else if (!/^0(?:px|rem|em)$/.test(written[1].trim())) {
    problems.push(`the anchor\u2019s cut is written \`${written[1].trim()}\`, and Chromium drops a unitless zero for this property`);
  }
  for (const [id, holds] of [['#btnlink', 'words'], ['#navlink', 'artwork']]) {
    const box = style(id);
    const margin = box.getPropertyValue('overflow-clip-margin');
    if (margin.trim() !== '0px') {
      problems.push(`the anchor holding ${holds} cuts ${margin || 'at the cell\u2019s margin'} outside its own border, which paints its last glyphs over the column beside it`);
    }
    if (!['clip', 'hidden'].includes(box.overflow)) {
      problems.push(`the anchor holding ${holds} overflows in the open at ${box.overflow}, so a long label runs past the cap`);
    }
  }
  // Words alone: a block container, so the ellipsis it is promised is drawn. `inline-block`
  // rather than `block`, because the width is each component's own — a `.ui-btn` hugs its
  // label where a nav row declares `width: 100%`, and a block box would stretch the first
  // one to the cap.
  const words = style('#btnlink');
  if (words.display !== 'inline-block') {
    problems.push(`the anchor holding nothing but words is ${words.display || 'left the flex box its component sets'}, which draws no ellipsis at a width its component chose`);
  }
  if (words.textOverflow !== 'ellipsis') {
    problems.push(`the anchor holding nothing but words is cut at ${words.textOverflow || 'the cell edge'} rather than ellipsised, so its label ends mid-word`);
  }
  // Artwork beside them: the flex box stays, because a block box would drop the artwork onto
  // a line of its own and lose the gap between the two. It cuts inside its border instead.
  const artwork = style('#navlink');
  if (artwork.display === 'inline-block' || artwork.display === 'block') {
    problems.push(`the anchor holding artwork is ${artwork.display}, which stands its artwork on a line of its own`);
  }
  return problems;
}

test('a kit anchor in the capped cell cuts inside its own border, and ellipsises its words', () => {
  assert.deepStrictEqual(ownBoxProblems(CSS), []);
});

/** Each way #513's second defect comes back, taken away one at a time. */
const OWN_BOX_MUTATIONS = [
  ['the 16px left on the anchor, so its cut paints over the column beside it',
    (css) => css.replace('.ui-table--pinned .ui-table__identity > a[class]:not(.ui-identity) '
      + '{ overflow-clip-margin: 0px; }\n', '')],
  ['the anchor left the flex box its component sets, whose words no ellipsis shortens',
    (css) => css.replace('.ui-table--pinned .ui-table__identity > a[class]:not(.ui-identity):not(:has(> *)) '
      + '{ display: inline-block; }\n', '')],
  ['the anchor made a block box, which stretches a button that sizes itself to its label',
    (css) => css.replace(':not(:has(> *)) { display: inline-block; }', ':not(:has(> *)) { display: block; }')],
  ['the box rewritten for every anchor, which puts a nav row\u2019s artwork on a line of its own',
    (css) => css.replace('a[class]:not(.ui-identity):not(:has(> *)) { display: inline-block; }',
      'a[class]:not(.ui-identity) { display: inline-block; }')],
  ['the cut written as a unitless zero, which Chromium drops for this property',
    (css) => css.replace('a[class]:not(.ui-identity) { overflow-clip-margin: 0px; }',
      'a[class]:not(.ui-identity) { overflow-clip-margin: 0; }')],
  ['the anchors taken off the cut entirely, so a long label runs past the cap',
    (css) => css.replace('  .ui-table--pinned .ui-table__identity > * {',
      '  .ui-table--pinned .ui-table__identity > :not(a[class]) {')],
];

test('the gate rejects every way a kit anchor loses its cut or its ellipsis', () => {
  const survived = [];
  for (const [what, mutate] of OWN_BOX_MUTATIONS) {
    const mutated = mutate(CSS);
    assert.notEqual(mutated, CSS, `the mutation "${what}" no longer matches table.css, so it proves nothing`);
    if (ownBoxProblems(mutated).length === 0) survived.push(what);
  }
  assert.deepStrictEqual(survived, [], 'a mutation passed this gate unnoticed');
});

/* -- The gate's own gate ---------------------------------------------------- */

/**
 * Each way the cap goes missing while the phone block still reads as if it were there.
 * The first is the one the review of #500 made: a tidy-up takes the declaration out, the
 * sweep has one fewer declaration to judge rather than a missing cap to report, and
 * Chromium grows the cell to its content.
 */
const CAP_MUTATIONS = [
  ['the cap deleted from the cell',
    (css) => css.replace('    max-width: var(--ui-table-identity-max);\n', '')],
  ['the cap turned off again further down the same block',
    (css) => css.replace('  .ui-table--pinned .ui-identity__logo { display: none; }',
      '  .ui-table--pinned .ui-table__identity { max-width: none; }\n  .ui-table--pinned .ui-identity__logo { display: none; }')],
  ['the cap written as a share of a table that is wider than the screen',
    (css) => css.replace('max-width: var(--ui-table-identity-max);', 'max-width: 100%;')],
  ['the cap spent on --panel-sm alone, which is more than half of either phone width',
    (css) => css.replace('--ui-table-identity-max: min(var(--panel-sm), 50vw)',
      '--ui-table-identity-max: var(--panel-sm)')],
  ['the whole one-line block moved to the step above the fold',
    (css) => css.replace('@media (max-width: 720px) {', '@media (min-width: 721px) {')],
];

test('the gate rejects every way the identity cap has to be lost', () => {
  const survived = [];
  for (const [what, mutate] of CAP_MUTATIONS) {
    const mutated = mutate(CSS);
    assert.notEqual(mutated, CSS,
      `the mutation "${what}" no longer matches table.css, so it proves nothing`);
    if (PHONE_WIDTHS.every((width) => capProblems(mutated, width).length === 0)) survived.push(what);
  }
  assert.deepStrictEqual(survived, [], 'a mutation passed this gate unnoticed');
});
