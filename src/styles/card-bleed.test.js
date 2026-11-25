/* Rule: a card and the parts that bleed through its side inset stay inside the page.
 *
 * A light card hangs its side inset outside the column, so its text starts on the page
 * title's edge. A row table, its frame and a viewer bleed through the card's side inset to
 * reach the card's edges. In 0.190.0 the hang stayed 24px where the folded shell pads the
 * page by 16px, and the table kept a 24px bleed in a 16px card, so the page scrolled 8px
 * sideways from 561 to 720px and at 560px and below (#875).
 *
 * This gate builds the cascade of the shell, the card and the table sheets at each width
 * and theme in JSDOM. It reads four things in each case:
 * - the card's hang is not more than the page's side padding,
 * - the light card's hang equals its side inset, so its text stays on the column edge,
 * - each bleeding part's hang equals the card's side inset,
 * - a dark card, and a light card above 720px, keep the 24px side inset they had.
 *
 * Limits: JSDOM has no layout, so the gate reads computed margins and paddings, not boxes.
 * A media query is unwrapped by its max-width alone, and a query with any other condition
 * is left out. The page padding above 720px is a clamp, so the gate reads its floor. The
 * card is placed in the shell's main area only. The boxes and the scroll width are
 * measured in Chromium and recorded on the pull request.
 *
 * why: docs/components.md#card
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const SHEETS = { tokens: read('../tokens/tokens.css'), layout: read('./layout.css'), card: read('./card.css'), table: read('./table.css') };
const WIDTHS = [390, 560, 561, 640, 720, 721, 1280];
const SPACE_6 = Number(/--space-6:\s*(\d+)px/.exec(SHEETS.tokens)[1]);

/** The sheet as a window of `width` px applies it: each max-width query that matches is
 *  unwrapped, and every other at-rule block is left out. */
export function atWidth(css, width) {
  let out = '';
  for (let i = 0; i < css.length;) {
    const at = css.indexOf('@', i);
    if (at === -1) { out += css.slice(i); break; }
    out += css.slice(i, at);
    const open = css.indexOf('{', at);
    const semi = css.indexOf(';', at);
    if (semi !== -1 && semi < open) { out += css.slice(at, semi + 1); i = semi + 1; continue; }
    let depth = 0, end = open;
    for (; end < css.length; end += 1) {
      if (css[end] === '{') depth += 1;
      else if (css[end] === '}' && --depth === 0) break;
    }
    const query = /^@media\s*\(max-width:\s*(\d+)px\)\s*$/.exec(css.slice(at, open).trim());
    if (query && width <= Number(query[1])) out += atWidth(css.slice(open + 1, end), width);
    i = end + 1;
  }
  return out;
}

const px = (value) => {
  const floor = /^clamp\(\s*(-?[\d.]+)px/.exec(value);
  if (floor) return Number(floor[1]);
  const plain = /^(-?[\d.]+)px$/.exec(value);
  return plain ? Number(plain[1]) : NaN;
};

const PAGE = `<div class="ui-app"><main class="ui-app__main">
  <section class="ui-card" id="rows"><table class="ui-table ui-table--hover"><thead><tr><th>Campaign</th><th>Clicks</th></tr></thead><tbody><tr><td>Demo</td><td>12</td></tr></tbody></table></section>
  <section class="ui-card" id="frame"><div class="ui-table-scroll"><table class="ui-table ui-table--hover"><thead><tr><th>Campaign</th></tr></thead><tbody><tr><td>Demo</td></tr></tbody></table></div></section>
  <section class="ui-card" id="viewer"><div class="ui-card__viewer"><div class="ui-toolbar"></div></div></section>
</main></div>`;

/** Every finding for the sheets in both themes at each width, and the count of cases read. */
export function checkBleed(sheets = SHEETS, widths = WIDTHS) {
  const problems = [];
  let measured = 0;
  for (const theme of ['light', 'dark']) for (const width of widths) {
    const css = Object.values(sheets).map((sheet) => atWidth(sheet, width)).join('\n');
    const dom = new JSDOM(`<!doctype html><html data-theme="${theme}"><head><style>${css}</style></head><body>${PAGE}</body></html>`);
    try {
      const { document, getComputedStyle } = dom.window;
      const style = (selector) => getComputedStyle(document.querySelector(selector));
      const page = px(style('.ui-app__main').paddingLeft);
      for (const [id, part] of [['rows', ':scope > .ui-table'], ['frame', ':scope > .ui-table-scroll'], ['viewer', ':scope > .ui-card__viewer']]) {
        const at = `${theme} ${width}px #${id}`;
        const card = document.getElementById(id);
        const inset = px(getComputedStyle(card).paddingLeft);
        const hang = -px(getComputedStyle(card).marginLeft);
        const bleed = -px(getComputedStyle(card.querySelector(part)).marginLeft);
        if (![page, inset, hang, bleed].every(Number.isFinite)) { problems.push(`${at}: a value does not resolve to px`); continue; }
        if (hang > page) problems.push(`${at}: the card hangs ${hang}px past a ${page}px page padding`);
        if (theme === 'light' && hang !== inset) problems.push(`${at}: the card hangs ${hang}px with a ${inset}px side inset`);
        if (bleed !== inset) problems.push(`${at}: the part bleeds ${bleed}px through a ${inset}px side inset`);
        if ((theme === 'dark' || width > 720) && inset !== SPACE_6) problems.push(`${at}: the side inset moved to ${inset}px`);
        measured += 1;
      }
    } finally { dom.window.close(); }
  }
  return { problems, measured };
}

test('a card and its bleeding parts stay inside the page in both themes at every width', () => {
  const { problems, measured } = checkBleed();
  assert.deepEqual(problems, []);
  assert.equal(measured, 2 * WIDTHS.length * 3, 'every theme, width and part must be measured');
});

test('the bleed check rejects the hangs and bleeds of 0.190.0', () => {
  const swap = (sheet, from, to) => {
    const next = SHEETS[sheet].replaceAll(from, to);
    assert.notEqual(next, SHEETS[sheet], `the mutation edits ${sheet}.css: ${from}`);
    return { ...SHEETS, [sheet]: next };
  };
  const cases = [
    // The light inset shrinks only at 560px, so the card hangs past the folded page.
    ['the light hang', swap('card', '@media (max-width: 720px)', '@media (max-width: 560px)'), 'past a 16px page padding', 561],
    // The table bleeds by a fixed 24px, past a light card's 16px inset.
    ['the row table bleed', swap('table', 'margin-inline: calc(-1 * var(--ui-card-inset));', 'margin-inline: calc(-1 * var(--space-6));'), '#rows: the part bleeds 24px', 390],
    ['the viewer bleed', swap('card', 'calc(-1 * var(--ui-card-inset)) 0;', 'calc(-1 * var(--space-6)) 0;'), '#viewer: the part bleeds 24px', 390],
    // A dark card that follows the light inset changes a theme the fix must keep.
    ['the dark inset', swap('card', ':root[data-theme="light"] .ui-card:not(.ui-card--pad-lg):not(.ui-card--accent):not(.ui-card--live) {\n    --ui-card-inset', '.ui-card {\n    --ui-card-inset'), 'dark 390px #rows', 390],
  ];
  for (const [name, sheets, says, width] of cases) {
    const { problems } = checkBleed(sheets, [width]);
    assert.ok(problems.some((p) => p.includes(says)), `${name} must be rejected, found: ${problems.join('; ') || 'nothing'}`);
  }
});
