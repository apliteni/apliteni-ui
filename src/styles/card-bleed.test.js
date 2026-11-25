/* Rule: a card and the parts in it stay inside the page, and on the light page their text
 * starts on the page title's edge.
 *
 * A light card hangs its side inset outside the column, so its text starts on the page
 * title's edge. A table in it sits on the column, and a frame hangs out by its side band
 * only. In a dark card, a row table, its frame and a viewer bleed through the card's side
 * inset to reach the card's edges. In 0.190.0 the hang stayed 24px where the folded shell
 * pads the page by 16px, and a light row table kept the dark bleed, so the page scrolled
 * 8px sideways and the table text left the title's edge (#875).
 *
 * This gate builds the cascade of the shell, card, table and stat sheets at each width
 * and theme in JSDOM, with the shared reader of stories/lib/css-at-width.js, and lets JSDOM
 * resolve each custom property per element. It checks:
 * - the card's hang is not more than the page's side padding,
 * - in light, the text of a card, a row table, a row table frame and a dense row table
 *   frame starts and ends within 1px of the column edges,
 * - in dark, the row table and its frame bleed by the card's side inset,
 * - a viewer bleeds by the card's side inset in both themes,
 * - a stat tile keeps its box: a 24px side inset and no hang, in both themes,
 * - a dark card, and a light card above 720px, keep a 24px side inset.
 *
 * Limits: JSDOM has no layout, so the gate adds computed margins, borders and paddings,
 * and measures no box. The pointer queries are left out. The page padding above 720px is a
 * clamp, so the gate reads its floor. The card is placed in the shell's main area only. The
 * boxes and the scroll width are measured in Chromium and recorded on the pull request.
 *
 * why: docs/components.md#card
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { flatAt } from '../../stories/lib/css-at-width.js';

const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');
const TOKENS = read('../tokens/tokens.css');
const SHEETS = { layout: read('./layout.css'), card: read('./card.css'), table: read('./table.css'), stat: read('./stat.css') };
const WIDTHS = [390, 560, 561, 640, 720, 721, 1280];
const SKIP = ['(pointer: coarse)', 'not (pointer: coarse)'];
const SPACE_6 = Number(/--space-6:\s*(\d+)px/.exec(TOKENS)[1]);

const px = (value) => {
  const floor = /^clamp\(\s*(-?[\d.]+)px/.exec(value);
  if (floor) return Number(floor[1]);
  const plain = /^(-?[\d.]+)px$/.exec(value);
  return plain ? Number(plain[1]) : NaN;
};

const ROWS = '<thead><tr><th>Campaign</th><th>Clicks</th></tr></thead><tbody><tr><td>Demo</td><td>12</td></tr></tbody>';
const PAGE = `<div class="ui-app"><main class="ui-app__main"><h1>Campaigns</h1>
  <section class="ui-card" id="rows"><table class="ui-table ui-table--hover">${ROWS}</table></section>
  <section class="ui-card" id="frame"><div class="ui-table-scroll"><table class="ui-table ui-table--hover">${ROWS}</table></div></section>
  <section class="ui-card" id="dense"><div class="ui-table-scroll"><table class="ui-table ui-table--hover ui-table--dense">${ROWS}</table></div></section>
  <section class="ui-card" id="viewer"><div class="ui-card__viewer"><div class="ui-toolbar"></div></div></section>
  <div class="ui-stats ui-stats--tiles"><div class="ui-stats__list"><div class="ui-stat ui-card" id="tile">12</div></div></div>
</main></div>`;

/** The margin, border and padding of one side of an element, in px. */
function side(getComputedStyle, el, end) {
  const s = getComputedStyle(el);
  return { margin: px(s[`margin${end}`]), border: px(s[`border${end}Width`]), padding: px(s[`padding${end}`]) };
}

