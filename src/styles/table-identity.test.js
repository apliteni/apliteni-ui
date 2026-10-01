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

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}
const { rowIdentity } = await import('../components/table-values.js');

const CSS = read('src/styles/table.css');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/** `(max-width: 720px)`, `(min-width: 721px)` and their conjunctions. Anything else
 *  is a case this gate cannot judge, so it stops rather than passing over it. */
function mediaApplies(condition, width) {
  return condition.split(/\s+and\s+/).map((part) => part.trim()).every((part) => {
    const m = /^\((max|min)-width:\s*(\d+(?:\.\d+)?)px\)$/.exec(part);
    assert.ok(m, `table.css asks a media condition this gate cannot evaluate: ${part}`);
    return m[1] === 'max' ? width <= Number(m[2]) : width >= Number(m[2]);
  });
}

/** The stylesheet as it stands at one viewport width: top-level rules in source
 *  order, with the body of every media block that applies spliced in at its place. */
function sheetAt(width) {
  const css = decomment(CSS);
  let out = '';
  for (let i = 0; i < css.length;) {
    const at = css.indexOf('@media', i);
    if (at < 0) { out += css.slice(i); break; }
    out += css.slice(i, at);
    const open = css.indexOf('{', at);
    const condition = css.slice(at + '@media'.length, open).trim();
    let depth = 1;
    let end = open + 1;
    for (; end < css.length && depth; end++) {
      if (css[end] === '{') depth++;
      else if (css[end] === '}') depth--;
    }
    if (mediaApplies(condition, width)) out += css.slice(open + 1, end - 1);
    i = end;
  }
  return substitute(out, tokensFor('light', 'default'));
}

/** A CSS length in px at a viewport width. `min()` is evaluated here because JSDOM
 *  reports `min(320px, 50vw)` as `320px` whatever the width is. */
function lengthPx(value, width) {
  const text = String(value).trim();
  // Percentages and keywords resolve against a box JSDOM never lays out; the callers
  // read those as "no px floor or ceiling of its own" and judge them by their text.
  if (text === '' || text === 'none' || text === 'auto' || text.endsWith('%')) return null;
  const min = /^min\((.+)\)$/.exec(text);
  const parts = (min ? min[1] : text).split(',').map((p) => p.trim());
  const lengths = parts.map((part) => {
    const px = /^(-?\d+(?:\.\d+)?)px$/.exec(part);
    if (px) return Number(px[1]);
    const vw = /^(-?\d+(?:\.\d+)?)vw$/.exec(part);
    assert.ok(vw, `a length this gate cannot evaluate: ${part}`);
    return (Number(vw[1]) / 100) * width;
  });
  return Math.min(...lengths);
}

/** Every declaration the phone block writes on a pinned identity. */
function phoneIdentityDeclarations() {
  const css = decomment(CSS);
  const at = css.indexOf('@media (max-width: 720px)');
  assert.ok(at > 0, 'the phone block for pinned identities is gone from table.css');
  const open = css.indexOf('{', at);
  let depth = 1;
  let end = open + 1;
  for (; end < css.length && depth; end++) {
    if (css[end] === '{') depth++;
    else if (css[end] === '}') depth--;
  }
  const out = [];
  for (const [, selector, body] of css.slice(open + 1, end - 1).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selector.includes('identity')) continue;
    for (const declaration of body.split(';')) {
      const i = declaration.indexOf(':');
      if (i < 0) continue;
      out.push({ selector: selector.trim(), property: declaration.slice(0, i).trim(), value: declaration.slice(i + 1).trim() });
    }
  }
  assert.ok(out.length >= 10, `the phone block is down to ${out.length} declarations; what is no longer written is no longer measured`);
  return out;
}

