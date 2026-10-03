/* Rule: at 560px and below a stacked row is a card — headed by its identity, with
 * every other cell a labelled line. Nothing is pinned, nothing is cut, nothing wraps
 * away, and the header row's words are in the cells instead of above them. why: #500.
 *
 * Three questions about the stylesheet, then one about the markup. Every declaration
 * the stacked block writes is judged
 * by what it COMES TO on each element the rule reaches, so a rule added to the block
 * is held to the same outcome as the rule beside it and a property nothing here judges
 * fails the sweep. Then the composition is stated on its own, from the mounted shapes.
 * Then the ladder: at 600 the table is the capped pinned column of #500, at 1280 it is
 * the plain table, and at neither is a row a card.
 *
 * The last test sweeps the kit's own stacked examples, because two of the three things
 * this composition needs are markup: the `data-label` each card prints, and the ARIA
 * roles a browser drops the moment `display` stops being `table-*`.
 *
 * Limits. JSDOM models no layout, so an outcome is the winning declaration rather than
 * a drawn box; Chromium measured the drawn cards for #500 at 390 and 320. It computes
 * no generated content and no `gap`, `margin-inline` or `border` shorthand either, so
 * those are judged on the value as written, token-resolved — the sweep counts both
 * kinds and reports them, rather than passing over an empty string.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { rgbOf, substitute, tokensFor } from '../../stories/lib/contrast.js';
import { blockRules, lengthPx, sheetAt } from '../../stories/lib/css-at-width.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}
const { rowIdentity } = await import('../components/table-values.js');

const CSS = read('src/styles/table.css');
const TOKENS = tokensFor('light', 'default');
const resolve = (value) => substitute(value, TOKENS).trim();

const STEP = '@media (max-width: 560px)';
/** The scales a declaration in this block may draw its lengths and ranks from. */
const SPACE = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
const RADIUS = [6, 9, 12, 16, 18, 24, 999];
const TYPE = [11, 13, 14.5, 15.5, 18, 22, 30, 40, 56];
const WEIGHT = ['300', '400', '500', '600', '700'];
const INK = [TOKENS.get('--text'), TOKENS.get('--strong')].map((c) => rgbOf(c));

/** Every length in a value, in px, or `null` for one that is not a length. */
const lengths = (value) => resolve(value).split(/\s+/).filter(Boolean)
  .map((part) => (part === 'auto' || part === '0' ? 0 : lengthPx(part, 390)));

/** A shorthand of lengths — padding, margin, gap — against the spacing scale. */
const onScale = (value, scale, what) => {
  for (const px of lengths(value)) {
    if (px === null) return `${value} is not a length, so ${what}`;
    if (!scale.includes(px)) return `${px}px is off the scale, so ${what}`;
  }
  return null;
};

/** A line that divides two regions of one surface: the hairline, or nothing at all.
 *  why: docs/specification.md#elevation */
const hairline = (value) => {
  const text = resolve(value);
  const parts = text.split(/\s+/).filter(Boolean);
  const width = parts.find((p) => p === '0' || /^-?\d+(?:\.\d+)?px$/.test(p));
  const px = width === undefined ? null : (width === '0' ? 0 : lengthPx(width, 390));
  // Nothing drawn is an answer: `border-right: 0` is how the pinned divider goes.
  if (px === 0 || parts.includes('none') || parts.includes('hidden')) return null;
  if (px !== 1) return `${text} edges a card ${px}px thick, where a region of one surface takes the hairline`;
  // Not a whitespace split: `rgb(228, 231, 238)` carries spaces of its own.
  const colour = rgbOf((/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}/.exec(text) ?? [''])[0]);
  return colour === rgbOf(TOKENS.get('--border')) ? null
    : `${text} edges a card in ${colour ?? 'no colour of its own'}, which is not the hairline`;
};

/**
 * What a declaration has to come to on the element it reaches. A card is wide where
 * the pinned column was narrow, so most of these are the capped column's outcomes
 * turned around: wrapping is right, cutting is wrong, and a px cap is the sliver.
 */