/** Every finding for the sheets in both themes at each width, and the count of cases read. */
export function checkBleed(sheets = SHEETS, widths = WIDTHS) {
  const problems = [];
  let measured = 0;
  for (const theme of ['light', 'dark']) for (const width of widths) {
    const css = [TOKENS, ...Object.values(sheets)].map((sheet) => flatAt(sheet, width, SKIP)).join('\n');
    const dom = new JSDOM(`<!doctype html><html data-theme="${theme}"><head><style>${css}</style></head><body>${PAGE}</body></html>`);
    try {
      const { document, getComputedStyle } = dom.window;
      const at = (what) => `${theme} ${width}px ${what}`;
      const page = px(getComputedStyle(document.querySelector('.ui-app__main')).paddingLeft);
      for (const id of ['rows', 'frame', 'dense', 'viewer']) {
        const card = document.getElementById(id);
        const part = card.firstElementChild;
        const c = side(getComputedStyle, card, 'Left');
        const bleed = -side(getComputedStyle, part, 'Left').margin;
        const hang = -c.margin;
        if (![page, hang, c.padding, bleed].every(Number.isFinite)) { problems.push(at(`#${id}: a value does not resolve to px`)); continue; }
        if (hang > page) problems.push(at(`#${id}: the card hangs ${hang}px past a ${page}px page padding`));
        if ((theme === 'dark' || width > 720) && c.padding !== SPACE_6) problems.push(at(`#${id}: the side inset moved to ${c.padding}px`));
        if (theme === 'light' && hang !== c.padding) problems.push(at(`#${id}: the card hangs ${hang}px with a ${c.padding}px side inset`));
        const cell = card.querySelector('td');
        if (theme === 'light' && cell) {
          for (const end of ['Left', 'Right']) {
            const endCell = card.querySelector(end === 'Left' ? 'td:first-child' : 'td:last-child');
            const [k, f, t] = [card, part, endCell].map((el) => side(getComputedStyle, el, end));
            // The card's 1px edge is transparent in light, so the text may stand 1px in.
            const text = k.margin + k.border + k.padding + f.margin + (part === cell.closest('table') ? 0 : f.border) + t.padding;
            if (!Number.isFinite(text) || Math.abs(text) > 1) problems.push(at(`#${id}: the table text stands ${text}px off the column's ${end.toLowerCase()} edge`));
          }
        }
        if (theme === 'dark' && ['rows', 'frame'].includes(id) && bleed !== c.padding) problems.push(at(`#${id}: the part bleeds ${bleed}px through a ${c.padding}px side inset`));
        if (id === 'viewer' && bleed !== c.padding) problems.push(at(`#viewer: the viewer bleeds ${bleed}px through a ${c.padding}px side inset`));
        measured += 1;
      }
      const tile = side(getComputedStyle, document.getElementById('tile'), 'Left');
      if (tile.padding !== SPACE_6 || tile.margin !== 0) problems.push(at(`#tile: the tile pads ${tile.padding}px and hangs ${-tile.margin}px`));
      measured += 1;
    } finally { dom.window.close(); }
  }
  return { problems, measured };
}

test('a card and its parts stay inside the page, with light text on the column edge', () => {
  const { problems, measured } = checkBleed();
  assert.deepEqual(problems, []);
  assert.equal(measured, 2 * WIDTHS.length * 5, 'every theme, width and part must be measured');
});

test('the bleed check rejects the hangs, bleeds and insets of 0.190.0', () => {
  const swap = (sheet, from, to) => {
    const next = SHEETS[sheet].replaceAll(from, to);
    assert.notEqual(next, SHEETS[sheet], `the mutation edits ${sheet}.css: ${from}`);
    return { ...SHEETS, [sheet]: next };
  };
  const LIGHT = ':root[data-theme="light"] .ui-card:not(.ui-card--pad-lg):not(.ui-card--accent):not(.ui-card--live)';
  const cases = [
    // The light inset shrinks only at 560px, so the card hangs past the folded page.
    ['the light hang', swap('card', '@media (max-width: 720px)', '@media (max-width: 560px)'), 'past a 16px page padding', 561],
    // Without the light table rule the dark bleed wins, and the text leaves the column.
    ['the light row table', swap('table', `${LIGHT} > .ui-table {`, `${LIGHT} > .ui-none {`), '#rows: the table text stands -15px', 390],
    ['the light row table above 720px', swap('table', `${LIGHT} > .ui-table {`, `${LIGHT} > .ui-none {`), '#rows: the table text stands -23px', 1280],
    ['the light frame band', swap('table', `${LIGHT} > .ui-table-scroll {`, `${LIGHT} > .ui-none {`), '#dense: the table text stands', 1280],
    ['the viewer bleed', swap('card', 'calc(-1 * var(--ui-card-inset)) 0;', 'calc(-1 * var(--space-6)) 0;'), '#viewer: the viewer bleeds 24px', 390],
    // A dark card that follows the light inset changes a theme the fix must keep.
    ['the dark inset', swap('card', `${LIGHT} {\n    --ui-card-inset`, '.ui-card {\n    --ui-card-inset'), 'dark 390px #rows', 390],
    // A light tile that takes the light card's inset loses 8px from 561 to 720px.
    ['the tile inset', swap('stat', '--ui-card-inset: var(--space-6);', ''), '#tile: the tile pads 16px', 640],
  ];
  for (const [name, sheets, says, width] of cases) {
    const { problems } = checkBleed(sheets, [width]);
    assert.ok(problems.some((p) => p.includes(says)), `${name} must be rejected, found: ${problems.join('; ') || 'nothing'}`);
  }
});