/** The shapes a pinned identity cell is built in, mounted under one stylesheet. */
function mountAt(width) {
  const document = dom.window.document;
  document.head.innerHTML = `<style>${sheetAt(width)}</style>`;
  document.body.innerHTML = `<table class="ui-table ui-table--compact ui-table--sticky ui-table--pinned">
    <thead>
      <tr><th class="ui-table__identity" id="head" scope="col"><button type="button" class="rx-sort" id="sort">Company and registered trading name<svg class="rx-caret" id="caret"></svg></button></th><th class="ui-table__num">Price</th></tr>
    </thead>
    <tbody>
      <tr><td class="ui-table__identity" id="kit">${rowIdentity({ symbol: 'NORT', name: 'Northstar Analytics Incorporated', href: '#company' })}</td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="plain">North region</td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="sub"><div>North region</div><div class="ui-table__code" id="subline">EU-NORTH-1 district office</div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="subel"><div>South region</div><div class="ui-table__code" id="sublineel"><span>EU-SOUTH-2 district office</span></div></td><td class="ui-table__num">1.00</td></tr>
    </tbody></table>`;
  const cells = ['#head', '#kit', '#plain', '#sub', '#subel'];
  const style = (sel) => dom.window.getComputedStyle(typeof sel === 'string' ? document.querySelector(sel) : sel);
  const declared = /--ui-table-identity-max:\s*([^;}]+)/.exec(substitute(decomment(CSS), tokensFor('light', 'default')));
  assert.ok(declared, 'the identity cap property is gone, so a consumer has nothing to retune');
  return { document, cells, style, cap: lengthPx(declared[1], width) };
}

const MARKS = 'a, button, input, select, textarea, svg, [tabindex]';
/** What this element is, as far as the outcomes below are concerned. */
const contextOf = (el, cap, declared) => ({
  cap,
  declared,
  cell: el.classList.contains('ui-table__identity'),
  decorative: el.classList.contains('ui-identity__logo'),
  // A clip shortens words; on something carrying a mark it removes the mark.
  marks: el.classList.contains('ui-identity') || el.matches(MARKS) || el.querySelector(MARKS) !== null,
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
};

test('at 390 every rule in the phone block comes to the outcome it is written for', () => {
  const { document, style, cap } = mountAt(390);
  let judged = 0;
  for (const { selector, property, value } of phoneIdentityDeclarations()) {
    const outcome = OUTCOME[property];
    assert.ok(outcome, `nothing here judges what ${property} does to a pinned identity`);
    const elements = [...document.querySelectorAll(selector)];
    assert.ok(elements.length, `${selector} reaches nothing among the shapes mounted here`);
    for (const el of elements) {
      const problem = outcome(style(el).getPropertyValue(property), contextOf(el, cap, substitute(value, tokensFor('light', 'default'))));
      assert.equal(problem, null, `${selector} { ${property}: ${value} } on <${el.tagName.toLowerCase()}${el.id ? ` id=${el.id}` : ''}>: ${problem}`);
      judged++;
    }
  }
  assert.ok(judged >= 10, `only ${judged} declarations were judged; the sweep stopped finding its subjects`);
});

test('at 390 the column fits its region, shows a name and is drawn', () => {
  const { style, cells, cap } = mountAt(390);

  // Fits: the cap is at most half the viewport, and no floor inside the column can
  // push it past that. Usable: a 13px line of symbol and name needs the rest of it —
  // a 10vw cap renders a 39px column with no name in it, which is #500 again.
  assert.ok(cap <= 195, `the cap leaves the columns beside it no room: ${cap}px of 390`);
  assert.ok(cap >= 156, `the cap is too narrow to hold a line of identity: ${cap}px of 390`);

  for (const cell of cells) {
    const box = style(cell);
    assert.equal(box.whiteSpace, 'nowrap', `${cell} wraps`);
    assert.notEqual(box.display, 'none', `${cell} is not drawn`);
    assert.notEqual(box.visibility, 'hidden', `${cell} is drawn invisible`);
    assert.ok((lengthPx(box.minWidth, 390) ?? 0) <= cap, `${cell} has a floor past the cap: ${box.minWidth}`);
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

  // A sub-line cuts itself with an ellipsis whether or not its text sits in an
  // element; a control keeps its own layout, so its marks survive.
  for (const subLine of ['#subline', '#sublineel']) {
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
