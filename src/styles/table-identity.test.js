/* Rule: on a phone a pinned identity cell is one line of identity wide — never a
 * wrapped sliver, never wider than its cap, never narrower than a name. why: #500.
 *
 * Five shapes are mounted under the stylesheet flattened for ONE viewport width —
 * the kit's `rowIdentity()`, a two-word plain cell, a sub-line as bare text, the same
 * sub-line wrapped in a `<span>`, and a sortable header — and every declaration the
 * phone block writes is judged by what it comes to on the element it reaches. A
 * property with no outcome written for it fails, and so does a rule reaching nothing.
 *
 * Limits: JSDOM models no layout, so an outcome is read from the winning declarations
 * rather than a drawn box; Chromium measured those for #500 (a 195px cap cut at its
 * edge, a sub-line of two lines at 45.4px, a focused link's ring whole). The cap's
 * `min()` is evaluated below, because JSDOM reports it as `320px` at every width.
 */
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

/** The shapes a pinned identity cell is built in, mounted under one stylesheet. */
function mountAt(width) {
  const document = dom.window.document;
  document.head.innerHTML = `<style>${sheetAt(CSS, width)}</style>`;
  document.body.innerHTML = `<table class="ui-table ui-table--compact ui-table--sticky ui-table--pinned">
    <thead>
      <tr><th class="ui-table__identity" id="head" scope="col"><button type="button" class="rx-sort" id="sort">Company and registered trading name<svg class="rx-caret" id="caret"></svg></button></th><th class="ui-table__num">Price</th></tr>
    </thead>
    <tbody>
      <tr><td class="ui-table__identity" id="kit">${rowIdentity({ symbol: 'NORT', name: 'Northstar Analytics Incorporated', href: '#company' })}</td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="plain">North region</td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="sub"><div>North region</div><div class="ui-table__code" id="subline">EU-NORTH-1 district office</div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="subel"><div>South region</div><div class="ui-table__code" id="sublineel"><span>EU-SOUTH-2 district office</span></div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="sublink"><div>West region</div><div class="ui-table__code" id="sublinelink"><a href="#office">EU-WEST-3 district office</a></div></td><td class="ui-table__num">1.00</td></tr>
    </tbody></table>`;
  const cells = ['#head', '#kit', '#plain', '#sub', '#subel', '#sublink'];
  const style = (sel) => dom.window.getComputedStyle(typeof sel === 'string' ? document.querySelector(sel) : sel);
  const declared = /--ui-table-identity-max:\s*([^;}]+)/.exec(substitute(decomment(CSS), tokensFor('light', 'default')));
  assert.ok(declared, 'the identity cap property is gone, so a consumer has nothing to retune');
  return { document, cells, style, cap: lengthPx(declared[1], width) };
}

/** A control: its caret, or its ring, sits past the box the cap leaves it, so a clip
 *  removes the mark rather than shortening the words. A box merely HOLDING one is not
 *  on this list — it cuts, and the cut's 16px margin keeps the ring it holds. */
const MARKS = '.ui-identity, a, button, input, select, textarea, svg';
/** What this element is, as far as the outcomes below are concerned. */
const contextOf = (el, cap, declared) => ({
  cap,
  declared,
  cell: el.classList.contains('ui-table__identity'),
  decorative: el.classList.contains('ui-identity__logo'),
  marks: el.matches(MARKS),
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
  'max-width': (v, { cell, cap, declared }) => {
    // JSDOM reports `min(320px, 50vw)` as `320px` at every width, so the cell's own
    // cap is judged from what the stylesheet writes, evaluated above.
    if (cell) return lengthPx(declared, 390) === cap ? null
      : `the cell is capped at ${declared}, which is not the ${cap}px --ui-table-identity-max leaves it`;
    const px = lengthPx(v, 390);
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
  'overflow-clip-margin': (v) => (lengthPx(v, 390) >= 12 ? null
    : `a cut ${v} from the box leaves a focused control no room for its ring`),
  'text-overflow': (v, { cell, marks }) => (marks && !cell
    ? (v === 'clip' ? null : `${v} promises a cut that a box overflowing in the open never draws`)
    : (v === 'ellipsis' ? null : `${v} cuts text without saying so`)),
  // Only the decorative logo is dropped; the column itself has to be drawn.
  display: (v, { decorative }) => (decorative
    ? (v === 'none' ? null : `the logo is back in the narrow column as ${v}`)
    : (v !== 'none' ? null : 'the pinned identity column is not drawn at all')),
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
        const problem = outcome(style(el).getPropertyValue(property), contextOf(el, cap, substitute(value, tokensFor('light', 'default'))));
        assert.equal(problem, null, `${selector} { ${property}: ${value} } on <${el.tagName.toLowerCase()}${el.id ? ` id=${el.id}` : ''}>: ${problem}`);
        judged++;
      }
    }
  }
  assert.ok(judged >= 18, `only ${judged} declarations were judged; the sweep stopped finding its subjects`);
});

test('at 390 the column fits its region, shows a name and is drawn', () => {
  const { document, style, cells, cap } = mountAt(390);

  // Fits: the cap is at most half the viewport, and no floor inside the column can
  // push it past that. Usable: a 13px line of symbol and name needs the rest of it —
  // a 10vw cap renders a 39px column with no name in it, which is #500 again.
  assert.ok(cap <= 195, `the cap leaves the columns beside it no room: ${cap}px of 390`);
  assert.ok(cap >= 156, `the cap is too narrow to hold a line of identity: ${cap}px of 390`);

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
