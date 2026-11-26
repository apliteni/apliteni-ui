/* Rule: a card and the parts in it keep one geometry in both themes, so nothing moves or
 * changes size when the theme changes (#900). The light theme keeps the dark theme's
 * spacing; only the paint differs — a light card draws no fill, edge or shadow.
 *
 * Before #900 the light card hung its side inset outside the column and sat its table flush
 * on the column edges, so every box moved when the theme changed. The light card now keeps
 * the dark card's 24px inset and no hang, and a row table, its frame and a viewer bleed by
 * that inset in both themes alike.
 *
 * This gate builds the cascade of the shell, card, table and stat sheets at each width
 * and theme in JSDOM, with the shared reader of stories/lib/css-at-width.js, and lets JSDOM
 * resolve each custom property per element. It checks:
 * - a card's side inset is 24px in both themes at every width,
 * - a card never hangs past the column, in either theme,
 * - a row table and its frame bleed by the card's side inset in both themes,
 * - a viewer bleeds by the card's side inset in both themes,
 * - a stat tile keeps its box and does not hang. It has a 24px side inset, and 16px in
 *   light at 560px and below, as on main.
 *
 * Limits: JSDOM has no layout, so the gate adds computed margins, borders and paddings,
 * and measures no box. The pointer queries are left out. The card is placed in the shell's
 * main area only. The boxes and the scroll width are measured in Chromium and recorded on
 * the pull request.
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
const SPACE_4 = Number(/--space-4:\s*(\d+)px/.exec(TOKENS)[1]);

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
      for (const id of ['rows', 'frame', 'dense', 'viewer']) {
        const card = document.getElementById(id);
        const part = card.firstElementChild;
        const c = side(getComputedStyle, card, 'Left');
        const bleed = -side(getComputedStyle, part, 'Left').margin;
        const hang = -c.margin;
        if (![hang, c.padding, bleed].every(Number.isFinite)) { problems.push(at(`#${id}: a value does not resolve to px`)); continue; }
        // The one geometry in both themes, so nothing moves when the theme changes (#900).
        if (c.padding !== SPACE_6) problems.push(at(`#${id}: the side inset moved to ${c.padding}px`));
        if (hang !== 0) problems.push(at(`#${id}: the card hangs ${hang}px past the column`));
        if (['rows', 'frame'].includes(id) && bleed !== c.padding) problems.push(at(`#${id}: the part bleeds ${bleed}px through a ${c.padding}px side inset`));
        if (id === 'viewer' && bleed !== c.padding) problems.push(at(`#viewer: the viewer bleeds ${bleed}px through a ${c.padding}px side inset`));
        measured += 1;
      }
      // A light tile pads 16px at 560px and below, as on main, and 24px above.
      const tile = side(getComputedStyle, document.getElementById('tile'), 'Left');
      const tileInset = theme === 'light' && width <= 560 ? SPACE_4 : SPACE_6;
      if (tile.padding !== tileInset || tile.margin !== 0) problems.push(at(`#tile: the tile pads ${tile.padding}px and hangs ${-tile.margin}px`));
      measured += 1;
    } finally { dom.window.close(); }
  }
  return { problems, measured };
}

test('a card and its parts keep one geometry in both themes, so a theme change moves nothing', () => {
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
  const cases = [
    // A light card that hangs again steals the column and moves its box off the dark theme's.
    ['the light hang', swap('card', 'box-shadow: none;\n}', 'box-shadow: none;\n  margin-inline: calc(-1 * var(--ui-card-inset));\n}'), 'light 390px #rows: the card hangs', 390],
    // A light card whose side inset shrinks moves the text off the dark theme's edge.
    ['the light inset', swap('card', 'box-shadow: none;\n}', 'box-shadow: none;\n  padding-inline: var(--space-4);\n}'), 'light 390px #rows: the side inset moved to 16px', 390],
    // A table that stops bleeding leaves the card's side band empty in both themes.
    ['the table bleed', swap('table', 'margin-inline: calc(-1 * var(--ui-card-inset));', 'margin-inline: 0;'), '#rows: the part bleeds 0px', 390],
    // A viewer that stops bleeding does the same.
    ['the viewer bleed', swap('card', 'margin: var(--space-4) calc(-1 * var(--ui-card-inset)) 0;', 'margin: var(--space-4) 0 0;'), '#viewer: the viewer bleeds 0px', 390],
    // A light tile that narrows above 560px moves its text off the tile's 24px box.
    ['the tile inset', swap('stat', '--ui-card-inset: var(--ui-tile-inset, var(--space-6));', '--ui-card-inset: var(--ui-tile-inset, var(--space-4));'), '#tile: the tile pads 16px', 640],
    // A phone tile that keeps 24px changes the look that main has at 560px and below.
    ['the phone tile inset', swap('card', '{ --ui-tile-inset: var(--space-4); }', '{ }'), '#tile: the tile pads 24px', 390],
  ];
  for (const [name, sheets, says, width] of cases) {
    const { problems } = checkBleed(sheets, [width]);
    assert.ok(problems.some((p) => p.includes(says)), `${name} must be rejected, found: ${problems.join('; ') || 'nothing'}`);
  }
});