const OUTCOME = {
  display: (v, { head, group, identity, cell }) => {
    if (head) return v === 'none' ? null : `a drawn header row at ${v} is a card of column names above the cards`;
    if (group) return v === 'flex' ? null : `a ${v} row group puts no gap between the cards, so they share an edge`;
    if (identity) return v === 'block' ? null : `a heading at ${v} does not take the card's width`;
    if (v === 'none') return 'a row that is not drawn is what #500 reported, not what it asked for';
    return v.startsWith('table') ? `${v} draws a row as a row, which is the thing this step replaces` : null;
  },
  'white-space': (v) => (v === 'normal' ? null : `${v} holds a card's content to one line it has no need of`),
  overflow: (v) => (['', 'visible'].includes(v) ? null : `${v} cuts inside a card, which is not narrow`),
  'text-overflow': (v) => (['', 'clip'].includes(v) ? null : `${v} promises a cut this composition does not make`),
  'max-width': (v) => (['', 'none', '100%'].includes(v.trim()) ? null : `${v} caps a card the way the narrow column was capped`),
  'min-width': (v) => ((lengthPx(v, 390) ?? 0) === 0 ? null : `a floor of ${v} keeps the columns the cards replaced`),
  width: (v) => (['', 'auto', '100%'].includes(v.trim()) ? null : `${v} is a column's width, and there are no columns`),
  height: (v) => (['', 'auto'].includes(v) ? null : `${v} caps a card that is as tall as the lines in it`),
  position: (v) => (['', 'static'].includes(v) ? null : `${v} pins a cell inside a block row, which pins it to nothing`),
  'max-height': (v) => (['', 'none'].includes(v) ? null : `${v} cuts the stack of cards in half and scrolls the rest inside a box`),
  'flex-direction': (v) => (v === 'column' ? null : `cards laid out ${v} are columns again`),
  'flex-wrap': (v) => (v === 'wrap' ? null : `a value too long for its line has nowhere to go at ${v}`),
  'align-items': (v) => (v === 'baseline' ? null : `a label and its value share a line, so ${v} sets them adrift of each other`),
  'text-align': (v) => (['', 'left'].includes(v) ? null : `${v} is a column's alignment, and a heading is not a column`),
  content: (v, { labelled }) => (labelled
    ? (resolve(v) === 'attr(data-label)' ? null : `a card prints ${v} instead of the cell's own label`)
    : (resolve(v) === 'none' ? null : `${v} labels a heading that is the card's own name`)),
  color: (v) => (INK.includes(rgbOf(resolve(v))) ? null : `${v} is not body or strong ink`),
  'font-size': (v) => (TYPE.includes(lengthPx(resolve(v), 390)) ? null : `${v} is off the type scale`),
  'font-weight': (v) => (WEIGHT.includes(resolve(v)) ? null : `${v} is off the weight scale`),
  'border-radius': (v) => onScale(v, RADIUS, 'a card takes a corner the kit does not draw'),
  border: hairline,
  'border-bottom': hairline,
  'border-right': hairline,
  padding: (v) => onScale(v, SPACE, 'a card is inset off the rhythm'),
  'padding-inline': (v) => onScale(v, SPACE, 'a card is inset off the rhythm'),
  'padding-right': (v) => onScale(v, SPACE, 'a label is parted from its value off the rhythm'),
  'margin-inline': (v) => onScale(v, SPACE, 'a card hangs off the rhythm'),
  'margin-bottom': (v) => onScale(v, SPACE, 'a heading is parted from its lines off the rhythm'),
  'margin-right': (v) => (resolve(v) === 'auto' ? null : `${v} does not group a value at the card's far edge`),
  gap: (v) => onScale(v, SPACE, 'the cards are parted off the rhythm'),
  'row-gap': (v) => onScale(v, SPACE, "a wrapped value's line is parted off the rhythm"),
};

/** A row, in every shape a card has to be able to draw. */
const ROW = `
  <td class="ui-table__selection" role="cell"><input type="checkbox" aria-label="Select Cedar"></td>
  <td class="ui-table__identity" role="rowheader">${rowIdentity({ symbol: 'CEDA', name: 'Cedar Infrastructure Holdings International', href: '#company' })}</td>
  <td class="ui-table__num" role="cell" data-label="Price"><span class="ui-value">94.37<span class="ui-value__unit">USD</span></span></td>
  <td class="ui-table__num" role="cell" data-label="Market cap">198,054.09 B USD</td>
  <td role="cell" data-label="Sector">Industrials</td>
  <td class="ui-table__act" role="cell" data-label="Actions"><button type="button" class="ui-btn ui-btn--sm">Open</button><button type="button" class="ui-btn ui-btn--sm">Hide</button></td>`;

