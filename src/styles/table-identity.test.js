/* Rule: on a phone a pinned identity cell is one running text line with a hard
 * cell edge, never a layout row squeezed to fit.
 * why: docs/components.md#dense-financial-tables, #500, #513 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { substitute, tokensFor } from '../../stories/lib/contrast.js';
import { blockRules, decomment, lengthPx, sheetAt } from '../../stories/lib/css-at-width.js';
import { decodePNG } from '../../stories/lib/table-edge-shade.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}
const { rowIdentity } = await import('../components/table-values.js');

const CSS = read('src/styles/table.css');
const BROWSER_CSS = [
  'src/tokens/brand.generated.css',
  'src/tokens/tokens.css',
  'src/tokens/accents.css',
  'src/styles/base.css',
  'src/styles/table.css',
].map(read).join('\n');

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
 * `<span>`, several lines that hold links in different markup, a sortable header, and two
 * kit anchors keeping their own box, a `.ui-btn` of words alone and a `.ui-nav__item`
 * holding artwork. `extra` composes another
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
      <tr><td class="ui-table__identity" id="direct"><a href="#company">Cedar Infrastructure Holdings International</a></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="plain">North region</td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="sub"><div>North region</div><div class="ui-table__code" id="subline">EU-NORTH-1 district office</div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="subel"><div>South region</div><div class="ui-table__code" id="sublineel"><span>EU-SOUTH-2 district office</span></div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="sublink"><div>West region</div><div class="ui-table__code" id="sublinelink"><a href="#office">EU-WEST-3 district office</a></div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="submixed"><div>Central region</div><div class="ui-table__code" id="sublinemixed">Office: <a href="#office">EU-CENTRAL-4 district office</a></div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="subspan"><div>East region</div><div class="ui-table__code" id="sublinespan"><span><a href="#office">EU-EAST-5 district office</a></span></div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="substrong"><div>Southwest region</div><div class="ui-table__code" id="sublinestrong"><strong><a href="#office">EU-SOUTHWEST-6 district office</a></strong></div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="subtwo"><div>Map region</div><div class="ui-table__code" id="sublinethree"><a href="#office">EU-MAP-7 district office</a> <a href="#map">map</a></div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="subclass"><div>Classed region</div><div class="ui-table__code" id="sublineclass"><a class="u-office-link" href="#office">EU-CLASSED-8 district office</a></div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="subsibling"><div>Legal name</div><div class="ui-table__code" id="sublinesibling"><span>Registered trading name</span> <a href="#office">Northwind Holdings International</a></div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="subpicture"><div>Picture mark</div><div class="ui-table__code" id="sublinepicture">Registered <img id="sublinepicture-shape" alt="" width="240" height="24" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='24'%3E%3C/svg%3E"> company</div></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="btn"><a class="ui-btn ui-btn--sm" href="#company" id="btnlink">Open the registered trading name</a></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="nav"><a class="ui-nav__item" href="#company" id="navlink"><svg class="ui-nav__ic"></svg>Open the registered trading name</a></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="svgmark"><svg id="svgmark-shape" viewBox="0 0 240 24" width="240" height="24"></svg></td><td class="ui-table__num">1.00</td></tr>
      <tr><td class="ui-table__identity" id="imgmark"><img id="imgmark-shape" alt="" width="240" height="24" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='24'%3E%3C/svg%3E"></td><td class="ui-table__num">1.00</td></tr>
    </tbody></table>`;
  const cells = ['#head', '#kit', '#bare', '#direct', '#plain', '#sub', '#subel', '#sublink', '#submixed', '#subspan', '#substrong', '#subtwo', '#subclass', '#subsibling', '#subpicture', '#btn', '#nav', '#svgmark', '#imgmark'];
  const style = (sel) => dom.window.getComputedStyle(typeof sel === 'string' ? document.querySelector(sel) : sel);
  return { document, cells, style, cap };
}

const PICTURES = 'svg, img, canvas, video, picture';
const CONTROLS = '.ui-btn, .ui-nav__item, .ui-badge, button, input, select, textarea';
/** What this element is, as far as the outcomes below are concerned. */
const contextOf = (el, cap) => ({
  cap,
  cell: el.classList.contains('ui-table__identity'),
  decorative: el.classList.contains('ui-identity__logo'),
  picture: el.matches(PICTURES),
  pictureLine: Boolean(el.querySelector?.(PICTURES)),
  control: el.matches(CONTROLS),
  link: el.matches('a'),
});