const HEAD = `
  <th class="ui-table__selection" scope="col" role="columnheader"><input type="checkbox" aria-label="Select all rows on this page"></th>
  <th class="ui-table__identity" scope="col" role="columnheader">Company</th>
  <th class="ui-table__num" scope="col" role="columnheader">Price</th>
  <th class="ui-table__num" scope="col" role="columnheader">Market cap</th>
  <th scope="col" role="columnheader">Sector</th>
  <th scope="col" role="columnheader">Actions</th>`;

/** The shapes a stacked table is built in, mounted under one flattened stylesheet.
 *  Two tables, because the bleed a card owns and the bleed its scroll wrapper owns are
 *  written on different parents, and a rule reaching neither would pass unseen. */
function mountAt(width) {
  const document = dom.window.document;
  document.head.innerHTML = `<style>${sheetAt(CSS, width)}</style>`;
  document.body.innerHTML = `
    <div class="ui-card">
      <div class="ui-table-scroll" role="region" aria-label="Watchlist" tabindex="0">
        <table id="wrapped" role="table" class="ui-table ui-table--compact ui-table--sticky ui-table--pinned ui-table--stacked ui-table--hover">
          <thead role="rowgroup"><tr role="row">${HEAD}</tr></thead>
          <tbody role="rowgroup">
            <tr role="row" id="card">${ROW}</tr>
            <tr role="row"><td role="cell" colspan="6" id="empty">No companies match these filters.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="ui-card">
      <table id="bare" role="table" class="ui-table ui-table--dense ui-table--zebra ui-table--pinned ui-table--stacked">
        <thead role="rowgroup"><tr role="row">${HEAD}</tr></thead>
        <tbody role="rowgroup"><tr role="row">${ROW}</tr></tbody>
      </table>
    </div>`;
  const style = (sel) => dom.window.getComputedStyle(typeof sel === 'string' ? document.querySelector(sel) : sel);
  return { document, style };
}

/** What this element is, as far as the outcomes above are concerned. Read off the
 *  element rather than off the selector's spelling: a rule written on any other class
 *  lands in the same card, and a name match never sees it. */
const contextOf = (el) => ({
  head: el.matches('thead') || !!el.closest('thead'),
  group: el.matches('tbody'),
  identity: el.matches('.ui-table__identity') && !el.closest('thead'),
  cell: el.matches('tbody td'),
  labelled: el.matches('[data-label]'),
});

test('at 390 every rule the stacked step writes comes to the outcome it is written for', () => {
  const { document, style } = mountAt(390);
  const rules = blockRules(CSS, STEP);
  const written = rules.reduce((n, rule) => n + rule.declarations.length, 0);
  // The floor is what the block writes today. A rule deleted from it is a rule
  // nothing measures, so the count moves only when the outcomes below move with it.
  assert.ok(rules.length >= 15, `the stacked block is down to ${rules.length} rules; one of them is no longer measured`);
  assert.ok(written >= 47, `the stacked block is down to ${written} declarations; what is no longer written is no longer measured`);

  let computed = 0;
  let asWritten = 0;
  for (const { selector, declarations } of rules) {
    // A pseudo-element's box is not in the DOM, so the rule is judged on the element
    // that owns it and its properties on the value as written.
    const pseudo = /::[a-z-]+\s*$/.test(selector);
    const owner = selector.replace(/::[a-z-]+\s*$/, '').trim();
    const reached = [...document.querySelectorAll(owner)];
    if (!reached.length) {
      assert.fail(`${selector} reaches nothing among the shapes mounted here, so nothing measures it`);
    }
    for (const { property, value } of declarations) {
      const outcome = OUTCOME[property];
      assert.ok(outcome, `nothing here judges what ${property} does to a stacked row`);
      for (const el of reached) {
        // The winning value where JSDOM resolves one, the written value where it does
        // not — never an empty string, which would judge nothing and report a pass.
        const win = pseudo ? '' : style(el).getPropertyValue(property);
        const judged = win === '' ? resolve(value) : win;
        if (win === '') asWritten++; else computed++;
        const problem = outcome(judged, contextOf(el));
        assert.equal(problem, null,
          `${selector} { ${property}: ${value} } on <${el.tagName.toLowerCase()}${el.id ? ` id=${el.id}` : ''}>: ${problem}`);
      }
    }
  }
  assert.ok(computed >= 46, `only ${computed} declarations were read off a mounted element; the sweep stopped finding its subjects`);
  assert.ok(asWritten >= 7, `only ${asWritten} declarations fell back to the written value; the pseudo-element rules are the ones that should`);
});