/**
 * What a declaration has to come to on the element it reaches. Keyed by property and
 * judged on the winning value, so a rule added to the block is held to the same
 * outcome as the rule beside it — and a property nothing here judges fails the sweep.
 */
const OUTCOME = {
  // A percentage stretches short tables. The 1px preference leaves the intrinsic content floor intact.
  width: (v) => (v === '1px' ? null
    : `a column sized ${v} no longer takes its content`),
  'max-width': (v, { cell, cap }) => {
    const px = lengthPx(v, 390);
    if (cell) return px === cap ? null
      : `the cell is capped at ${v}, which is not the ${cap}px --ui-table-identity-max leaves it`;
    if (v.trim() === 'none') return null;
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
  // The cell and text boxes cut. Pictures keep their own overflow so they are not distorted.
  overflow: (v, { cell, picture }) => (picture && !cell
    ? (v === 'visible' ? null : `${v} cuts a picture instead of letting the cell cut it`)
    : (['clip', 'hidden'].includes(v) ? null : `${v} lets text run past the cap`)),
  'overflow-clip-margin': (v, { cell }) => (cell
    ? `the cell has a clip margin of ${v}, so sticky ink can paint over the next column`
    : (lengthPx(v, 390) >= 4 ? null
      : `a cut ${v} from the box leaves a focused line no room for its ring`)),
  'text-overflow': (v, { cell, picture, pictureLine }) => ((picture || pictureLine) && !cell
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
  'justify-content': (v) => (v === 'flex-start' ? null
    : `${v} can cut the front of a capped control label`),
  'text-align': (v) => (['start', 'left'].includes(v) ? null
    : `${v} can hide the front of a capped control label`),
  outline: (v, { link }) => (link
    ? (v === 'none' ? null : `${v} leaves a second link ring inside the line ring`)
    : (v === 'var(--ring-scroll)' ? null : `${v} does not draw the clipped-region ring`)),
  'outline-offset': (v) => (v === 'var(--ring-scroll-offset)' ? null : `${v} is not the inward clipped-region offset`),
  'border-radius': (v) => (v === 'var(--radius-xs)' ? null : `${v} is not the kit line ring corner`),
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
    const reachableSelector = selector.replaceAll(':focus-visible', '');
    const reached = [...document.querySelectorAll(reachableSelector)].filter((el) => el.closest('.ui-table__identity'));
    if (!reached.length) {
      assert.ok(!selector.includes('identity'),
        `${selector} names the pinned identity and reaches nothing among the shapes mounted here`);
      continue;
    }
    for (const { property, value } of declarations) {
      const outcome = OUTCOME[property];
      assert.ok(outcome, `nothing here judges what ${property} does to a pinned identity`);
      for (const el of reached) {
        const actual = selector.includes(':focus-visible') ? value : style(el).getPropertyValue(property);
        const problem = outcome(actual, contextOf(el, cap));
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
const SHAPES = 14;

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

  // A sub-line cuts itself with an ellipsis. When it holds a link, it stays
  // running text rather than a layout row. Chrome then draws the ellipsis.
  for (const subLine of ['#subline', '#sublineel', '#sublinelink']) {
    assert.equal(style(subLine).textOverflow, 'ellipsis', `${subLine} is cut without saying so`);
    assert.ok(['clip', 'hidden'].includes(style(subLine).overflow), `${subLine} runs past the cap`);
  }
  const subLinesWithLinks = [...document.querySelectorAll('.ui-table__identity > *')].filter((el) => el.querySelector('a'));
  assert.equal(subLinesWithLinks.length, 7, 'the fixture must cover each sub-line link shape');
  for (const subLine of subLinesWithLinks) {
    assert.equal(style(subLine).display, 'block', `#${subLine.id} stopped being running text`);
    assert.equal(style(subLine).overflowClipMargin, '4px', `#${subLine.id} does not keep the line ring room`);
    for (const link of subLine.querySelectorAll('a')) {
      const linkStyle = style(link);
      if (!link.className) assert.equal(linkStyle.display, 'inline', `#${subLine.id} bare link is atomic, so the line cannot cut inside it`);
    }
  }
  const sort = style('#sort');
  assert.equal(sort.maxWidth.trim(), '100%', 'a sort button is not held to the cell it sits in');
  assert.equal(sort.justifyContent, 'flex-start', 'a capped sort button can lose the front of its label');
  assert.ok(['hidden', 'clip'].includes(sort.overflow), `a sort button runs past the cap at ${sort.overflow}`);
  assert.equal(style('#svgmark-shape').maxWidth.trim(), 'none', 'an svg mark is capped and distorted');
  assert.equal(style('#imgmark-shape').maxWidth.trim(), 'none', 'an img mark is capped and distorted');
});

const round = (n) => Math.round(n * 100) / 100;

const SUBLINE_ROWS = [
  ['plain-link', '<a href="#office">EU-WEST-3 district office</a>'],
  ['mixed-link', 'Office: <a href="#office">EU-CENTRAL-4 district office</a>'],
  ['span-link', '<span><a href="#office">EU-EAST-5 district office</a></span>'],
  ['strong-link', '<strong><a href="#office">EU-SOUTHWEST-6 district office</a></strong>'],
  ['two-links', '<a href="#office">EU-MAP-7 district office</a> <a href="#map">map</a>'],
  ['classed-link', '<a class="u-office-link" href="#office">EU-CLASSED-8 district office</a>'],
  ['sibling-link', '<span data-sibling>Registered trading name</span> <a href="#office">Northwind Holdings International</a>'],
];

function subLineFixture(css, width, rows = SUBLINE_ROWS) {
  const bodyRows = rows.map(([id, markup], index) => `
        <tr><td class="ui-table__identity" id="cell-${id}">
          <div>Region ${index + 1}</div>
          <div class="ui-table__code" data-subline="${id}">${markup}</div>
        </td><td class="ui-table__num">1.00</td></tr>`).join('');
  return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8">
    <style>${css}</style>
    <style>body{margin:0}.stage{width:${width}px}.ui-table-scroll{max-height:none}</style>
    </head><body><div class="stage"><div class="ui-table-scroll">
    <table class="ui-table ui-table--compact ui-table--sticky ui-table--pinned">
      <thead><tr><th class="ui-table__identity">Region</th><th class="ui-table__num">Price</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table></div></div></body></html>`;
}

const differs = (a, b, index) =>
  Math.abs(a.data[index] - b.data[index])
    + Math.abs(a.data[index + 1] - b.data[index + 1])
    + Math.abs(a.data[index + 2] - b.data[index + 2])
    + Math.abs(a.data[index + 3] - b.data[index + 3]) > 12;

function rightmostChangedPixel(before, after, box) {
  assert.equal(before.width, after.width, 'screenshots must have the same width');
  assert.equal(before.height, after.height, 'screenshots must have the same height');
  const left = Math.max(0, Math.floor(box.left) - 2);
  const right = Math.min(before.width - 1, Math.ceil(box.right) + 24);
  const top = Math.max(0, Math.floor(box.top) - 8);
  const bottom = Math.min(before.height - 1, Math.ceil(box.bottom) + 8);
  let found = -1;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (differs(before, after, (y * before.width + x) * 4)) found = Math.max(found, x);
    }
  }
  return found;
}

function changedPixels(before, after, box) {
  assert.equal(before.width, after.width, 'screenshots must have the same width');
  assert.equal(before.height, after.height, 'screenshots must have the same height');
  const left = Math.max(0, Math.floor(box.left));
  const right = Math.min(before.width - 1, Math.ceil(box.right));
  const top = Math.max(0, Math.floor(box.top));
  const bottom = Math.min(before.height - 1, Math.ceil(box.bottom));
  let count = 0;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (differs(before, after, (y * before.width + x) * 4)) count++;
    }
  }
  return count;
}

const BLUE_MARK = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%2224%22%3E%3Crect width=%22240%22 height=%2224%22 fill=%22%230060ff%22/%3E%3C/svg%3E';

function stackedRunningFixture(css, width) {
  return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8">
    <style>${css}</style>
    <style>body{margin:0}.stage{width:${width}px}.ui-table-scroll{max-height:none}</style>
    </head><body><div class="stage"><div class="ui-table-scroll">
    <table class="ui-table ui-table--compact ui-table--sticky ui-table--pinned ui-table--stack" role="table">
      <thead><tr><th scope="col" role="columnheader" class="ui-table__identity">Office</th><th scope="col" role="columnheader" class="ui-table__num">Price</th></tr></thead>
      <tbody><tr role="row"><td role="cell" class="ui-table__identity"><div data-stacked-line>Office: <a href="#office">North</a> <a href="#map">map</a></div></td><td role="cell" class="ui-table__num">1.00</td></tr></tbody>
    </table></div></div></body></html>`;
}

async function measureStackedRunningGaps(page, css, width) {
  await page.setViewportSize({ width, height: 180 });
  await page.setContent(stackedRunningFixture(css, width), { waitUntil: 'load' });
  await page.waitForTimeout(100);
  return page.evaluate(() => {
    const line = document.querySelector('[data-stacked-line]');
    const links = [...line.querySelectorAll('a')];
    const text = line.firstChild;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 'Office:'.length);
    const label = range.getBoundingClientRect();
    const first = links[0].getBoundingClientRect();
    const second = links[1].getBoundingClientRect();
    return {
      display: getComputedStyle(line).display,
      labelToFirst: first.left - label.right,
      firstToSecond: second.left - first.right,
    };
  });
}

async function measureSiblingLine(page, css, width) {
  await page.setViewportSize({ width, height: 240 });
  await page.setContent(subLineFixture(css, width, [
    ['sibling-link', '<span data-sibling>Registered trading name</span> <a href="#office">Northwind Holdings International</a>'],
  ]), { waitUntil: 'load' });
  await page.waitForTimeout(100);
  const subject = await page.evaluate(() => {
    const sibling = document.querySelector('[data-sibling]');
    const link = document.querySelector('[data-subline] a');
    const range = document.createRange();
    range.selectNodeContents(sibling);
    const textBox = range.getBoundingClientRect();
    const siblingBox = sibling.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    return {
      siblingWidth: siblingBox.width,
      textBeyondSiblingPx: Math.max(0, textBox.right - siblingBox.right),
      linkBox: { left: linkBox.left, right: linkBox.right, top: linkBox.top, bottom: linkBox.bottom },
    };
  });
  const before = decodePNG(await page.screenshot());
  await page.evaluate(() => { document.querySelector('[data-sibling]').style.visibility = 'hidden'; });
  const after = decodePNG(await page.screenshot());
  return {
    ...subject,
    siblingPaintInsideLinkPx: changedPixels(before, after, subject.linkBox),
  };
}

function pictureLineFixture(css, width) {
  return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8">
    <style>${css}</style>
    <style>body{margin:0}.stage{width:${width}px}.ui-table-scroll{max-height:none}</style>
    </head><body><div class="stage"><div class="ui-table-scroll">
    <table class="ui-table ui-table--compact ui-table--sticky ui-table--pinned">
      <thead><tr><th class="ui-table__identity">Region</th><th class="ui-table__num">Price</th></tr></thead>
      <tbody><tr><td class="ui-table__identity"><div>Region</div><div class="ui-table__code" data-picture-line>Registered <img data-blue-mark alt="" width="240" height="24" src="${BLUE_MARK}"> company</div></td><td class="ui-table__num">1.00</td></tr></tbody>
    </table></div></div></body></html>`;
}

async function measurePicturePixels(page, css, width) {
  await page.setViewportSize({ width, height: 220 });
  await page.setContent(pictureLineFixture(css, width), { waitUntil: 'load' });
  await page.waitForTimeout(100);
  const shot = decodePNG(await page.screenshot());
  let blue = 0;
  for (let index = 0; index < shot.data.length; index += 4) {
    if (shot.data[index] < 16 && shot.data[index + 1] > 80 && shot.data[index + 1] < 120 && shot.data[index + 2] > 240) blue++;
  }
  return blue;
}

function directLinkFixture(css, width) {
  return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8">
    <style>${css}</style>
    <style>body{margin:0}.stage{width:${width}px}.ui-table-scroll{max-height:none}</style>
    </head><body><div class="stage"><div class="ui-table-scroll">
    <table class="ui-table ui-table--compact ui-table--sticky ui-table--pinned">
      <thead><tr><th class="ui-table__identity">Company</th><th class="ui-table__num">Price</th></tr></thead>
      <tbody><tr><td class="ui-table__identity" data-direct-cell><a href="#company" data-direct-link>Cedar Infrastructure Holdings International</a></td><td class="ui-table__num">1.00</td></tr></tbody>
    </table></div></div></body></html>`;
}

async function measureDirectLinkFocus(page, css, width) {
  await page.setViewportSize({ width, height: 180 });
  await page.setContent(directLinkFixture(css, width), { waitUntil: 'load' });
  await page.waitForTimeout(100);
  const before = decodePNG(await page.screenshot());
  await page.focus('[data-direct-link]');
  const after = decodePNG(await page.screenshot());
  const boxes = await page.evaluate(() => {
    const cell = document.querySelector('[data-direct-cell]').getBoundingClientRect();
    const link = document.querySelector('[data-direct-link]').getBoundingClientRect();
    return {
      cell: { left: cell.left, right: cell.right, top: cell.top, bottom: cell.bottom },
      link: { left: link.left, right: link.right, top: link.top, bottom: link.bottom },
    };
  });
  const vertical = (x1, x2) => changedPixels(before, after, {
    left: x1,
    right: x2,
    top: boxes.cell.top,
    bottom: boxes.cell.bottom,
  });
  return {
    cellRight: round(boxes.cell.right),
    linkRight: round(boxes.link.right),
    leftEdgePixels: vertical(boxes.cell.left, boxes.cell.left + 8),
    rightEdgePixels: vertical(boxes.cell.right - 8, boxes.cell.right),
  };
}

async function measureSubLineOverflow(page, css, width, rows = SUBLINE_ROWS) {
  const html = subLineFixture(css, width, rows);
  await page.setViewportSize({ width, height: 360 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(100);
  const subjects = await page.evaluate(() => [...document.querySelectorAll('.ui-table__identity > *:has(a)')]
    .map((line, index) => {
      const link = line.querySelector('a');
      const cell = line.closest('.ui-table__identity').getBoundingClientRect();
      const lineBox = line.getBoundingClientRect();
      const linkBox = link.getBoundingClientRect();
      const cs = getComputedStyle(link);
      return {
        index,
        id: line.getAttribute('data-subline'),
        linkOverflow: cs.overflow,
        linkTextOverflow: cs.textOverflow,
        lineTextOverflow: getComputedStyle(line).textOverflow,
        cellRight: cell.right,
        lineRight: lineBox.right,
        linkRight: linkBox.right,
        lineBox: { left: lineBox.left, right: lineBox.right, top: lineBox.top, bottom: lineBox.bottom },
      };
    }));
  assert.ok(subjects.length >= 6, `only ${subjects.length} sub-line link shapes were discovered`);
  const out = [];
  for (const subject of subjects) {
    await page.evaluate((index) => {
      const line = document.querySelectorAll('.ui-table__identity > *:has(a)')[index];
      line.querySelector('a').focus();
    }, subject.index);
    const before = decodePNG(await page.screenshot());
    await page.evaluate((index) => {
      document.querySelectorAll('.ui-table__identity > *:has(a)')[index].style.visibility = 'hidden';
    }, subject.index);
    const after = decodePNG(await page.screenshot());
    await page.evaluate((index) => {
      document.querySelectorAll('.ui-table__identity > *:has(a)')[index].style.visibility = '';
    }, subject.index);
    const paintedRight = rightmostChangedPixel(before, after, subject.lineBox);
    out.push({
      ...subject,
      width,
      paintedOverflowPx: round(Math.max(0, paintedRight + 1 - subject.cellRight)),
      boxOverflowPx: round(Math.max(0, subject.linkRight - subject.cellRight)),
    });
  }
  return out;
}

test('Chrome keeps a sub-line link inside the pinned identity cap at phone widths', {
  skip: !process.env.TABLE_IDENTITY_BROWSER && 'set TABLE_IDENTITY_BROWSER=1 to run the Chrome layout gate',
}, async () => {
  const css = BROWSER_CSS;
  const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const { chromium } = pw.chromium ? pw : pw.default;
  const browser = await chromium.launch({ executablePath: process.env.UI_CHROME || undefined });
  const page = await browser.newPage();
  try {
    for (const width of PHONE_WIDTHS) {
      const rows = await measureSubLineOverflow(page, css, width);
      for (const row of rows) {
        assert.ok(row.paintedOverflowPx <= 0.5, `${row.id} paints ${row.paintedOverflowPx}px past the cell at ${width}`);
        assert.equal(row.lineTextOverflow, 'ellipsis', `${row.id} does not promise a line ellipsis at ${width}`);
      }
      const card = await measureStackedRunningGaps(page, css, width);
      assert.ok(card.labelToFirst >= 3, `stacked card welded label to first link: ${card.labelToFirst}px at ${width}`);
      assert.ok(card.firstToSecond >= 3, `stacked card welded two links: ${card.firstToSecond}px at ${width}`);

      const sibling = await measureSiblingLine(page, css, width);
      assert.ok(sibling.textBeyondSiblingPx <= 0.5,
        `sibling text paints ${sibling.textBeyondSiblingPx}px beyond its own box at ${width}`);
      assert.equal(sibling.siblingPaintInsideLinkPx, 0,
        `sibling paints ${sibling.siblingPaintInsideLinkPx} pixels inside the link at ${width}`);

      const picturePixels = await measurePicturePixels(page, css, width);
      assert.ok(picturePixels > 0, `the nested picture paints no blue pixels at ${width}`);

      const directFocus = await measureDirectLinkFocus(page, css, width);
      assert.ok(directFocus.linkRight > directFocus.cellRight,
        `the direct-link fixture stopped proving a longer link at ${width}: ${JSON.stringify(directFocus)}`);
      assert.ok(directFocus.leftEdgePixels > 0 && directFocus.rightEdgePixels > 0,
        `the direct-link line ring is open at ${width}: ${JSON.stringify(directFocus)}`);
    }

    const discovered = await measureSubLineOverflow(page, css, 390, [
      ...SUBLINE_ROWS,
      ['new-markup', '<em><a href="#office">EU-ADDED-9 district office</a></em>'],
    ]);
    assert.equal(discovered.length, SUBLINE_ROWS.length + 1,
      'a new sub-line link markup must be discovered without being listed in the measuring code');

    const defect = css
      .replace('  .ui-table--pinned .ui-table__identity {\n    width: 1px;\n    max-width: var(--ui-table-identity-max);\n    white-space: nowrap;\n    overflow: clip;',
        '  .ui-table--pinned .ui-table__identity {\n    width: 1px;\n    max-width: var(--ui-table-identity-max);\n    white-space: nowrap;\n    overflow: visible;')
      .replace('  .ui-table--pinned .ui-table__identity > * {\n    overflow: clip;',
        '  .ui-table--pinned .ui-table__identity > * {\n    overflow: visible;');
    assert.notEqual(defect, css, 'the browser mutation no longer matches table.css, so it proves nothing');
    const failures = [];
    for (const width of PHONE_WIDTHS) {
      const rows = await measureSubLineOverflow(page, defect, width);
      failures.push(...rows.filter((row) => row.paintedOverflowPx > 0.5));
    }
    assert.ok(new Set(failures.map((row) => row.width)).size === PHONE_WIDTHS.length,
      `dropping only the link's overflow clip did not fail at both widths: ${JSON.stringify(failures)}`);

    const stackedDefect = `${css}
@media (max-width: 560px) {
  .ui-table.ui-table--stack.ui-table--pinned .ui-table__identity > *:has(a) {
    display: flex;
  }
}`;
    const welded = [];
    for (const width of PHONE_WIDTHS) {
      const card = await measureStackedRunningGaps(page, stackedDefect, width);
      if (card.labelToFirst <= 0.5 || card.firstToSecond <= 0.5) welded.push({ width, ...card });
    }
    assert.ok(new Set(welded.map((row) => row.width)).size === PHONE_WIDTHS.length,
      `the stacked-card mutation did not weld running text at both widths: ${JSON.stringify(welded)}`);

    const siblingDefect = `${css}
@media (max-width: 720px) {
  .ui-table--pinned .ui-table__identity > *:has(> span):has(> a) {
    display: flex;
  }
  .ui-table--pinned .ui-table__identity > *:has(> span):has(> a) > * {
    min-width: 0;
  }
}`;
    const overlaps = [];
    for (const width of PHONE_WIDTHS) {
      const sibling = await measureSiblingLine(page, siblingDefect, width);
      if (sibling.textBeyondSiblingPx > 0.5 || sibling.siblingPaintInsideLinkPx > 0) overlaps.push({ width, ...sibling });
    }
    assert.ok(new Set(overlaps.map((row) => row.width)).size === PHONE_WIDTHS.length,
      `the sibling mutation did not overlap painted text at both widths: ${JSON.stringify(overlaps)}`);

    const pictureDefect = `${css}
@media (max-width: 720px) {
  .ui-table--pinned .ui-table__identity > *:has(:is(svg, img, canvas, video, picture)) {
    text-overflow: ellipsis;
  }
}`;
    const hiddenPictures = [];
    for (const width of PHONE_WIDTHS) {
      const picturePixels = await measurePicturePixels(page, pictureDefect, width);
      if (picturePixels === 0) hiddenPictures.push({ width, picturePixels });
    }
    assert.ok(new Set(hiddenPictures.map((row) => row.width)).size === PHONE_WIDTHS.length,
      `the picture mutation did not hide the nested image at both widths: ${JSON.stringify(hiddenPictures)}`);

    const focusDefect = css
      .replace(`  .ui-table--pinned .ui-table__identity:not(.ui-table__linked):has(> a:focus-visible) {
    outline: var(--ring-scroll);
    outline-offset: var(--ring-scroll-offset);
    border-radius: var(--radius-xs);
  }
`, '');
    assert.notEqual(focusDefect, css, 'the direct-link focus mutation no longer matches table.css, so it proves nothing');
    const openRings = [];
    for (const width of PHONE_WIDTHS) {
      const directFocus = await measureDirectLinkFocus(page, focusDefect, width);
      if (directFocus.rightEdgePixels === 0) openRings.push({ width, ...directFocus });
    }
    assert.ok(new Set(openRings.map((row) => row.width)).size === PHONE_WIDTHS.length,
      `the direct-link focus mutation did not open the ring at both widths: ${JSON.stringify(openRings)}`);
  } finally {
    await browser.close();
  }
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
  'justify-content': () => null,
  'text-align': () => null,
  outline: () => null,
  'outline-offset': () => null,
  'border-radius': () => null,
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
  // #513's filled-link defect, and the two rules that answer it, each taken away on its own.
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

// The source rule cannot prove layout. The served comparison measures the resulting column widths.
test('the identity width rejects a percentage or a fixed wide column', () => {
  assert.equal(OUTCOME.width('1px'), null);
  for (const width of ['1%', '100%', '240px', '0px']) {
    assert.notEqual(OUTCOME.width(width), null, `${width} must fail the same width check`);
  }
});