test('at 390 a row is a card headed by its identity, with every other cell labelled', () => {
  const { document, style } = mountAt(390);

  // The header row's words are in the cells now, and everything else is drawn.
  assert.equal(style('#wrapped thead').display, 'none', 'the header row is drawn above the cards');
  for (const sel of ['#wrapped', '#wrapped tbody', '#card', '#card .ui-table__identity']) {
    assert.ok(!style(sel).display.startsWith('table'), `${sel} is still laid out as a table at ${style(sel).display}`);
    assert.notEqual(style(sel).display, 'none', `${sel} is not drawn`);
  }

  // The cards are the page's to scroll, not a 70vh box's: a region with no columns
  // left to scroll would otherwise cut one in half.
  const region = style('.ui-table-scroll');
  assert.equal(region.maxHeight, 'none', `the cards are held inside a ${region.maxHeight} box`);
  assert.equal(region.overflow, 'visible', `the region still scrolls at ${region.overflow}`);

  // The card: the hairline its row rule used to be, a kit corner, and the inset the
  // rhythm gives it. No second surface and nothing cast — it is a region of one.
  const card = style('#card');
  assert.equal(card.borderTopWidth, '1px', 'a card is edged by something other than the hairline');
  assert.equal(rgbOf(card.borderTopColor), rgbOf(TOKENS.get('--border')), 'a card is edged in a colour that is not the hairline');
  assert.equal(card.borderRadius, '16px', 'a card does not take a kit corner');
  assert.equal(card.padding, '12px 16px', `a card is inset ${card.padding}`);
  assert.ok(['', 'none', '0 0 #0000'].includes(card.boxShadow.trim()), `a card inside a card casts ${card.boxShadow}`);

  // The heading: the whole width, strong ink, a rule under it, and no pin.
  const heading = style('#card .ui-table__identity');
  assert.equal(heading.display, 'block', 'the heading does not take the card width');
  assert.equal(heading.position, 'static', 'the heading is still pinned, so it leaves the card');
  assert.equal(rgbOf(heading.color), rgbOf(TOKENS.get('--strong')), 'the heading is not in strong ink');
  assert.equal(heading.fontWeight, '500', 'the heading does not carry the medium weight');
  assert.equal(heading.borderBottomWidth, '1px', 'the heading has no rule under it');
  assert.equal(heading.borderRightWidth, '0px', 'the heading keeps the pinned column divider');
  assert.ok(['none', '100%'].includes(heading.maxWidth.trim()), `the heading is held to a cap of ${heading.maxWidth}`);
  assert.equal(heading.whiteSpace, 'normal', 'the heading cannot wrap into the card it heads');

  // Nothing in the card is capped in px, cut, or taken out of flow — the three ways
  // the narrow column lost a name, none of which a card has any reason for.
  for (const el of [document.querySelector('#card'), ...document.querySelectorAll('#card *')]) {
    const where = `#card <${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(' ')[0]}` : ''}>`;
    const box = style(el);
    assert.ok((lengthPx(box.maxWidth, 390) ?? 0) === 0, `${where} is capped at ${box.maxWidth}`);
    assert.ok(['', 'visible'].includes(box.overflow), `${where} cuts at ${box.overflow}`);
    assert.ok(['', 'static', 'relative'].includes(box.position), `${where} is out of the card at ${box.position}`);
    assert.ok(['', 'none'].includes(box.clipPath), `${where} is clipped out of view`);
  }
  // The identity's own name wraps rather than ending in an ellipsis it does not need.
  const name = style('#card .ui-identity__name');
  assert.equal(name.whiteSpace, 'normal', 'the company name is held to one line inside a card');
  assert.equal(name.textOverflow, 'clip', 'the company name promises an ellipsis a card never draws');

  // A labelled line: the label at one edge, the value at the other, on one baseline,
  // and a value too long for the line drops below it rather than running out of the card.
  const line = style('#card td[data-label]');
  assert.equal(line.display, 'flex', `a labelled line is laid out ${line.display}, so its label and value do not share one`);
  assert.equal(line.flexWrap, 'wrap', 'a value too long for its line has nowhere to go');
  assert.equal(line.alignItems, 'baseline', 'a label and its value do not sit on one baseline');

  // Every body cell that is not the heading carries the word the card prints in front
  // of its value. A cell with none prints a bare number under a heading.
  const cells = [...document.querySelectorAll('#card td')];
  assert.equal(cells.length, 6, `the card lost a cell: ${cells.length} of 6`);
  for (const cell of cells) {
    if (cell.matches('.ui-table__identity')) continue;
    // The selection checkbox names itself; it is a control, not a value with a label.
    if (cell.matches('.ui-table__selection')) continue;
    assert.ok(cell.getAttribute('data-label'), `a labelled line prints no label: ${cell.outerHTML.slice(0, 60)}`);
  }
  // The empty state is one card with the message in it, and no label invented for it.
  assert.equal(document.querySelector('#empty').getAttribute('data-label'), null,
    'the empty state prints a column label over a message that belongs to no column');
});

test('the ladder: a card at 560 and below, the capped column to 720, the table above', () => {
  for (const width of [600, 1280]) {
    const { style } = mountAt(width);
    assert.equal(style('#wrapped thead').display, 'table-header-group', `the header row is gone at ${width}`);
    assert.equal(style('#card').display, 'table-row', `a row is a card at ${width}`);
    assert.equal(style('#card .ui-table__identity').display, 'table-cell', `the identity is a heading at ${width}`);
    assert.equal(style('#card .ui-table__identity').position, 'sticky', `the identity column is not pinned at ${width}`);
  }
  // Between the two steps the identity is the capped single line of #500, untouched by
  // anything written here.
  const mid = mountAt(600);
  assert.equal(mid.style('#card .ui-table__identity').whiteSpace, 'nowrap', 'the capped column wraps again at 600');
  assert.equal(mid.style('#card .ui-identity__name').textOverflow, 'ellipsis', 'the capped name is cut without saying so at 600');
  // Above the fold neither composition applies.
  const wide = mountAt(1280);
  assert.equal(wide.style('#card .ui-table__identity').maxWidth.trim(), 'none', 'the desktop took a cap');
  assert.equal(wide.style('#card .ui-identity__name').whiteSpace, 'normal', 'the desktop name stopped wrapping');
});

/** Every file under stories/ and react/src/ that mounts a stacked table. */
function stackedExamples() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!/\.(js|mjs|tsx)$/.test(entry)) continue;
      const text = readFileSync(full, 'utf8');
      if (text.includes('ui-table--stacked') || /\bstacked\b/.test(text) && text.includes('DataTable')) {
        out.push({ file: path.relative(root, full), text });
      }
    }
  };
  walk(path.join(root, 'stories'));
  walk(path.join(root, 'react/src'));
  return out;
}

test("the kit's own stacked examples carry the markup the stylesheet cannot supply", () => {
  const examples = stackedExamples();
  assert.ok(examples.length >= 2, `only ${examples.length} stacked examples found; the sweep lost its subjects`);

  // The vanilla half writes the roles and the labels by hand, because there is no
  // table factory to write them for it. React's DataTable writes both from its columns.
  const vanilla = examples.filter((e) => e.file.endsWith('.js') && e.text.includes('ui-table--stacked'));
  assert.ok(vanilla.length >= 1, 'no vanilla story mounts a stacked table, so nothing demonstrates the markup');
  for (const { file, text } of vanilla) {
    for (const role of ['role="table"', 'role="rowgroup"', 'role="row"', 'role="columnheader"', 'role="cell"', 'role="rowheader"']) {
      assert.ok(text.includes(role), `${file} stacks a table without ${role}; a block row has no table semantics left`);
    }
    assert.ok(/data-label="/.test(text), `${file} stacks a table whose cells print no label`);
  }

  const react = examples.find((e) => e.file === 'react/src/DataTable.tsx');
  assert.ok(react, 'react/src/DataTable.tsx no longer mentions the stacked mode');
  for (const written of ["role(heading ? 'rowheader' : 'cell')", "role('rowgroup')", "role('row')", "role('columnheader')", "role('table')", 'data-label={']) {
    assert.ok(react.text.includes(written), `DataTable no longer writes ${written}, so React stacks a table that says nothing about itself`);
  }
});
